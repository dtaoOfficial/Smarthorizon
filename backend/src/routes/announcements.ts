import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { z } from 'zod';
import { sendLiveNotification } from './notifications';

const router = Router();

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  category: z.enum(['GENERAL', 'SCHEDULE', 'TECHNICAL', 'FOOD', 'VENUE', 'EMERGENCY']).default('GENERAL'),
  priority: z.enum(['INFO', 'IMPORTANT', 'CRITICAL']).default('INFO'),
  targetAudience: z.enum(['EVERYONE', 'ALL', 'STUDENTS', 'JUDGES', 'ADMINS', 'TRACK', 'TEAMS'])
    .transform(val => val === 'ALL' ? 'EVERYONE' : val)
    .default('EVERYONE'),
  trackId: z.string().optional().nullable(),
  targetTrackId: z.string().optional().nullable(),
  targetTeamIds: z.array(z.string()).optional().default([]),
  pinned: z.boolean().optional().default(false),
  status: z.enum(['DRAFT', 'PUBLISHED', 'UNSENT']).optional().default('PUBLISHED'),
  publishAt: z.string().optional().nullable(),
  expireAt: z.string().optional().nullable(),
});

// Helper to broadcast notifications
async function broadcastAnnouncementNotifications(announcement: any, data: any) {
  let targetUsers: string[] = [];

  const effectiveTrackId = data.trackId || data.targetTrackId || null;
  const effectiveAudience = data.targetAudience;

  if (effectiveAudience === 'EVERYONE') {
    const users = await prisma.user.findMany({ select: { id: true } });
    targetUsers = users.map(u => u.id);
  } else if (effectiveAudience === 'STUDENTS') {
    const users = await prisma.user.findMany({ where: { roleId: 'STUDENT' }, select: { id: true } });
    targetUsers = users.map(u => u.id);
  } else if (effectiveAudience === 'JUDGES') {
    const users = await prisma.user.findMany({ where: { roleId: 'JUDGE' }, select: { id: true } });
    targetUsers = users.map(u => u.id);
  } else if (effectiveAudience === 'TEAMS' && data.targetTeamIds && data.targetTeamIds.length > 0) {
    const users = await prisma.user.findMany({
      where: {
        roleId: 'STUDENT',
        teamMembers: {
          some: {
            OR: [
              { teamId: { in: data.targetTeamIds } },
              { team: { registrationId: { in: data.targetTeamIds } } },
              { team: { teamCode: { in: data.targetTeamIds } } }
            ]
          }
        }
      },
      select: { id: true }
    });
    targetUsers = users.map(u => u.id);
  } else if (effectiveAudience === 'TRACK' && effectiveTrackId) {
    const users = await prisma.user.findMany({
      where: {
        roleId: 'STUDENT',
        teamMembers: {
          some: { team: { trackId: effectiveTrackId } }
        }
      },
      select: { id: true }
    });
    targetUsers = users.map(u => u.id);
  }

  if (targetUsers.length > 0) {
    await prisma.notification.createMany({
      data: targetUsers.map(uid => ({
        userId: uid,
        title: `Announcement: ${data.title}`,
        content: data.content.substring(0, 100),
        type: 'ANNOUNCEMENT',
      }))
    });

    targetUsers.forEach(uid => {
      sendLiveNotification(uid, {
        title: `Announcement: ${data.title}`,
        content: data.content.substring(0, 100),
        type: 'ANNOUNCEMENT',
        createdAt: new Date(),
      });
    });
  }
}

