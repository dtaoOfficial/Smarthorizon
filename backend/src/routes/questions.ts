import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { z } from 'zod';
import { sendLiveNotification } from './notifications';

const router = Router();

const questionSchema = z.object({
  category: z.string().min(1, 'Category is required'), // TECHNICAL or ORGANIZATIONAL
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  venueLocation: z.string().trim().min(2, 'Venue / seating location is compulsory (e.g. Lab 3, Hall B, Table 12).'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

const replySchema = z.object({
  content: z.string().min(1, 'Reply content is required'),
});

// 1. GET /api/questions - Fetch help desk tickets list with filters & SLA indicator calculations
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    if (!userRole || !userId) return res.status(401).json({ error: 'Unauthorized' });
    if (userRole === 'JUDGE') return res.status(403).json({ error: 'Judges do not manage support tickets' });

    let studentTeamId: string | null = null;

    // Student scope restriction
    if (userRole === 'STUDENT') {
      const member = await prisma.teamMember.findUnique({
        where: { userId },
        select: { teamId: true }
      });
      if (member) studentTeamId = member.teamId;
    }

    const { search, trackId, status, priority, category, sortByAge } = req.query;

    const whereClause: any = {};

    // Scope check: students only see their own team tickets
    if (userRole === 'STUDENT') {
      if (studentTeamId) {
        whereClause.user = {
          teamMembers: {
            some: { teamId: studentTeamId }
          }
        };
      } else {
        return res.json({ questions: [], overdueCount: 0 });
      }
    } else {
      // Admins filters
      if (category) whereClause.category = category;
      if (status) whereClause.status = status;
      if (priority) whereClause.priority = priority;

      if (trackId) {
        whereClause.user = {
          teamMembers: {
            some: {
              team: { trackId }
            }
          }
        };
      }

      if (search) {
        whereClause.OR = [
          { title: { contains: String(search) } },
          { content: { contains: String(search) } },
          { venueLocation: { contains: String(search) } }
        ];
      }
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            teamMembers: {
              include: {
                team: {
                  select: { name: true, track: { select: { name: true } } }
                }
              }
            }
          }
        },
        assignedTo: { select: { id: true, name: true, roleId: true } },
        replies: {
          include: {
            user: { select: { name: true, roleId: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: sortByAge === 'asc' ? { createdAt: 'asc' } : { createdAt: 'desc' }
    });

    // Compile results & anonymize details for student view
    let overdueCount = 0;

    const compiled = questions.map((q) => {
      // SLA Indicators: Calculate waiting time in minutes
      const ageMs = Date.now() - new Date(q.createdAt).getTime();
      const ageMins = Math.floor(ageMs / 60000);

      // A ticket is "Overdue" if status is Open/Assigned/In Progress and age > 15 minutes with no reply
      const isUnanswered = q.replies.length === 0;
      const isOverdue = isUnanswered && ageMins > 15 && ['Open', 'Assigned', 'In Progress'].includes(q.status);
      if (isOverdue) overdueCount += 1;

      // Map replies with student security policies
      const mappedReplies = q.replies.map(rep => {
        let authorName = rep.user.name;
        if (userRole === 'STUDENT' && rep.user.roleId !== 'STUDENT') {
          authorName = 'Organizer';
        }
        return {
          id: rep.id,
          content: rep.content,
          createdAt: rep.createdAt,
          authorName,
          roleId: rep.user.roleId,
        };
      });

      // Assigned representative metadata for student
      let assigneeLabel = 'Unassigned';
      if (q.assignedTo) {
        assigneeLabel = userRole === 'STUDENT'
          ? 'Assigned Organizer'
          : q.assignedTo.name;
      }

      // Team Details
      const teamInfo = q.user.teamMembers[0]?.team;

      return {
        id: q.id,
        category: q.category,
        title: q.title,
        content: q.content,
        venueLocation: q.venueLocation || 'Main Venue Desk',
        priority: q.priority,
        status: q.status,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        ageMins,
        isOverdue,
        authorName: userRole === 'STUDENT' ? q.user.name : `${q.user.name} (${teamInfo?.name || 'No Team'})`,
        teamName: teamInfo?.name || 'Unassigned',
        trackName: teamInfo?.track?.name || 'Unassigned',
        assigneeLabel,
        assigneeId: q.assignedToId,
        internalNotes: userRole === 'STUDENT' ? null : q.internalNotes, // Hidden from students
        replies: mappedReplies,
      };
    });

    return res.json({
      questions: compiled,
      overdueCount,
    });
  } catch (error) {
    console.error('Fetch questions error:', error);
    return res.status(500).json({ error: 'Failed to fetch questions queue' });
  }
});

// 2. POST /api/questions - Submit a help ticket
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parseResult = questionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
    if (!activeHackathon) return res.status(400).json({ error: 'No active hackathon exists.' });

    const { category, title, content, venueLocation, priority } = parseResult.data;

    // Find student's team
    const member = await prisma.teamMember.findUnique({
      where: { userId },
      include: {
        team: {
          select: { trackId: true, name: true }
        }
      }
    });

    const question = await prisma.question.create({
      data: {
        hackathonId: activeHackathon.id,
        userId,
        category,
        title,
        content,
        venueLocation,
        priority,
        status: 'Open',
        assignedToId: null,
      }
    });

    // Dispatch Notifications to Administrators
    const admins = await prisma.user.findMany({ where: { roleId: 'ADMINISTRATOR' } });
    for (const admin of admins) {
      const notif = await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'New Support Request',
          content: `New ${category.toLowerCase()} question by "${member?.team?.name || 'Student'}" at Location "${venueLocation}": "${title}".`,
          type: 'QUESTION_REPLY',
        }
      });
      sendLiveNotification(admin.id, notif);
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'QUESTION_CREATE',
        details: `Submitted support question "${title}" at venue location "${venueLocation}". Category: ${category}.`,
      }
    });

    return res.status(201).json({ success: true, question, routingAlert: 'Help ticket submitted successfully to Organizers queue.' });
  } catch (error) {
    console.error('Submit question error:', error);
    return res.status(500).json({ error: 'Failed to submit support question' });
  }
});

