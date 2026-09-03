import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { z } from 'zod';
import { generateTeamCode } from '../utils/qr';

const router = Router();

const phoneRegex = /^[+]*[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  trackId: z.string().min(1, 'Track is required'),
  registrationId: z.string().optional(),
  college: z.string().optional(),
  collegeName: z.string().optional(),
  domain: z.string().optional(),
  selectedPsId: z.string().optional(),
  mentorName1: z.string().optional(),
  emergencyContact: z.string().optional(),
  status: z.string().default('Registered'),

  leadName: z.string().optional(),
  leadEmail: z.string().email('Invalid lead email').or(z.literal('')).optional(),
  leadMobile: z.string().regex(phoneRegex, 'Invalid mobile number format').or(z.literal('')).optional(),
  leadUsn: z.string().optional(),

  member2Name: z.string().optional(),
  member2Email: z.string().email('Invalid member 2 email').or(z.literal('')).optional(),
  member2Mobile: z.string().regex(phoneRegex, 'Invalid mobile number format').or(z.literal('')).optional(),
  member2Usn: z.string().optional(),

  member3Name: z.string().optional(),
  member3Email: z.string().email('Invalid member 3 email').or(z.literal('')).optional(),
  member3Mobile: z.string().regex(phoneRegex, 'Invalid mobile number format').or(z.literal('')).optional(),
  member3Usn: z.string().optional(),

  member4Name: z.string().optional(),
  member4Email: z.string().email('Invalid member 4 email').or(z.literal('')).optional(),
  member4Mobile: z.string().regex(phoneRegex, 'Invalid mobile number format').or(z.literal('')).optional(),
  member4Usn: z.string().optional(),

  member5Name: z.string().optional(),
  member5Email: z.string().email('Invalid member 5 email').or(z.literal('')).optional(),
  member5Mobile: z.string().regex(phoneRegex, 'Invalid mobile number format').or(z.literal('')).optional(),
  member5Usn: z.string().optional(),

  paymentStatusFinal: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).default('PENDING').optional(),
});

const projectUpdateSchema = z.object({
  projectTitle: z.string().optional(),
  problemStatement: z.string().optional(),
  projectDesc: z.string().optional(),
  projectUrl: z.string().optional(),
  demoUrl: z.string().optional(),
  presentationUrl: z.string().optional(),
  techStack: z.string().optional(),
});

const adminUpdateSchema = z.object({
  name: z.string().optional(),
  trackId: z.string().optional(),
  registrationId: z.string().optional(),
  college: z.string().optional(),
  collegeName: z.string().optional(),
  domain: z.string().optional(),
  selectedPsId: z.string().optional(),
  mentorName1: z.string().optional(),
  emergencyContact: z.string().optional(),
  status: z.string().optional(),
  locked: z.boolean().optional(),
  projectTitle: z.string().optional(),
  problemStatement: z.string().optional(),
  projectDesc: z.string().optional(),
  projectUrl: z.string().optional(),
  demoUrl: z.string().optional(),
  presentationUrl: z.string().optional(),
  techStack: z.string().optional(),

  leadName: z.string().optional(),
  leadEmail: z.string().email('Invalid lead email').or(z.literal('')).optional(),
  leadMobile: z.string().optional(),
  leadUsn: z.string().optional(),

  member2Name: z.string().optional(),
  member2Email: z.string().optional(),
  member2Mobile: z.string().optional(),
  member2Usn: z.string().optional(),

  member3Name: z.string().optional(),
  member3Email: z.string().optional(),
  member3Mobile: z.string().optional(),
  member3Usn: z.string().optional(),

  member4Name: z.string().optional(),
  member4Email: z.string().optional(),
  member4Mobile: z.string().optional(),
  member4Usn: z.string().optional(),

  member5Name: z.string().optional(),
  member5Email: z.string().optional(),
  member5Mobile: z.string().optional(),
  member5Usn: z.string().optional(),

  paymentStatusFinal: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
});

