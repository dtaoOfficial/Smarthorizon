import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../db';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/jwt';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  email: z.string().min(1, { message: 'Username or Email is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

const refreshSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }),
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { email: inputStr, password } = parseResult.data;
    const inputClean = inputStr.trim().toLowerCase();

    // Resolve aliases (simjudge -> simjudge@smarthorizon.com, simstudent -> simstudent@smarthorizon.com)
    let searchEmail = inputClean;
    if (inputClean === 'simjudge') searchEmail = 'simjudge@smarthorizon.com';
    if (inputClean === 'simstudent' || inputClean === 'simstudent') searchEmail = 'simstudent@smarthorizon.com';
    if (inputClean === 'admin') searchEmail = 'admin@smarthorizon.com';

    // Find user by email or name
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: searchEmail },
          { email: inputClean },
          { name: inputStr },
        ],
      },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const payload = {
      userId: user.id,
      role: user.roleId,
      email: user.email,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Track user action in AuditLog (ignoring errors to ensure login succeeds)
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_LOGIN',
          details: `User ${user.email} successfully logged in.`,
        },
      });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.roleId,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const parseResult = refreshSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { refreshToken } = parseResult.data;
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    // Optional: Check if user still exists in the database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(403).json({ error: 'User no longer exists' });
    }

    const newPayload = {
      userId: user.id,
      role: user.roleId,
      email: user.email,
    };

    const accessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Fetch current user details
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.roleId,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, { message: 'New password must be at least 6 characters long' }),
});

// Change Password Endpoint
router.post('/change-password', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { currentPassword, newPassword } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentPassword && !user.mustChangePassword) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    if (newPassword === 'student123') {
      return res.status(400).json({ error: 'New password cannot be the default temporary password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_CHANGED',
          details: `User ${user.email} successfully updated their password.`,
        },
      });
    } catch (e) {}

    // Sync credentials file in background if student password changed
    if (user.roleId === 'STUDENT') {
      import('../utils/credentialsSync').then(({ syncParticipantCredentialsFile }) => {
        syncParticipantCredentialsFile().catch(console.error);
      });
    }

    return res.json({
      message: 'Password changed successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.roleId,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.userId,
          action: 'USER_LOGOUT',
          details: `User ${req.user.email} logged out.`,
        },
      });
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

export default router;