// 1. GET /api/announcements - Fetch bulletins list with audience filtering & receipt analytics
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    if (!userRole || !userId) return res.status(401).json({ error: 'Unauthorized' });

    let studentTrackId: string | null = null;
    let studentTeamId: string | null = null;
    let studentRegId: string | null = null;
    let judgeTrackIds: string[] = [];

    if (userRole === 'STUDENT') {
      const member = await prisma.teamMember.findUnique({
        where: { userId },
        include: { team: { select: { id: true, trackId: true, registrationId: true } } }
      });
      if (member?.team) {
        studentTrackId = member.team.trackId;
        studentTeamId = member.team.id;
        studentRegId = member.team.registrationId;
      }
    } else if (userRole === 'JUDGE') {
      const judge = await prisma.user.findUnique({
        where: { id: userId },
        include: { assignedTracks: { select: { id: true } } }
      });
      if (judge) judgeTrackIds = judge.assignedTracks.map(t => t.id);
    }

    const now = new Date();
    const whereClause: any = {};

    // Scope check based on roles
    if (userRole === 'STUDENT') {
      whereClause.status = 'PUBLISHED';
      whereClause.publishAt = { lte: now };
      whereClause.OR = [
        { targetAudience: 'EVERYONE' },
        { targetAudience: 'STUDENTS' },
        ...(studentTrackId ? [{ targetAudience: 'TRACK', trackId: studentTrackId }] : []),
        { targetAudience: 'TEAMS' },
      ];
      // Exclude expired ones
      whereClause.AND = [
        {
          OR: [
            { expireAt: null },
            { expireAt: { gt: now } }
          ]
        }
      ];
    } else if (userRole === 'JUDGE') {
      whereClause.status = 'PUBLISHED';
      whereClause.publishAt = { lte: now };
      whereClause.OR = [
        { targetAudience: 'EVERYONE' },
        { targetAudience: 'JUDGES' },
        ...(judgeTrackIds.length > 0 ? [{ targetAudience: 'TRACK', trackId: { in: judgeTrackIds } }] : [])
      ];
      whereClause.AND = [
        {
          OR: [
            { expireAt: null },
            { expireAt: { gt: now } }
          ]
        }
      ];
    } else {
      // Admin sees everything
    }

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      include: {
        track: { select: { name: true } },
        author: { select: { name: true } },
        receipts: {
          where: userRole !== 'ADMINISTRATOR' ? { userId } : undefined
        }
      },
      orderBy: [
        { pinned: 'desc' },
        { publishAt: 'desc' }
      ]
    });

    // Compile analytics for administrators
    let studentCount = 0;
    let judgeCount = 0;
    let adminCount = 0;

    if (userRole === 'ADMINISTRATOR') {
      studentCount = await prisma.user.count({ where: { roleId: 'STUDENT' } });
      judgeCount = await prisma.user.count({ where: { roleId: 'JUDGE' } });
      adminCount = await prisma.user.count({ where: { roleId: 'ADMINISTRATOR' } });
    }

    const compiled = await Promise.all(announcements.map(async (a) => {
      let readStatus = 'UNREAD';
      if (a.receipts && a.receipts.length > 0) {
        readStatus = a.receipts[0].status; // READ or ACKNOWLEDGED
      }

      // Calculations for Admin Analytics
      let totalRecipients = 0;
      let readCount = 0;
      let acknowledgedCount = 0;

      if (userRole === 'ADMINISTRATOR') {
        // Calculate total possible recipients
        if (a.targetAudience === 'EVERYONE') {
          totalRecipients = studentCount + judgeCount + adminCount;
        } else if (a.targetAudience === 'STUDENTS') {
          totalRecipients = studentCount;
        } else if (a.targetAudience === 'JUDGES') {
          totalRecipients = judgeCount;
        } else if (a.targetAudience === 'ADMINS') {
          totalRecipients = adminCount;
        } else if (a.targetAudience === 'TEAMS') {
          totalRecipients = studentCount;
        } else if (a.targetAudience === 'TRACK' && a.trackId) {
          totalRecipients = await prisma.user.count({
            where: {
              roleId: 'STUDENT',
              teamMembers: {
                some: {
                  team: { trackId: a.trackId }
                }
              }
            }
          });
        }

        // Fetch receipt tallies
        const allReceipts = await prisma.announcementReceipt.findMany({
          where: { announcementId: a.id }
        });

        readCount = allReceipts.filter(r => r.status === 'READ' || r.status === 'ACKNOWLEDGED').length;
        acknowledgedCount = allReceipts.filter(r => r.status === 'ACKNOWLEDGED').length;
      }

      const readPercentage = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;
      const ackPercentage = totalRecipients > 0 ? Math.round((acknowledgedCount / totalRecipients) * 100) : 0;

      return {
        id: a.id,
        title: a.title,
        content: a.content,
        category: a.category,
        priority: a.priority,
        targetAudience: a.targetAudience,
        trackName: a.track?.name || 'All Tracks',
        trackId: a.trackId,
        pinned: a.pinned,
        status: a.status,
        publishAt: a.publishAt,
        expireAt: a.expireAt,
        authorName: a.author.name,
        readStatus,
        analytics: userRole === 'ADMINISTRATOR' ? {
          totalRecipients,
          readCount,
          acknowledgedCount,
          readPercentage,
          ackPercentage,
        } : null
      };
    }));

    return res.json({ announcements: compiled });
  } catch (error) {
    console.error('Fetch announcements error:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// 2. POST /api/announcements - Admin create announcement
router.post('/', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = announcementSchema.safeParse(req.body);
    if (!parseResult.success) {
      console.error('Announcement validation failed:', parseResult.error.flatten().fieldErrors);
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
    if (!activeHackathon) return res.status(400).json({ error: 'No active hackathon exists.' });

    const data = parseResult.data;
    const authorId = req.user?.userId;
    if (!authorId) return res.status(401).json({ error: 'Unauthorized' });

    const effectiveTrackId = data.trackId || data.targetTrackId || null;
    const effectiveAudience = data.targetAudience;

    const announcement = await prisma.announcement.create({
      data: {
        hackathonId: activeHackathon.id,
        authorId,
        title: data.title,
        content: data.content,
        category: data.category,
        priority: data.priority,
        targetAudience: effectiveAudience,
        trackId: effectiveTrackId,
        pinned: data.pinned,
        status: data.status,
        publishAt: data.publishAt ? new Date(data.publishAt) : new Date(),
        expireAt: data.expireAt ? new Date(data.expireAt) : null,
      }
    });

    // Dispatch Notifications immediately if published
    if (data.status === 'PUBLISHED') {
      await broadcastAnnouncementNotifications(announcement, data);
    }

    await prisma.auditLog.create({
      data: {
        userId: authorId,
        action: 'ANNOUNCEMENT_CREATE',
        details: `Published announcement: "${data.title}" targeting ${effectiveAudience}.`,
      }
    });

    return res.status(201).json({ success: true, announcement });
  } catch (error) {
    console.error('Create announcement error:', error);
    return res.status(500).json({ error: 'Failed to publish announcement' });
  }
});

// 3. PUT /api/announcements/:id - Admin update announcement
router.put('/:id', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = announcementSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const data = parseResult.data;
    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    const effectiveTrackId = data.trackId || data.targetTrackId || null;
    const effectiveAudience = data.targetAudience;

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        category: data.category,
        priority: data.priority,
        targetAudience: effectiveAudience,
        trackId: effectiveTrackId,
        pinned: data.pinned,
        status: data.status,
        publishAt: data.publishAt ? new Date(data.publishAt) : new Date(),
        expireAt: data.expireAt ? new Date(data.expireAt) : null,
      }
    });

    return res.json({ success: true, announcement: updated });
  } catch (error) {
    console.error('Update announcement error:', error);
    return res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// 4. POST /api/announcements/:id/unsend - Unsend / Retract announcement
router.post('/:id/unsend', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    const updated = await prisma.announcement.update({
      where: { id },
      data: { status: 'DRAFT' }
    });

    // Clean up dispatched notification feed records
    await prisma.notification.deleteMany({
      where: { title: `Announcement: ${existing.title}` }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'ANNOUNCEMENT_UNSEND',
        details: `Unsent announcement: "${existing.title}".`,
      }
    });

    return res.json({ success: true, message: 'Announcement unsent and retracted successfully.', announcement: updated });
  } catch (error) {
    console.error('Unsend announcement error:', error);
    return res.status(500).json({ error: 'Failed to unsend announcement' });
  }
});