// Helper: Compile team details for payload
async function compileTeamDetails(team: any, userRole: string, userId?: string) {
  // Fetch team questions
  const questions = await prisma.question.findMany({
    where: {
      hackathonId: team.hackathonId,
      user: {
        teamMembers: {
          some: { teamId: team.id }
        }
      }
    },
    include: {
      user: { select: { name: true } },
      assignedTo: { select: { name: true } },
      replies: {
        include: {
          user: { select: { name: true, roleId: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Process Reviews based on RBAC
  const reviewsProcessed = team.reviews.map((review: any) => {
    let totalScore = 0;
    let totalMaxMarks = 0;
    
    review.scores.forEach((s: any) => {
      totalScore += s.score;
      totalMaxMarks += s.criterion.maxMarks;
    });

    let progressLabel = 'Waiting for Evaluation';
    if (review.status === 'SUBMITTED' && totalMaxMarks > 0) {
      const percent = (totalScore / totalMaxMarks) * 100;
      if (percent >= 85) progressLabel = 'Excellent Progress';
      else if (percent >= 65) progressLabel = 'Good Progress';
      else if (percent >= 45) progressLabel = 'Needs Improvement';
      else progressLabel = 'At Risk';
    }

    if (userRole === 'STUDENT') {
      return {
        id: review.id,
        roundName: review.round.name,
        status: review.status,
        updatedAt: review.updatedAt,
        comments: review.comments,
        judgeName: 'Anonymous Judge',
        progressLabel,
      };
    } else {
      return {
        id: review.id,
        roundName: review.round.name,
        status: review.status,
        updatedAt: review.updatedAt,
        comments: review.comments,
        judgeName: review.judge.name,
        judgeId: review.judge.id,
        totalScore,
        totalMaxMarks,
        progressLabel,
        scores: review.scores.map((s: any) => ({
          criterionName: s.criterion.name,
          score: s.score,
          maxMarks: s.criterion.maxMarks,
        })),
      };
    }
  });

  // Anonymize Judge Assignments if user is Student
  const judgesProcessed = team.judgeAssignments.map((assign: any, index: number) => {
    if (userRole === 'STUDENT') {
      return {
        id: assign.id,
        judgeName: `Judge ${index + 1}`,
        email: 'hidden@smarthorizon.com',
      };
    } else {
      return {
        id: assign.id,
        judgeName: assign.judge.name,
        email: assign.judge.email,
        judgeId: assign.judge.id,
      };
    }
  });

  // Compile timeline events
  const timeline: any[] = [];
  timeline.push({
    id: 'timeline-register',
    title: 'Team Registered',
    description: `Team "${team.name}" registered in track ${team.track.name}.`,
    timestamp: team.createdAt,
    icon: 'app_registration',
  });

  if (team.checkedIn && team.checkInTime) {
    timeline.push({
      id: 'timeline-checkin',
      title: 'Team Checked In',
      description: 'Team arrived at the venue and checked in successfully.',
      timestamp: team.checkInTime,
      icon: 'how_to_reg',
    });
  }

  questions.forEach((q) => {
    timeline.push({
      id: `timeline-q-${q.id}`,
      title: `Question Asked (${q.category})`,
      description: `"${q.title}" posted by ${q.user.name}. Status: ${q.status}.`,
      timestamp: q.createdAt,
      icon: 'help_outline',
    });

    q.replies.forEach((rep) => {
      timeline.push({
        id: `timeline-rep-${rep.id}`,
        title: `Question Answered`,
        description: `Response posted by ${rep.user.name}: "${rep.content.substring(0, 60)}..."`,
        timestamp: rep.createdAt,
        icon: 'quickreply',
      });
    });
  });

  team.reviews.forEach((r: any) => {
    timeline.push({
      id: `timeline-rev-${r.id}-${r.status}`,
      title: r.status === 'SUBMITTED' ? 'Review Finalized' : 'Review Drafted',
      description: r.status === 'SUBMITTED'
        ? `Review for "${r.round.name}" was submitted.`
        : `Evaluation started for "${r.round.name}".`,
      timestamp: r.updatedAt,
      icon: 'gavel',
    });
  });

  // Calculate per-round averages and final overall score (sum of round averages)
  const allRounds = await prisma.reviewRound.findMany({
    where: { hackathonId: team.hackathonId },
    orderBy: { sequence: 'asc' }
  });

  const submittedReviewsList = team.reviews.filter((r: any) => r.status === 'SUBMITTED');
  const roundAveragesList: { roundId: string; roundName: string; sequence: number; averageScore: number | null; judgeCount: number }[] = [];
  let calculatedFinalScore = 0;

  allRounds.forEach((round: any) => {
    const roundRevs = submittedReviewsList.filter((r: any) => r.roundId === round.id);
    if (roundRevs.length > 0) {
      const sum = roundRevs.reduce((acc: number, r: any) => {
        return acc + r.scores.reduce((sAcc: number, s: any) => sAcc + (s.score || 0), 0);
      }, 0);
      const avg = Number((sum / roundRevs.length).toFixed(1));
      roundAveragesList.push({
        roundId: round.id,
        roundName: round.name,
        sequence: round.sequence,
        averageScore: avg,
        judgeCount: roundRevs.length,
      });
      calculatedFinalScore += avg;
    } else {
      roundAveragesList.push({
        roundId: round.id,
        roundName: round.name,
        sequence: round.sequence,
        averageScore: null,
        judgeCount: 0,
      });
    }
  });

  calculatedFinalScore = Number(calculatedFinalScore.toFixed(1));

  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    team: {
      id: team.id,
      registrationId: team.registrationId || team.id.substring(0, 8).toUpperCase(),
      registration_id: team.registrationId || team.id.substring(0, 8).toUpperCase(),
      name: team.name,
      teamName: team.name,
      team_name: team.name,
      teamCode: team.teamCode,
      qrCode: team.qrCode,
      college: team.college || team.collegeName,
      collegeName: team.collegeName || team.college,
      college_name: team.collegeName || team.college,
      domain: team.domain || team.track.name,
      selectedPsId: team.selectedPsId || team.problemStatement || 'N/A',
      selected_ps_id: team.selectedPsId || team.problemStatement || 'N/A',
      mentorName1: team.mentorName1 || 'Unassigned',
      mentor_name_1: team.mentorName1 || 'Unassigned',
      emergencyContact: team.emergencyContact,
      projectTitle: team.projectTitle,
      problemStatement: team.problemStatement || team.selectedPsId,
      projectDesc: team.projectDesc,
      projectUrl: team.projectUrl,
      demoUrl: team.demoUrl,
      presentationUrl: team.presentationUrl,
      techStack: team.techStack,
      status: team.status,
      locked: team.locked,
      repoVisibility: team.repoVisibility || 'PUBLIC',
      repoLastUpdated: team.repoLastUpdated,
      repoCommitCount: team.repoCommitCount || 0,
      checkedIn: team.checkedIn,
      checkInTime: team.checkInTime,
      trackName: team.track.name,
      trackId: team.trackId,
      hackathonName: team.hackathon.name,

      // Lead Details
      leadName: team.leadName || team.members.find((m: any) => m.role === 'LEADER')?.name || team.members[0]?.name || '',
      lead_name: team.leadName || team.members.find((m: any) => m.role === 'LEADER')?.name || team.members[0]?.name || '',
      leadEmail: team.leadEmail || team.members.find((m: any) => m.role === 'LEADER')?.email || team.members[0]?.email || '',
      lead_email: team.leadEmail || team.members.find((m: any) => m.role === 'LEADER')?.email || team.members[0]?.email || '',
      leadMobile: team.leadMobile || team.members.find((m: any) => m.role === 'LEADER')?.phone || '',
      lead_mobile: team.leadMobile || team.members.find((m: any) => m.role === 'LEADER')?.phone || '',
      leadUsn: team.leadUsn || '',
      lead_usn: team.leadUsn || '',

      // Member 2
      member2Name: team.member2Name || team.members[1]?.name || '',
      member2_name: team.member2Name || team.members[1]?.name || '',
      member2Email: team.member2Email || team.members[1]?.email || '',
      member2_email: team.member2Email || team.members[1]?.email || '',
      member2Mobile: team.member2Mobile || team.members[1]?.phone || '',
      member2_mobile: team.member2Mobile || team.members[1]?.phone || '',
      member2Usn: team.member2Usn || '',
      member2_usn: team.member2Usn || '',

      // Member 3
      member3Name: team.member3Name || team.members[2]?.name || '',
      member3_name: team.member3Name || team.members[2]?.name || '',
      member3Email: team.member3Email || team.members[2]?.email || '',
      member3_email: team.member3Email || team.members[2]?.email || '',
      member3Mobile: team.member3Mobile || team.members[2]?.phone || '',
      member3_mobile: team.member3Mobile || team.members[2]?.phone || '',
      member3Usn: team.member3Usn || '',
      member3_usn: team.member3Usn || '',

      // Member 4
      member4Name: team.member4Name || team.members[3]?.name || '',
      member4_name: team.member4Name || team.members[3]?.name || '',
      member4Email: team.member4Email || team.members[3]?.email || '',
      member4_email: team.member4Email || team.members[3]?.email || '',
      member4Mobile: team.member4Mobile || team.members[3]?.phone || '',
      member4_mobile: team.member4Mobile || team.members[3]?.phone || '',
      member4Usn: team.member4Usn || '',
      member4_usn: team.member4Usn || '',

      // Member 5
      member5Name: team.member5Name || team.members[4]?.name || '',
      member5_name: team.member5Name || team.members[4]?.name || '',
      member5Email: team.member5Email || team.members[4]?.email || '',
      member5_email: team.member5Email || team.members[4]?.email || '',
      member5Mobile: team.member5Mobile || team.members[4]?.phone || '',
      member5_mobile: team.member5Mobile || team.members[4]?.phone || '',
      member5Usn: team.member5Usn || '',
      member5_usn: team.member5Usn || '',

      // Payment Status
      paymentStatusFinal: team.paymentStatusFinal || 'PENDING',
      payment_status_final: team.paymentStatusFinal || 'PENDING',

      members: team.members,
      judges: judgesProcessed,
      reviews: reviewsProcessed,
      roundAverages: roundAveragesList,
      finalScore: calculatedFinalScore,
      questions: questions.map(q => ({
        id: q.id,
        title: q.title,
        category: q.category,
        status: q.status,
        priority: q.priority,
        createdAt: q.createdAt,
        authorName: q.user.name,
        assignedToName: q.assignedTo?.name || 'Unassigned',
      })),
      attendance: team.attendance,
    },
    timeline,
  };
}

// 0. GET /api/teams (Get teams list for assignment and admin dropdowns)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trackId, search } = req.query;
    const where: any = {};
    if (trackId && typeof trackId === 'string' && trackId.trim()) {
      where.trackId = trackId;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { registrationId: { contains: q } },
        { teamCode: { contains: q } },
        { college: { contains: q } },
      ];
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        track: { select: { id: true, name: true } },
        judgeAssignments: {
          include: { judge: { select: { id: true, name: true } } }
        }
      },
      orderBy: { registrationId: 'asc' }
    });

    const compiled = teams.map(t => ({
      id: t.id,
      name: t.name,
      registrationId: t.registrationId || t.teamCode || t.id.substring(0, 8).toUpperCase(),
      trackId: t.trackId,
      trackName: t.track?.name || 'N/A',
      college: t.college || t.collegeName || 'N/A',
      status: t.status,
      checkedIn: t.checkedIn,
      assignedJudgesCount: t.judgeAssignments.length,
      assignedJudges: t.judgeAssignments.map(j => j.judge.name), assignedJudgeIds: t.judgeAssignments.map(j => j.judge.id),
    }));

    return res.json({ success: true, teams: compiled, count: compiled.length });
  } catch (error) {
    console.error('Fetch teams list error:', error);
    return res.status(500).json({ error: 'Failed to fetch teams list' });
  }
});