// 3. POST /api/questions/:id/replies - Reply to ticket conversation thread
router.post('/:id/replies', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) return res.status(401).json({ error: 'Unauthorized' });

    const parseResult = replySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Reply validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const question = await prisma.question.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!question) return res.status(404).json({ error: 'Support ticket not found' });

    // Server-side authorization check for student role (IDOR Protection)
    if (userRole === 'STUDENT') {
      const studentMember = await prisma.teamMember.findUnique({
        where: { userId },
        select: { teamId: true }
      });
      const questionAuthorMember = await prisma.teamMember.findUnique({
        where: { userId: question.userId },
        select: { teamId: true }
      });

      const isSameTeam = studentMember && questionAuthorMember && studentMember.teamId === questionAuthorMember.teamId;
      const isAuthor = question.userId === userId;

      if (!isAuthor && !isSameTeam) {
        return res.status(403).json({ error: 'Access denied: You can only reply to support tickets created by your own team.' });
      }
    }

    const reply = await prisma.questionReply.create({
      data: {
        questionId: id,
        userId,
        content: parseResult.data.content,
      }
    });

    // Auto-advancing ticket state based on conversation flow:
    // If Judge/Admin replies -> status becomes "Waiting for Student"
    // If Student replies -> status becomes "In Progress"
    let nextStatus = question.status;
    if (userRole === 'STUDENT') {
      nextStatus = 'In Progress';
    } else {
      nextStatus = 'Waiting for Student';
    }

    await prisma.question.update({
      where: { id },
      data: { status: nextStatus }
    });

    // Dispatch Notification
    if (userRole === 'STUDENT') {
      // Notify assignee if set
      if (question.assignedToId) {
        const notif = await prisma.notification.create({
          data: {
            userId: question.assignedToId,
            title: 'Student Replied to Ticket',
            content: `Team leader posted a response in: "${question.title}".`,
            type: 'QUESTION_REPLY',
          }
        });
        sendLiveNotification(question.assignedToId, notif);
      }
    } else {
      // Notify Student author
      const notif = await prisma.notification.create({
        data: {
          userId: question.userId,
          title: 'Help Desk Response Received',
          content: `An organizer has replied to your request: "${question.title}".`,
          type: 'QUESTION_REPLY',
        }
      });
      sendLiveNotification(question.userId, notif);
    }

    return res.status(201).json({ success: true, reply });
  } catch (error) {
    console.error('Submit reply error:', error);
    return res.status(500).json({ error: 'Failed to post reply' });
  }
});

// 4. PUT /api/questions/:id/assign - Assign ticket (Admin only)
router.put('/:id/assign', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.question.update({
      where: { id },
      data: {
        assignedToId: assignedToId || null,
        status: assignedToId ? 'Assigned' : 'Open',
      }
    });

    if (assignedToId) {
      const notif = await prisma.notification.create({
        data: {
          userId: assignedToId,
          title: 'Support Ticket Assigned',
          content: `You have been assigned to coordinate ticket "${question.title}".`,
          type: 'QUESTION_REPLY',
        }
      });
      sendLiveNotification(assignedToId, notif);
    }

    return res.json({ success: true, question: updated });
  } catch (error) {
    console.error('Assign ticket error:', error);
    return res.status(500).json({ error: 'Failed to assign ticket' });
  }
});

// 5. PUT /api/questions/:id/status - Update ticket status (e.g. In Progress, Resolved)
router.put('/:id/status', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.question.update({
      where: { id },
      data: { status }
    });

    // Notify Student when ticket is Resolved or Closed
    if (['Resolved', 'Closed'].includes(status)) {
      const notif = await prisma.notification.create({
        data: {
          userId: question.userId,
          title: `Support Ticket ${status}`,
          content: `Your help desk request "${question.title}" has been marked as ${status.toLowerCase()}.`,
          type: 'QUESTION_REPLY',
        }
      });
      sendLiveNotification(question.userId, notif);
    }

    return res.json({ success: true, question: updated });
  } catch (error) {
    console.error('Update ticket status error:', error);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// 6. PUT /api/questions/:id/priority - Edit ticket priority (Admin only)
router.put('/:id/priority', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.question.update({
      where: { id },
      data: { priority }
    });

    return res.json({ success: true, question: updated });
  } catch (error) {
    console.error('Edit priority error:', error);
    return res.status(500).json({ error: 'Failed to update priority' });
  }
});

// 7. PUT /api/questions/:id/notes - Save internal notes (Admin only)
router.put('/:id/notes', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { internalNotes } = req.body;

    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await prisma.question.update({
      where: { id },
      data: { internalNotes: internalNotes || null }
    });

    return res.json({ success: true, question: updated });
  } catch (error) {
    console.error('Save internal notes error:', error);
    return res.status(500).json({ error: 'Failed to save internal notes' });
  }
});

export default router;