// 5. POST /api/announcements/:id/send - Send / Publish announcement
router.post('/:id/send', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    const updated = await prisma.announcement.update({
      where: { id },
      data: { status: 'PUBLISHED', publishAt: new Date() }
    });

    await broadcastAnnouncementNotifications(updated, {
      title: updated.title,
      content: updated.content,
      targetAudience: updated.targetAudience,
      trackId: updated.trackId,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'ANNOUNCEMENT_SEND',
        details: `Sent announcement: "${existing.title}".`,
      }
    });

    return res.json({ success: true, message: 'Announcement sent successfully.', announcement: updated });
  } catch (error) {
    console.error('Send announcement error:', error);
    return res.status(500).json({ error: 'Failed to send announcement' });
  }
});

// 6. DELETE /api/announcements/:id - Admin delete announcement
router.delete('/:id', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    // Clean up notifications & receipts
    await prisma.notification.deleteMany({
      where: { title: `Announcement: ${existing.title}` }
    });
    await prisma.announcementReceipt.deleteMany({
      where: { announcementId: id }
    });
    await prisma.announcement.delete({ where: { id } });

    return res.json({ success: true, message: 'Announcement deleted successfully.' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    return res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// 5. POST /api/announcements/:id/receipt - Save user read/acknowledgement receipt
router.post('/:id/receipt', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { status } = req.body; // READ or ACKNOWLEDGED

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!status || !['READ', 'ACKNOWLEDGED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status receipt' });
    }

    const receipt = await prisma.announcementReceipt.upsert({
      where: {
        announcementId_userId: { announcementId: id, userId }
      },
      update: { status },
      create: {
        announcementId: id,
        userId,
        status,
      }
    });

    return res.json({ success: true, receipt });
  } catch (error) {
    console.error('Save announcement receipt error:', error);
    return res.status(500).json({ error: 'Failed to update read receipt' });
  }
});

export default router;
