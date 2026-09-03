import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const eventFeedbackSchema = z.object({
  q1Organization: z.number().int().min(1).max(5),
  q2ProblemRelevance: z.number().int().min(1).max(5),
  q3RegistrationSupport: z.number().int().min(1).max(5),
  q4FacilitiesTech: z.number().int().min(1).max(5),
  q5MentoringGuidance: z.number().int().min(1).max(5),
  q6FairnessTransparency: z.number().int().min(1).max(5),
  q7FoodHospitality: z.number().int().min(1).max(5),
  q8VolunteerSupport: z.number().int().min(1).max(5),
  q9LearningNetworking: z.number().int().min(1).max(5),
  q10OverallSatisfaction: z.number().int().min(1).max(5),
  comments: z.string().min(5, { message: 'Written feedback remarks are compulsory (minimum 5 characters required).' }),
});

// 0. GET /api/feedback/status - Get current feedback enabled state
router.get('/status', async (req, res) => {
  try {
    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true }
    });
    return res.json({ feedbackEnabled: activeHackathon?.feedbackEnabled ?? false });
  } catch (error) {
    return res.json({ feedbackEnabled: false });
  }
});

// 0.1 POST /api/feedback/toggle - Admin toggle feedback tab/modal visibility
router.post('/toggle', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { enabled } = req.body;
    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true }
    });

    if (!activeHackathon) {
      return res.status(400).json({ error: 'No active hackathon found' });
    }

    const updatedState = typeof enabled === 'boolean' ? enabled : !activeHackathon.feedbackEnabled;

    await prisma.hackathon.update({
      where: { id: activeHackathon.id },
      data: { feedbackEnabled: updatedState }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        actorRole: 'ADMINISTRATOR',
        action: 'FEEDBACK_TOGGLE',
        details: `Administrator ${updatedState ? 'enabled' : 'disabled'} the Feedback Form for participants & judges.`,
      }
    });

    return res.json({ success: true, feedbackEnabled: updatedState });
  } catch (error) {
    console.error('Toggle feedback error:', error);
    return res.status(500).json({ error: 'Failed to toggle feedback settings' });
  }
});

// 1. POST /api/feedback/submit - Submit or update 10-parameter event feedback (for Students & Judges)
router.post('/submit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    if (!userId || !userRole) return res.status(401).json({ error: 'Unauthorized' });

    if (!['STUDENT', 'JUDGE'].includes(userRole)) {
      return res.status(403).json({ error: 'Feedback submission is reserved for students and judges only. Administrators can view the Feedback Results Database.' });
    }

    const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
    if (!activeHackathon?.feedbackEnabled) {
      return res.status(403).json({ error: 'Feedback submission has not been enabled by the administrator yet.' });
    }

    const parseResult = eventFeedbackSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed. Please answer all 10 rating parameters between 1 and 5.',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const d = parseResult.data;

    // Calculate average rating
    const sum =
      d.q1Organization +
      d.q2ProblemRelevance +
      d.q3RegistrationSupport +
      d.q4FacilitiesTech +
      d.q5MentoringGuidance +
      d.q6FairnessTransparency +
      d.q7FoodHospitality +
      d.q8VolunteerSupport +
      d.q9LearningNetworking +
      d.q10OverallSatisfaction;

    const avgRating = Number((sum / 10).toFixed(2));

    // Find student's team if student
    let teamId: string | null = null;
    if (userRole === 'STUDENT') {
      const teamMember = await prisma.teamMember.findFirst({
        where: { userId },
        select: { teamId: true },
      });
      if (teamMember) {
        teamId = teamMember.teamId;
      }
    }

    const feedback = await prisma.eventFeedback.upsert({
      where: { userId },
      update: {
        userRole,
        teamId,
        q1Organization: d.q1Organization,
        q2ProblemRelevance: d.q2ProblemRelevance,
        q3RegistrationSupport: d.q3RegistrationSupport,
        q4FacilitiesTech: d.q4FacilitiesTech,
        q5MentoringGuidance: d.q5MentoringGuidance,
        q6FairnessTransparency: d.q6FairnessTransparency,
        q7FoodHospitality: d.q7FoodHospitality,
        q8VolunteerSupport: d.q8VolunteerSupport,
        q9LearningNetworking: d.q9LearningNetworking,
        q10OverallSatisfaction: d.q10OverallSatisfaction,
        avgRating,
        comments: d.comments || null,
      },
      create: {
        userId,
        userRole,
        teamId,
        q1Organization: d.q1Organization,
        q2ProblemRelevance: d.q2ProblemRelevance,
        q3RegistrationSupport: d.q3RegistrationSupport,
        q4FacilitiesTech: d.q4FacilitiesTech,
        q5MentoringGuidance: d.q5MentoringGuidance,
        q6FairnessTransparency: d.q6FairnessTransparency,
        q7FoodHospitality: d.q7FoodHospitality,
        q8VolunteerSupport: d.q8VolunteerSupport,
        q9LearningNetworking: d.q9LearningNetworking,
        q10OverallSatisfaction: d.q10OverallSatisfaction,
        avgRating,
        comments: d.comments || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        actorRole: userRole,
        action: 'EVENT_FEEDBACK_SUBMITTED',
        details: `Submitted 10-parameter hackathon feedback with average score ${avgRating}/5.0.`,
        resource: 'EventFeedback',
        resourceId: feedback.id,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your feedback has been recorded successfully.',
      feedback,
    });
  } catch (error) {
    console.error('Submit event feedback error:', error);
    return res.status(500).json({ error: 'Failed to submit event feedback.' });
  }
});