// 1. GET /api/teams/my-team
router.get('/my-team', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Access denied: Student role required' });
    }

    const userId = req.user.userId;
    const userEmail = req.user.email;

    let teamId: string | null = null;

    const member = await prisma.teamMember.findFirst({
      where: {
        OR: [
          { userId },
          { email: userEmail }
        ]
      },
      select: { teamId: true },
    });

    if (member) {
      teamId = member.teamId;
    } else {
      const teamByLead = await prisma.team.findFirst({
        where: { leadEmail: userEmail },
        select: { id: true },
      });
      if (teamByLead) {
        teamId = teamByLead.id;
      }
    }

    if (!teamId) {
      return res.status(404).json({ error: 'You are not assigned to any team.' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        track: { select: { name: true } },
        hackathon: { select: { name: true } },
        members: true,
        judgeAssignments: {
          include: {
            judge: { select: { id: true, name: true, email: true } }
          }
        },
        reviews: {
          include: {
            round: { select: { id: true, name: true, active: true } },
            judge: { select: { id: true, name: true } },
            scores: {
              include: {
                criterion: { select: { name: true, maxMarks: true } }
              }
            }
          }
        },
        attendance: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const compiled = await compileTeamDetails(team, 'STUDENT', userId);
    return res.json(compiled);
  } catch (error) {
    console.error('Fetch my-team error:', error);
    return res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

// 2. GET /api/teams/:id
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    if (!userRole) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        track: { select: { name: true } },
        hackathon: { select: { name: true } },
        members: true,
        judgeAssignments: {
          include: {
            judge: { select: { id: true, name: true, email: true } }
          }
        },
        reviews: {
          include: {
            round: { select: { id: true, name: true, active: true } },
            judge: { select: { id: true, name: true } },
            scores: {
              include: {
                criterion: { select: { name: true, maxMarks: true } }
              }
            }
          }
        },
        attendance: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (userRole === 'STUDENT') {
      const isMember = team.members.some(m => m.userId === userId);
      const isLead = team.leadEmail && req.user?.email && team.leadEmail.toLowerCase() === req.user.email.toLowerCase();
      if (!isMember && !isLead) {
        return res.status(403).json({ error: 'Access denied: You can only view details for your own team.' });
      }
    }

    if (userRole === 'JUDGE') {
      const isAssigned = team.judgeAssignments.some(j => j.judgeId === userId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied: You are not assigned to evaluate this team.' });
      }
    }

    const compiled = await compileTeamDetails(team, userRole, userId);
    return res.json(compiled);
  } catch (error) {
    console.error('Fetch team details error:', error);
    return res.status(500).json({ error: 'Failed to fetch team details' });
  }
});

