import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const KEY_OUTCOME_VALUES = ['NEW_SKILLS', 'TEAMWORK', 'PROTOTYPE', 'NETWORKING'] as const;
const YES_MAYBE_NO = ['YES', 'MAYBE', 'NO'] as const;
const QUOTE_PERMISSION_VALUES = ['NAMED', 'ANONYMOUS', 'NO'] as const;

const participantFeedbackSchema = z.object({
  q1RegistrationComms: z.number().int().min(1).max(5),
  q2BriefingClarity: z.number().int().min(1).max(5),
  q3ProblemStatementClarity: z.number().int().min(1).max(5),
  q4MentoringQuality: z.number().int().min(1).max(5),
  q5OrganiserSupport: z.number().int().min(1).max(5),
  q6WorkspaceTechFacilities: z.number().int().min(1).max(5),
  q7FoodHospitality: z.number().int().min(1).max(5),
  q8JuryFeedbackQuality: z.number().int().min(1).max(5),
  q9LearningGained: z.number().int().min(1).max(5),
  q10NetworkingExposure: z.number().int().min(1).max(5),
  q11OverallValue: z.number().int().min(1).max(5),
  mostValuableAspect: z.string().optional().nullable(),
  suggestionsForImprovement: z.string().optional().nullable(),
  keyOutcomes: z.array(z.enum(KEY_OUTCOME_VALUES)).default([]),
  wouldParticipateAgain: z.enum(YES_MAYBE_NO),
  wouldRecommend: z.enum(YES_MAYBE_NO),
  quotePermission: z.enum(QUOTE_PERMISSION_VALUES),
});

const RATING_FIELDS = [
  'q1RegistrationComms',
  'q2BriefingClarity',
  'q3ProblemStatementClarity',
  'q4MentoringQuality',
  'q5OrganiserSupport',
  'q6WorkspaceTechFacilities',
  'q7FoodHospitality',
  'q8JuryFeedbackQuality',
  'q9LearningGained',
  'q10NetworkingExposure',
  'q11OverallValue',
] as const;

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
        details: `Administrator ${updatedState ? 'enabled' : 'disabled'} the Feedback Form for participants.`,
      }
    });

    return res.json({ success: true, feedbackEnabled: updatedState });
  } catch (error) {
    console.error('Toggle feedback error:', error);
    return res.status(500).json({ error: 'Failed to toggle feedback settings' });
  }
});

// 1. POST /api/feedback/submit - Submit or update participant feedback (Students only)
router.post('/submit', authenticateToken, requireRole(['STUDENT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
    if (!activeHackathon?.feedbackEnabled) {
      return res.status(403).json({ error: 'Feedback submission has not been enabled by the administrator yet.' });
    }

    const parseResult = participantFeedbackSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed. Please answer all 11 rating parameters between 1 and 5.',
        details: parseResult.error.flatten().fieldErrors,
      });
    }
    const d = parseResult.data;

    // Team + role are auto-filled from the account, never taken from the request body
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId },
      select: { teamId: true, role: true },
    });
    if (!teamMember) {
      return res.status(400).json({ error: 'No team membership found for this account.' });
    }
    const participantRole = teamMember.role === 'LEADER' ? 'TEAM_LEAD' : 'MEMBER';

    const sum = RATING_FIELDS.reduce((acc, key) => acc + d[key], 0);
    const avgRating = Number((sum / RATING_FIELDS.length).toFixed(2));

    const data = {
      userRole: 'STUDENT',
      teamId: teamMember.teamId,
      participantRole,
      q1RegistrationComms: d.q1RegistrationComms,
      q2BriefingClarity: d.q2BriefingClarity,
      q3ProblemStatementClarity: d.q3ProblemStatementClarity,
      q4MentoringQuality: d.q4MentoringQuality,
      q5OrganiserSupport: d.q5OrganiserSupport,
      q6WorkspaceTechFacilities: d.q6WorkspaceTechFacilities,
      q7FoodHospitality: d.q7FoodHospitality,
      q8JuryFeedbackQuality: d.q8JuryFeedbackQuality,
      q9LearningGained: d.q9LearningGained,
      q10NetworkingExposure: d.q10NetworkingExposure,
      q11OverallValue: d.q11OverallValue,
      avgRating,
      mostValuableAspect: d.mostValuableAspect?.trim() || null,
      suggestionsForImprovement: d.suggestionsForImprovement?.trim() || null,
      keyOutcomes: d.keyOutcomes.join(','),
      wouldParticipateAgain: d.wouldParticipateAgain,
      wouldRecommend: d.wouldRecommend,
      quotePermission: d.quotePermission,
    };

    const feedback = await prisma.eventFeedback.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        actorRole: 'STUDENT',
        action: 'EVENT_FEEDBACK_SUBMITTED',
        details: `Submitted participant feedback with average score ${avgRating}/5.0.`,
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