// 2. GET /api/feedback/my-feedback - Get current user's submitted feedback
router.get('/my-feedback', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const feedback = await prisma.eventFeedback.findUnique({
      where: { userId },
      include: {
        team: { select: { name: true, track: { select: { name: true } } } },
      },
    });

    return res.json({ feedback });
  } catch (error) {
    console.error('Fetch my-feedback error:', error);
    return res.status(500).json({ error: 'Failed to fetch your feedback' });
  }
});

// 3. GET /api/feedback/admin/summary - Admin view all feedback results & parameter breakdown
router.get('/admin/summary', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const feedbacks = await prisma.eventFeedback.findMany({
      include: {
        user: { select: { name: true, email: true, roleId: true } },
        team: { select: { name: true, registrationId: true, track: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalResponses = feedbacks.length;
    const studentResponses = feedbacks.filter((f) => f.userRole === 'STUDENT');
    const judgeResponses = feedbacks.filter((f) => f.userRole === 'JUDGE');

    const computeAverages = (list: typeof feedbacks) => {
      if (list.length === 0) {
        return {
          q1: 0,
          q2: 0,
          q3: 0,
          q4: 0,
          q5: 0,
          q6: 0,
          q7: 0,
          q8: 0,
          q9: 0,
          q10: 0,
          overall: 0,
        };
      }
      const count = list.length;
      return {
        q1: Number((list.reduce((sum, f) => sum + f.q1Organization, 0) / count).toFixed(2)),
        q2: Number((list.reduce((sum, f) => sum + f.q2ProblemRelevance, 0) / count).toFixed(2)),
        q3: Number((list.reduce((sum, f) => sum + f.q3RegistrationSupport, 0) / count).toFixed(2)),
        q4: Number((list.reduce((sum, f) => sum + f.q4FacilitiesTech, 0) / count).toFixed(2)),
        q5: Number((list.reduce((sum, f) => sum + f.q5MentoringGuidance, 0) / count).toFixed(2)),
        q6: Number((list.reduce((sum, f) => sum + f.q6FairnessTransparency, 0) / count).toFixed(2)),
        q7: Number((list.reduce((sum, f) => sum + f.q7FoodHospitality, 0) / count).toFixed(2)),
        q8: Number((list.reduce((sum, f) => sum + f.q8VolunteerSupport, 0) / count).toFixed(2)),
        q9: Number((list.reduce((sum, f) => sum + f.q9LearningNetworking, 0) / count).toFixed(2)),
        q10: Number((list.reduce((sum, f) => sum + f.q10OverallSatisfaction, 0) / count).toFixed(2)),
        overall: Number((list.reduce((sum, f) => sum + f.avgRating, 0) / count).toFixed(2)),
      };
    };

    const overallAverages = computeAverages(feedbacks);
    const studentAverages = computeAverages(studentResponses);
    const judgeAverages = computeAverages(judgeResponses);

    const paramLabels = [
      { key: 'q1', field: 'q1Organization', label: '1. Overall Organization & Management' },
      { key: 'q2', field: 'q2ProblemRelevance', label: '2. Problem Statement / Theme Quality' },
      { key: 'q3', field: 'q3RegistrationSupport', label: '3. Registration & Pre-Event Support' },
      { key: 'q4', field: 'q4FacilitiesTech', label: '4. Venue Facilities, Power & WiFi' },
      { key: 'q5', field: 'q5MentoringGuidance', label: '5. Mentoring & Guidance' },
      { key: 'q6', field: 'q6FairnessTransparency', label: '6. Evaluation Fairness & Transparency' },
      { key: 'q7', field: 'q7FoodHospitality', label: '7. Food, Hospitality & Refreshments' },
      { key: 'q8', field: 'q8VolunteerSupport', label: '8. Volunteer & Committee Responsiveness' },
      { key: 'q9', field: 'q9LearningNetworking', label: '9. Learning & Networking Opportunities' },
      { key: 'q10', field: 'q10OverallSatisfaction', label: '10. Overall Hackathon Satisfaction' },
    ];

    const parameterBreakdown = paramLabels.map((p) => ({
      key: p.key,
      label: p.label,
      overallAvg: overallAverages[p.key as keyof typeof overallAverages],
      studentAvg: studentAverages[p.key as keyof typeof studentAverages],
      judgeAvg: judgeAverages[p.key as keyof typeof judgeAverages],
    }));

    return res.json({
      summary: {
        totalResponses,
        studentResponsesCount: studentResponses.length,
        judgeResponsesCount: judgeResponses.length,
        overallAvgRating: overallAverages.overall,
        studentAvgRating: studentAverages.overall,
        judgeAvgRating: judgeAverages.overall,
      },
      parameterBreakdown,
      feedbacks: feedbacks.map((f) => ({
        id: f.id,
        userName: f.user.name,
        userEmail: f.user.email,
        userRole: f.userRole,
        teamName: f.team?.name || 'N/A',
        trackName: f.team?.track?.name || 'N/A',
        q1: f.q1Organization,
        q2: f.q2ProblemRelevance,
        q3: f.q3RegistrationSupport,
        q4: f.q4FacilitiesTech,
        q5: f.q5MentoringGuidance,
        q6: f.q6FairnessTransparency,
        q7: f.q7FoodHospitality,
        q8: f.q8VolunteerSupport,
        q9: f.q9LearningNetworking,
        q10: f.q10OverallSatisfaction,
        avgRating: f.avgRating,
        comments: f.comments,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    console.error('Fetch admin feedback summary error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin feedback summary' });
  }
});

// 4. GET /api/feedback - Backward compatible endpoint for Admin
router.get('/', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const feedbacks = await prisma.eventFeedback.findMany({
      include: {
        user: { select: { name: true, email: true } },
        team: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ feedbacks });
  } catch (error) {
    console.error('Fetch feedback error:', error);
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

export default router;