// 3. POST /api/teams (Admin manual create)
router.post('/', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = teamSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.status(400).json({ error: 'No active hackathon to register team into.' });
    }

    const data = parseResult.data;

    // Check duplicate name
    const existing = await prisma.team.findFirst({
      where: { name: data.name, hackathonId: activeHackathon.id },
    });

    if (existing) {
      return res.status(400).json({ error: 'Team name is already registered.' });
    }

    const track = await prisma.track.findUnique({
      where: { id: data.trackId },
    });
    if (!track) {
      return res.status(400).json({ error: 'Selected track does not exist.' });
    }

    const teamCode = await generateTeamCode(data.trackId, track.name);
    const regId = data.registrationId || `REG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const team = await prisma.team.create({
      data: {
        registrationId: regId,
        name: data.name,
        trackId: data.trackId,
        teamCode,
        qrCode: teamCode,
        college: data.college || data.collegeName || null,
        collegeName: data.collegeName || data.college || null,
        domain: data.domain || track.name,
        selectedPsId: data.selectedPsId || null,
        mentorName1: data.mentorName1 || null,
        emergencyContact: data.emergencyContact || null,
        status: data.status,
        hackathonId: activeHackathon.id,
        checkedIn: data.status !== 'Registered',
        checkInTime: data.status !== 'Registered' ? new Date() : null,

        leadName: data.leadName || null,
        leadEmail: data.leadEmail || null,
        leadMobile: data.leadMobile || null,
        leadUsn: data.leadUsn || null,

        member2Name: data.member2Name || null,
        member2Email: data.member2Email || null,
        member2Mobile: data.member2Mobile || null,
        member2Usn: data.member2Usn || null,

        member3Name: data.member3Name || null,
        member3Email: data.member3Email || null,
        member3Mobile: data.member3Mobile || null,
        member3Usn: data.member3Usn || null,

        member4Name: data.member4Name || null,
        member4Email: data.member4Email || null,
        member4Mobile: data.member4Mobile || null,
        member4Usn: data.member4Usn || null,

        member5Name: data.member5Name || null,
        member5Email: data.member5Email || null,
        member5Mobile: data.member5Mobile || null,
        member5Usn: data.member5Usn || null,

        paymentStatusFinal: data.paymentStatusFinal || 'PENDING',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'TEAM_CREATE_MANUAL',
        details: `Manually created Team "${team.name}" (Reg ID: ${team.registrationId}).`,
      },
    });

    return res.status(201).json({ success: true, team });
  } catch (error) {
    console.error('Create team error:', error);
    return res.status(500).json({ error: 'Failed to create team manually' });
  }
});

// 4. PUT /api/teams/:id (Workspace & Admin Updates)
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    if (!userRole) return res.status(401).json({ error: 'Unauthorized' });

    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (userRole === 'STUDENT') {
      const isMemberLeader = team.members.some(m => m.userId === userId && m.role === 'LEADER');
      const isLeadEmail = team.leadEmail && req.user?.email && team.leadEmail.toLowerCase() === req.user.email.toLowerCase();
      if (!isMemberLeader && !isLeadEmail) {
        return res.status(403).json({ error: 'Access denied: Only team leader can update workspace details.' });
      }

      if (team.locked) {
        return res.status(400).json({ error: 'Workspace is locked. Submission deadline passed.' });
      }

      const { projectUrl } = req.body;
      if (!projectUrl || typeof projectUrl !== 'string' || !projectUrl.toLowerCase().includes('github.com')) {
        return res.status(400).json({
          error: 'A valid public GitHub repository URL (https://github.com/...) is compulsory for all student teams.'
        });
      }

      const parseResult = projectUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
      }

      const updated = await prisma.team.update({
        where: { id },
        data: {
          ...parseResult.data,
          repoVisibility: 'PUBLIC',
          repoLastUpdated: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'TEAM_WORKSPACE_UPDATE',
          details: `Student Leader updated project workspace details for Team "${team.name}".`,
        },
      });

      return res.json({ success: true, team: updated });
    }

    if (userRole === 'ADMINISTRATOR') {
      const parseResult = adminUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
      }

      const updateData: any = { ...parseResult.data };
      if (updateData.status === 'Checked In' && !team.checkedIn) {
        updateData.checkedIn = true;
        updateData.checkInTime = new Date();
      }

      const updated = await prisma.team.update({
        where: { id },
        data: updateData,
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'TEAM_ADMIN_UPDATE',
          details: `Administrator updated Team settings for "${team.name}".`,
        },
      });

      return res.json({ success: true, team: updated });
    }

    return res.status(403).json({ error: 'Access denied: insufficient permissions' });
  } catch (error) {
    console.error('Update team workspace error:', error);
    return res.status(500).json({ error: 'Failed to update team workspace' });
  }
});

// 5. DELETE /api/teams/:id (Admin disband)
router.delete('/:id', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    await prisma.team.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        actorRole: 'ADMINISTRATOR',
        action: 'TEAM_DISBAND',
        details: `Disbanded team "${team.name}".`,
      },
    });

    return res.json({ success: true, message: `Team "${team.name}" disbanded successfully.` });
  } catch (error) {
    console.error('Delete team error:', error);
    return res.status(500).json({ error: 'Failed to disband team' });
  }
});

// 6. POST /api/teams/:id/submit-pdf - Secure PDF Domain Submission Upload
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' || file.mimetype !== 'application/pdf') {
      return cb(new Error('INVALID_FILE_TYPE: Only PDF files (.pdf) are allowed'));
    }
    cb(null, true);
  }
});

router.post('/:id/submit-pdf', authenticateToken, upload.single('pdf'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });

    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: true, track: true }
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Authorization check: User must be a member of the team or Admin
    if (userRole === 'STUDENT') {
      const isMember = team.members.some(m => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied: You are not a member of this team' });
      }
      if (team.locked) {
        return res.status(400).json({ error: 'Submissions are locked for this team.' });
      }
    } else if (userRole !== 'ADMINISTRATOR') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Magic Bytes Verification: Check if buffer starts with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    const headerHex = req.file.buffer.toString('utf8', 0, 5);
    if (!headerHex.startsWith('%PDF-')) {
      return res.status(400).json({ error: 'Security validation failed: File content is not a valid PDF document.' });
    }

    // Save PDF securely
    const uploadDir = path.join(__dirname, '../../uploads/submissions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeFilename = `sub_${team.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
    const fullPath = path.join(uploadDir, safeFilename);

    fs.writeFileSync(fullPath, req.file.buffer);

    const pdfUrl = `/uploads/submissions/${safeFilename}`;
    const now = new Date();

    // Create TeamSubmission record & update team details
    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.teamSubmission.create({
        data: {
          teamId: team.id,
          domain: team.domain || team.track.name,
          pdfUrl,
          originalName: req.file!.originalname,
          fileSize: req.file!.size,
          uploadedById: userId,
        }
      });

      await tx.team.update({
        where: { id: team.id },
        data: {
          pdfUrl,
          pdfFilename: req.file!.originalname,
          pdfUploadedAt: now,
        }
      });

      await tx.auditLog.create({
        data: {
          userId,
          actorRole: userRole,
          action: 'PDF_SUBMISSION_UPLOAD',
          details: `Uploaded PDF submission "${req.file!.originalname}" (${(req.file!.size / 1024).toFixed(1)} KB) for Team "${team.name}" (Domain: ${team.domain || team.track.name}).`,
          resource: 'TeamSubmission',
          resourceId: sub.id,
        }
      });

      return sub;
    });

    return res.json({
      success: true,
      message: 'PDF submission uploaded successfully.',
      submission,
      pdfUrl,
      pdfFilename: req.file.originalname,
      pdfUploadedAt: now,
    });
  } catch (error: any) {
    console.error('Upload PDF error:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload PDF submission' });
  }
});

export default router;

