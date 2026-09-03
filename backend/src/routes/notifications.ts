import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Track connected SSE clients
export const clients: { userId: string; res: Response }[] = [];

// Broadcast a live notification to connected client(s)
export function sendLiveNotification(userId: string, notification: any) {
  const userClients = clients.filter(c => c.userId === userId);
  userClients.forEach(c => {
    try {
      c.res.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch (err) {
      console.error('Failed to write SSE notify:', err);
    }
  });
}

// Helper to create DB notification & send live feed
export async function createAndSendNotification(data: {
  userId: string;
  title: string;
  content: string;
  type: string;
  deepLink?: string | null;
}) {
  const created = await prisma.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      content: data.content,
      type: data.type,
      deepLink: data.deepLink || null,
    }
  });
  sendLiveNotification(data.userId, created);
  return created;
}

// 1. GET /api/notifications/feed - Live SSE Connection
router.get('/feed', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client = { userId, res };
  clients.push(client);

  // Send connection ack
  res.write('data: {"type":"CONNECTED"}\n\n');

  // Keep-alive heartbeat interval to prevent timeouts
  const heartbeat = setInterval(() => {
    res.write(':\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const idx = clients.findIndex(c => c.res === res);
    if (idx !== -1) {
      clients.splice(idx, 1);
    }
  });
});

// 2. GET /api/notifications - Fetch notification history logs
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ notifications });
  } catch (error) {
    console.error('Failed to get notifications:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// 3. POST /api/notifications/:id/read - Mark specific as read
router.post('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.userId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return res.json({ success: true, notification: updated });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// 4. POST /api/notifications/read-all - Mark all read
router.post('/read-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.notification.updateMany({
      where: { userId: req.user.userId, read: false },
      data: { read: true },
    });

    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

export default router;