// 2. GET /api/feedback/my-feedback - Get current user's submitted feedback, plus
// the auto-filled account context (team/institution/theme/role) the form needs
router.get('/my-feedback', authenticateToken, requireRole(['STUDENT']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const feedback = await prisma.eventFeedback.findUnique({
      where: { userId },
      include: {
        team: { select: { name: true, registrationId: true, collegeName: true, college: true, selectedPsId: true, track: { select: { name: true } } } },
      },
    });

    const teamMember = await prisma.teamMember.findFirst({
      where: { userId },
      select: {
        role: true,
        user: { select: { name: true } },
        team: { select: { name: true, registrationId: true, collegeName: true, college: true, selectedPsId: true } },
      },
    });

    return res.json({
      feedback,
      accountContext: teamMember ? {
        name: teamMember.user?.name,
        teamName: teamMember.team.name,
        teamRegistrationId: teamMember.team.registrationId,
        institution: teamMember.team.collegeName || teamMember.team.college || 'N/A',
        theme: teamMember.team.selectedPsId || 'N/A',
        participantRole: teamMember.role === 'LEADER' ? 'TEAM_LEAD' : 'MEMBER',
      } : null,
    });
  } catch (error) {
    console.error('Fetch my-feedback error:', error);
    return res.status(500).json({ error: 'Failed to fetch your feedback' });
  }
});

// 3. GET /api/feedback/admin/summary - Admin view of all participant feedback & parameter breakdown
router.get('/admin/summary', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const feedbacks = await prisma.eventFeedback.findMany({
      include: {
        user: { select: { name: true, email: true, roleId: true } },
        team: { select: { name: true, registrationId: true, collegeName: true, college: true, selectedPsId: true, track: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalResponses = feedbacks.length;

    const computeAverages = (list: typeof feedbacks) => {
      if (list.length === 0) {
        return Object.fromEntries([...RATING_FIELDS.map((f) => [f, 0]), ['overall', 0]]);
      }
      const count = list.length;
      const result: Record<string, number> = {};
      for (const field of RATING_FIELDS) {
        result[field] = Number((list.reduce((sum, f) => sum + (f as any)[field], 0) / count).toFixed(2));
      }
      result.overall = Number((list.reduce((sum, f) => sum + f.avgRating, 0) / count).toFixed(2));
      return result;
    };

    const overallAverages = computeAverages(feedbacks);

    const paramLabels = [
      { field: 'q1RegistrationComms', label: '1. Registration process and pre-event communication' },
      { field: 'q2BriefingClarity', label: '2. Clarity of briefing, rules, schedule and expected outcomes' },
      { field: 'q3ProblemStatementClarity', label: '3. Relevance and clarity of the problem statement selected' },
      { field: 'q4MentoringQuality', label: '4. Quality and usefulness of mentoring during the Hackathon' },
      { field: 'q5OrganiserSupport', label: '5. Responsiveness and support from organisers and volunteers' },
      { field: 'q6WorkspaceTechFacilities', label: '6. Workspace, power supply, internet and technical facilities' },
      { field: 'q7FoodHospitality', label: '7. Food, refreshments, accommodation and hospitality' },
      { field: 'q8JuryFeedbackQuality', label: '8. Clarity and usefulness of the feedback provided by the jury' },
      { field: 'q9LearningGained', label: '9. Learning gained in technical skills, problem-solving and teamwork' },
      { field: 'q10NetworkingExposure', label: '10. Networking, industry exposure and interaction with other teams' },
      { field: 'q11OverallValue', label: '11. Overall quality and value of Smart Horizon 2026' },
    ];

    const parameterBreakdown = paramLabels.map((p) => ({
      field: p.field,
      label: p.label,
      average: overallAverages[p.field],
    }));

    return res.json({
      summary: {
        totalResponses,
        overallAvgRating: overallAverages.overall,
      },
      parameterBreakdown,
      feedbacks: feedbacks.map((f) => ({
        id: f.id,
        userName: f.user.name,
        userEmail: f.user.email,
        participantRole: f.participantRole,
        teamName: f.team?.name || 'N/A',
        teamRegistrationId: f.team?.registrationId || 'N/A',
        institution: f.team?.collegeName || f.team?.college || 'N/A',
        theme: f.team?.selectedPsId || 'N/A',
        trackName: f.team?.track?.name || 'N/A',
        ratings: Object.fromEntries(RATING_FIELDS.map((field) => [field, (f as any)[field]])),
        avgRating: f.avgRating,
        mostValuableAspect: f.mostValuableAspect,
        suggestionsForImprovement: f.suggestionsForImprovement,
        keyOutcomes: f.keyOutcomes ? f.keyOutcomes.split(',').filter(Boolean) : [],
        wouldParticipateAgain: f.wouldParticipateAgain,
        wouldRecommend: f.wouldRecommend,
        quotePermission: f.quotePermission,
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
