import { Router, Response } from 'express';
import prisma, { executeWriteTransaction } from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Whole-number integer scoring validation
const scoreSchema = z.object({
  criterionId: z.string(),
  score: z.number()
    .refine(val => Number.isInteger(val), { message: 'Score must be a whole integer number' })
    .refine(val => val >= 0, { message: 'Score cannot be negative' }),
});

const reviewSaveSchema = z.object({
  roundId: z.string(),
  teamId: z.string(),
  comments: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'COMPLETED']),
  scores: z.array(scoreSchema),
  plannedDuration: z.number().optional().nullable(),
  actualDuration: z.number().optional().nullable(),
});

// 0. GET /api/reviews/matrix - Live Review Progress Matrix
router.get('/matrix', authenticateToken, requireRole(['ADMINISTRATOR', 'JUDGE', 'DATA_ENTRY']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trackId } = req.query;

    const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });

    const rounds = await prisma.reviewRound.findMany({
      where: activeHackathon ? { hackathonId: activeHackathon.id } : {},
      include: { criteria: { select: { maxMarks: true } } },
      orderBy: { sequence: 'asc' },
    });

    const formattedRounds = rounds.map((r) => {
      const maxMarks = r.criteria.reduce((sum, c) => sum + (c.maxMarks || 10), 0);
      return {
        id: r.id,
        name: r.name,
        sequenceOrder: r.sequence,
        maxMarks: maxMarks || 30,
      };
    });

    const teams = await prisma.team.findMany({
      where: {
        ...(activeHackathon ? { hackathonId: activeHackathon.id } : {}),
        ...(trackId && typeof trackId === 'string' && trackId !== 'all' ? { trackId } : {}),
      },
      include: {
        track: { select: { id: true, name: true } },
        judgeAssignments: true,
        reviews: {
          include: {
            scores: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const matrix = teams.map((team) => {
      const assignedJudgesCount = team.judgeAssignments.length || 1;

      const roundStatuses = formattedRounds.map((r) => {
        const roundReviews = team.reviews.filter(
          (rev) => rev.roundId === r.id && rev.status === 'SUBMITTED'
        );
        const completedCount = roundReviews.length;

        let totalScoreSum = 0;
        roundReviews.forEach((rev) => {
          totalScoreSum += rev.scores.reduce((s, sc) => s + sc.score, 0);
        });

        const avgScore = completedCount > 0 ? Number((totalScoreSum / completedCount).toFixed(1)) : undefined;

        let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
        if (completedCount >= assignedJudgesCount) {
          status = 'COMPLETED';
        } else if (completedCount > 0) {
          status = 'IN_PROGRESS';
        }

        return {
          roundId: r.id,
          roundName: r.name,
          status,
          completedCount,
          assignedCount: assignedJudgesCount,
          totalScore: avgScore,
          progressLabel: `${completedCount}/${assignedJudgesCount}`,
        };
      });

      const allCompleted = roundStatuses.length > 0 && roundStatuses.every((r) => r.status === 'COMPLETED');
      const anyInProgress = roundStatuses.some((r) => r.status === 'IN_PROGRESS' || r.status === 'COMPLETED');

      const overallStatus = allCompleted ? 'COMPLETED' : anyInProgress ? 'IN_PROGRESS' : 'NOT_STARTED';

      return {
        team: {
          id: team.id,
          registrationId: team.registrationId || team.teamCode || team.id.substring(0, 8).toUpperCase(),
          name: team.name,
          trackId: team.trackId,
          trackName: team.track?.name || 'General Track',
          college: team.collegeName || team.college || 'Unspecified Institution',
          checkedIn: team.checkedIn,
          paymentStatusFinal: team.paymentStatusFinal || 'PENDING',
        },
        rounds: roundStatuses,
        overallStatus,
      };
    });

    return res.json({
      rounds: formattedRounds,
      matrix,
    });
  } catch (error) {
    console.error('Matrix fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch live review matrix' });
  }
});

// 1. GET /api/reviews/rounds - Get all review rounds and criteria
router.get('/rounds', authenticateToken, requireRole(['ADMINISTRATOR', 'JUDGE', 'DATA_ENTRY']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rounds = await prisma.reviewRound.findMany({
      include: {
        criteria: {
          orderBy: { sequence: 'asc' }
        }
      },
      orderBy: { sequence: 'asc' }
    });

    return res.json({ rounds });
  } catch (error) {
    console.error('Fetch review rounds error:', error);
    return res.status(500).json({ error: 'Failed to fetch active review rounds' });
  }
});

// 2. GET /api/reviews/open-pool - Open Judge Pool (Dynamic list of teams & claim states)
// 2. GET /api/reviews/open-pool - Admin-Assigned Teams Roster for Judges
router.get('/open-pool', authenticateToken, requireRole(['ADMINISTRATOR', 'JUDGE', 'DATA_ENTRY']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const judgeId = req.user?.userId;
    const userRole = req.user?.role;
    const roundIdParam = req.query.roundId as string | undefined;

    if (!judgeId || !userRole) return res.status(401).json({ error: 'Unauthorized' });

    let activeRound: any = null;
    if (roundIdParam) {
      activeRound = await prisma.reviewRound.findUnique({
        where: { id: roundIdParam },
        include: { criteria: { orderBy: { sequence: 'asc' } } }
      });
    }

    if (!activeRound) {
      activeRound = await prisma.reviewRound.findFirst({
        orderBy: { sequence: 'asc' },
        include: { criteria: { orderBy: { sequence: 'asc' } } }
      });
    }

    if (!activeRound) {
      return res.json({ round: null, teams: [] });
    }

    const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
    if (!activeHackathon) {
      return res.json({ round: activeRound, teams: [] });
    }

    let teamsList: any[] = [];

    if (userRole === 'JUDGE') {
      // 1. Fetch teams assigned specifically to this judge by the Admin
      const assignments = await prisma.judgeAssignment.findMany({
        where: { judgeId },
        include: {
          team: {
            include: {
              track: { select: { name: true } },
              members: true,
              reviews: {
                where: { roundId: activeRound.id },
                include: { judge: { select: { name: true } } }
              }
            }
          }
        },
        orderBy: { order: 'asc' }
      });

      if (assignments.length > 0) {
        teamsList = assignments.map(a => ({
          ...a.team,
          assignmentOrder: a.order,
        }));
      } else {
        // Fallback: Fetch teams from judge's assigned tracks
        const judgeUser = await prisma.user.findUnique({
          where: { id: judgeId },
          include: { assignedTracks: true }
        });
        const trackIds = judgeUser?.assignedTracks.map(t => t.id) || [];

        const whereClause: any = {
          hackathonId: activeHackathon.id,
          status: { notIn: ['Disqualified', 'Withdrawn'] },
        };
        if (trackIds.length > 0) {
          whereClause.trackId = { in: trackIds };
        }

        teamsList = await prisma.team.findMany({
          where: whereClause,
          include: {
            track: { select: { name: true } },
            members: true,
            reviews: {
              where: { roundId: activeRound.id },
              include: { judge: { select: { name: true } } }
            }
          },
          orderBy: { name: 'asc' }
        });
      }
    } else {
      // Administrator sees all teams
      teamsList = await prisma.team.findMany({
        where: {
          hackathonId: activeHackathon.id,
          status: { notIn: ['Disqualified', 'Withdrawn'] }
        },
        include: {
          track: { select: { name: true } },
          members: true,
          reviews: {
            where: { roundId: activeRound.id },
            include: { judge: { select: { name: true } } }
          }
        },
        orderBy: { registrationId: 'asc' }
      });
    }

    const mappedTeams = teamsList.map(team => {
      const review = team.reviews ? team.reviews[0] : null;

      let evalStatus = 'PENDING';
      let judgeName = null;

      if (review && review.status === 'SUBMITTED') {
        evalStatus = 'COMPLETED';
        judgeName = review.judge?.name || 'Judge';
      } else if (review && review.status === 'DRAFT') {
        evalStatus = 'DRAFT';
      }

      return {
        id: team.id,
        teamCode: team.teamCode || team.registrationId || team.id.substring(0, 8),
        registrationId: team.registrationId || `REG-${team.id.substring(0, 4)}`,
        name: team.name,
        trackName: team.track?.name || 'General',
        trackId: team.trackId,
        projectTitle: team.projectTitle,
        membersCount: team.members ? team.members.length : 0,
        checkedIn: team.checkedIn,
        checkInStatus: team.checkInStatus,
        evalStatus,
        judgeName,
        reviewStatus: review?.status || 'NOT_STARTED',
        assignmentOrder: team.assignmentOrder || 0,
      };
    });

    return res.json({
      round: activeRound,
      teams: mappedTeams,
    });
  } catch (error) {
    console.error('Fetch assigned teams error:', error);
    return res.status(500).json({ error: 'Failed to fetch assigned teams roster' });
  }
});

// 3. POST /api/reviews/claim - Atomic claim of evaluation slot (No countdown timer limit)
router.post('/claim', authenticateToken, requireRole(['ADMINISTRATOR', 'JUDGE', 'DATA_ENTRY']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const judgeId = req.user?.userId;
    if (!judgeId) return res.status(401).json({ error: 'Unauthorized' });

    const { teamId, roundId } = req.body;
    if (!teamId || !roundId) {
      return res.status(400).json({ error: 'teamId and roundId are required' });
    }

    // Verify judge assignment to target team (Judge Isolation)
    const isAssigned = await prisma.judgeAssignment.findFirst({
      where: { judgeId, teamId }
    });
    if (!isAssigned) {
      const judgeUser = await prisma.user.findUnique({
        where: { id: judgeId },
        include: { assignedTracks: true }
      });
      const team = await prisma.team.findUnique({ where: { id: teamId }, select: { trackId: true } });
      const isTrackAssigned = team && judgeUser?.assignedTracks.some(t => t.id === team.trackId);

      if (!isAssigned && !isTrackAssigned) {
        return res.status(403).json({ error: 'Access denied: You are not assigned to evaluate this team.' });
      }
    }

    const claim = await prisma.$transaction(async (tx) => {
      // Check if team is already evaluated/submitted in this round
      const submittedReview = await tx.review.findFirst({
        where: { teamId, roundId, status: 'SUBMITTED' }
      });
      if (submittedReview) {
        throw new Error('EVALUATION_ALREADY_SUBMITTED');
      }

      // Check if another judge currently holds an active claim
      const existingClaim = await tx.evaluationClaim.findFirst({
        where: { teamId, roundId, status: 'ACTIVE' },
        include: { judge: { select: { name: true } } }
      });

      if (existingClaim) {
        if (existingClaim.judgeId === judgeId) {
          return existingClaim;
        }
        throw new Error(`SLOT_CLAIMED_BY_${existingClaim.judge.name.toUpperCase()}`);
      }

      // Create new atomic claim
      const newClaim = await tx.evaluationClaim.create({
        data: {
          teamId,
          roundId,
          judgeId,
          status: 'ACTIVE',
        }
      });

      await tx.user.update({
        where: { id: judgeId },
        data: { judgeStatus: 'Reviewing', currentTeamId: teamId }
      });

      await tx.auditLog.create({
        data: {
          userId: judgeId,
          actorRole: req.user?.role,
          action: 'EVALUATION_CLAIMED',
          details: `Judge claimed evaluation for Team ID ${teamId} in Round ${roundId}.`,
          resource: 'EvaluationClaim',
          resourceId: newClaim.id,
        }
      });

      return newClaim;
    });

    return res.json({ success: true, message: 'Evaluation slot claimed successfully.', claim });
  } catch (error: any) {
    if (error.message === 'EVALUATION_ALREADY_SUBMITTED') {
      return res.status(409).json({ error: 'This team has already been evaluated and submitted for this round.' });
    }
    if (error.message && error.message.startsWith('SLOT_CLAIMED_BY_')) {
      const name = error.message.replace('SLOT_CLAIMED_BY_', '');
      return res.status(409).json({ error: `This evaluation is currently claimed by Judge ${name}.` });
    }
    console.error('Claim evaluation error:', error);
    return res.status(500).json({ error: 'Failed to claim evaluation slot' });
  }
});

// 4. POST /api/reviews/release - Safe Release of Evaluation Claim
router.post('/release', authenticateToken, requireRole(['ADMINISTRATOR', 'JUDGE', 'DATA_ENTRY']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const judgeId = req.user?.userId;
    const { teamId, roundId, claimId } = req.body;

    if (!judgeId) return res.status(401).json({ error: 'Unauthorized' });

    const whereClause = claimId
      ? { id: claimId }
      : { teamId_roundId: { teamId, roundId } };

    const claim = await prisma.evaluationClaim.findUnique({ where: whereClause as any });
    if (!claim) {
      return res.status(404).json({ error: 'Evaluation claim not found' });
    }

    if (req.user?.role !== 'ADMINISTRATOR' && claim.judgeId !== judgeId) {
      return res.status(403).json({ error: 'Access denied: You can only release your own claim.' });
    }

    await prisma.evaluationClaim.update({
      where: { id: claim.id },
      data: { status: 'RELEASED' }
    });

    await prisma.user.update({
      where: { id: claim.judgeId },
      data: { judgeStatus: 'Available', currentTeamId: null }
    });

    await prisma.auditLog.create({
      data: {
        userId: judgeId,
        actorRole: req.user?.role,
        action: 'EVALUATION_CLAIM_RELEASED',
        details: `Released evaluation claim for Team ID ${claim.teamId}.`,
        resource: 'EvaluationClaim',
        resourceId: claim.id,
      }
    });

    return res.json({ success: true, message: 'Evaluation claim released.' });
  } catch (error) {
    console.error('Release claim error:', error);
    return res.status(500).json({ error: 'Failed to release evaluation claim' });
  }
});

// 5. GET /api/reviews/draft/:teamId - Get existing review (draft or submitted) for a team and round
router.get('/draft/:teamId', authenticateToken, requireRole(['JUDGE']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const judgeId = req.user?.userId;
    const roundIdParam = req.query.roundId as string | undefined;

    if (!judgeId) return res.status(401).json({ error: 'Unauthorized' });

    let targetRoundId = roundIdParam;
    if (!targetRoundId) {
      const activeRound = await prisma.reviewRound.findFirst({
        where: { active: true }
      });
      targetRoundId = activeRound?.id;
    }

    if (!targetRoundId) {
      return res.status(400).json({ error: 'No review round specified or active.' });
    }

    const review = await prisma.review.findFirst({
      where: {
        roundId: targetRoundId,
        teamId,
        judgeId,
      },
      include: {
        scores: true
      }
    });

    return res.json({ review: review || null });
  } catch (error) {
    console.error('Fetch draft review error:', error);
    return res.status(500).json({ error: 'Failed to fetch review draft' });
  }
});

// 6. POST /api/reviews/save - Save draft or finalize evaluation (Enforces integer scoring)
router.post('/save', authenticateToken, requireRole(['JUDGE']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const judgeId = req.user?.userId;
    if (!judgeId) return res.status(401).json({ error: 'Unauthorized' });

    const parseResult = reviewSaveSchema.safeParse(req.body);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const isScoreError = fieldErrors.scores !== undefined;
      const errorMessage = isScoreError
        ? 'Validation failed: Whole numbers only allowed for scores.'
        : `Validation failed: Invalid evaluation payload (${Object.keys(fieldErrors).join(', ')}).`;
      return res.status(400).json({ error: errorMessage, details: fieldErrors });
    }

    const { roundId, teamId, comments, status, scores, plannedDuration, actualDuration } = parseResult.data;
    const statusToSave = (status === 'COMPLETED' || status === 'SUBMITTED') ? 'SUBMITTED' : 'DRAFT';

    // Verify judge assignment to target team (Judge Isolation)
    const isAssigned = await prisma.judgeAssignment.findFirst({
      where: { judgeId, teamId }
    });
    if (!isAssigned) {
      const judgeUser = await prisma.user.findUnique({
        where: { id: judgeId },
        include: { assignedTracks: true }
      });
      const team = await prisma.team.findUnique({ where: { id: teamId }, select: { trackId: true } });
      const isTrackAssigned = team && judgeUser?.assignedTracks.some(t => t.id === team.trackId);

      if (!isAssigned && !isTrackAssigned) {
        return res.status(403).json({ error: 'Access denied: You are not assigned to evaluate this team.' });
      }
    }

    // Validate that the review round exists
    const round = await prisma.reviewRound.findUnique({
      where: { id: roundId }
    });
    if (!round) {
      return res.status(400).json({ error: 'Review round does not exist.' });
    }

    // Validate that all criteria for the round are scored when submitting
    const allRoundCriteria = await prisma.judgingCriterion.findMany({
      where: { roundId }
    });

    if (statusToSave === 'SUBMITTED') {
      for (const reqCriterion of allRoundCriteria) {
        const matchingScore = scores.find(s => s.criterionId === reqCriterion.id);
        if (!matchingScore || typeof matchingScore.score !== 'number') {
          return res.status(400).json({
            error: `Marks are compulsory for all criteria. Missing score for "${reqCriterion.name}".`
          });
        }
      }
    }

    // Validate scores against criteria maxMarks and integer requirement
    for (const scoreInput of scores) {
      if (!Number.isInteger(scoreInput.score)) {
        return res.status(400).json({ error: `Score must be a whole integer number. Invalid score: ${scoreInput.score}` });
      }
      const criterion = allRoundCriteria.find(c => c.id === scoreInput.criterionId);
      if (!criterion) {
        return res.status(400).json({ error: `Invalid criterion ID: ${scoreInput.criterionId}` });
      }
      if (scoreInput.score < 0) {
        return res.status(400).json({ error: `Score for "${criterion.name}" cannot be negative.` });
      }
      if (scoreInput.score > criterion.maxMarks) {
        return res.status(400).json({
          error: `Score for "${criterion.name}" exceeds maximum allowed marks of ${criterion.maxMarks}.`
        });
      }
    }

    // Check if there is an existing review
    const existingReview = await prisma.review.findFirst({
      where: { roundId, teamId, judgeId }
    });

    // Never let a stale autosave (DRAFT) downgrade an already-submitted review.
    // A debounced autosave request can land after the judge's real submit
    // (e.g. they tweak a score and hit Submit within the autosave window),
    // which would otherwise silently revert a completed scorecard to draft.
    if (existingReview?.status === 'SUBMITTED' && statusToSave === 'DRAFT') {
      return res.json({
        success: true,
        message: 'Review already submitted; draft autosave ignored.',
      });
    }

    let reviewId = existingReview?.id;

    // Save/submit transaction serialized via write mutex for rock-solid SQLite concurrency
    await executeWriteTransaction(async (db) => {
      if (existingReview) {
        await db.review.update({
          where: { id: existingReview.id },
          data: {
            rubricVersion: round.rubricVersion,
            comments: comments || null,
            status: statusToSave,
            plannedDuration: plannedDuration !== undefined ? plannedDuration : existingReview.plannedDuration,
            actualDuration: actualDuration !== undefined ? actualDuration : existingReview.actualDuration,
          }
        });

        await db.reviewScore.deleteMany({
          where: { reviewId: existingReview.id }
        });
      } else {
        const created = await db.review.create({
          data: {
            roundId,
            teamId,
            judgeId,
            rubricVersion: round.rubricVersion,
            comments: comments || null,
            status: statusToSave,
            plannedDuration: plannedDuration || null,
            actualDuration: actualDuration || null,
          }
        });
        reviewId = created.id;
      }

      // Create new whole-number score entries
      await db.reviewScore.createMany({
        data: scores.map(s => ({
          reviewId: reviewId!,
          criterionId: s.criterionId,
          score: Math.round(s.score),
        }))
      });

      if (status === 'SUBMITTED') {
        // Mark claim completed
        await db.evaluationClaim.updateMany({
          where: { teamId, roundId, judgeId },
          data: { status: 'COMPLETED' }
        });

        // Clear judge status
        await db.user.update({
          where: { id: judgeId },
          data: {
            judgeStatus: 'Available',
            currentTeamId: null,
          }
        });
      }
    });

    if (status === 'SUBMITTED') {
      await prisma.auditLog.create({
        data: {
          userId: judgeId,
          actorRole: 'JUDGE',
          action: 'REVIEW_COMPLETED',
          details: `Review completed and submitted for Team ID ${teamId} in Round ${round.name} (Rubric v${round.rubricVersion}).`,
          resource: 'Review',
          resourceId: reviewId,
        }
      });
    }

    return res.json({
      success: true,
      message: status === 'SUBMITTED' ? 'Review submitted successfully.' : 'Draft saved successfully.',
    });
  } catch (error) {
    console.error('Save review error:', error);
    return res.status(500).json({ error: 'Failed to save review' });
  }
});

// 6.5 POST /api/reviews/admin-save - Admin batch entry (submit on behalf of a judge)
router.post('/admin-save', authenticateToken, requireRole(['ADMINISTRATOR', 'DATA_ENTRY']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.userId;
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

    // We reuse the same schema but we need judgeId
    const adminSaveSchema = reviewSaveSchema.extend({
      judgeId: z.string(),
    });

    const parseResult = adminSaveSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const { roundId, teamId, judgeId, comments, status, scores } = parseResult.data;
    const statusToSave = (status === 'COMPLETED' || status === 'SUBMITTED') ? 'SUBMITTED' : 'DRAFT';

    const round = await prisma.reviewRound.findUnique({ where: { id: roundId } });
    if (!round) return res.status(400).json({ error: 'Review round does not exist.' });

    const allRoundCriteria = await prisma.judgingCriterion.findMany({ where: { roundId } });

    if (statusToSave === 'SUBMITTED') {
      for (const reqCriterion of allRoundCriteria) {
        const matchingScore = scores.find(s => s.criterionId === reqCriterion.id);
        if (!matchingScore || typeof matchingScore.score !== 'number') {
          return res.status(400).json({ error: `Missing score for "${reqCriterion.name}".` });
        }
      }
    }

    for (const scoreInput of scores) {
      if (!Number.isInteger(scoreInput.score) || scoreInput.score < 0) {
        return res.status(400).json({ error: `Invalid score: ${scoreInput.score}` });
      }
      const criterion = allRoundCriteria.find(c => c.id === scoreInput.criterionId);
      if (!criterion) return res.status(400).json({ error: `Invalid criterion ID: ${scoreInput.criterionId}` });
      if (scoreInput.score > criterion.maxMarks) {
        return res.status(400).json({ error: `Score for "${criterion.name}" exceeds maximum of ${criterion.maxMarks}.` });
      }
    }

    const existingReview = await prisma.review.findFirst({
      where: { roundId, teamId, judgeId }
    });

    let reviewId = existingReview?.id;

    await executeWriteTransaction(async (db) => {
      if (existingReview) {
        await db.review.update({
          where: { id: existingReview.id },
          data: {
            rubricVersion: round.rubricVersion,
            comments: comments || null,
            status: statusToSave,
          }
        });
        await db.reviewScore.deleteMany({ where: { reviewId: existingReview.id } });
      } else {
        const created = await db.review.create({
          data: {
            roundId,
            teamId,
            judgeId,
            rubricVersion: round.rubricVersion,
            comments: comments || null,
            status: statusToSave,
          }
        });
        reviewId = created.id;
      }

      await db.reviewScore.createMany({
        data: scores.map(s => ({
          reviewId: reviewId!,
          criterionId: s.criterionId,
          score: Math.round(s.score),
        }))
      });

      if (status === 'SUBMITTED') {
        await db.evaluationClaim.updateMany({
          where: { teamId, roundId, judgeId },
          data: { status: 'COMPLETED' }
        });
      }
    });

    if (status === 'SUBMITTED') {
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          actorRole: 'ADMINISTRATOR',
          action: 'ADMIN_BATCH_REVIEW_SUBMITTED',
          details: `Admin submitted review on behalf of Judge ID ${judgeId} for Team ID ${teamId} in Round ${round.name}.`,
          resource: 'Review',
          resourceId: reviewId,
        }
      });
    }

    return res.json({ success: true, message: 'Batch review submitted successfully.' });
  } catch (error) {
    console.error('Admin save review error:', error);
    return res.status(500).json({ error: 'Failed to save review on behalf of judge' });
  }
});

// 7. POST /api/reviews/override - Admin Administrative Score Override (Preserves History)
router.post('/override', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.userId;
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

    let { reviewId, criterionId, newScore, reason } = req.body;

    if (!reviewId || newScore === undefined || !reason) {
      return res.status(400).json({ error: 'reviewId, newScore, and reason are required' });
    }

    if (!Number.isInteger(newScore) || newScore < 0) {
      return res.status(400).json({ error: 'newScore must be a non-negative whole integer number' });
    }

    // Find review & associated scores
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { scores: { include: { criterion: true } }, team: true }
    });

    if (!review || review.scores.length === 0) {
      return res.status(444).json({ error: 'Review scorecard entry not found' });
    }

    let targetScoreEntry = review.scores[0];
    if (criterionId) {
      const match = review.scores.find(s => s.criterionId === criterionId);
      if (match) targetScoreEntry = match;
    }

    if (newScore > targetScoreEntry.criterion.maxMarks) {
      return res.status(400).json({ error: `newScore (${newScore}) cannot exceed maximum marks of ${targetScoreEntry.criterion.maxMarks}` });
    }

    const originalScore = targetScoreEntry.score;

    await prisma.$transaction(async (tx) => {
      // 1. Create Override Record preserving history
      await tx.reviewOverride.create({
        data: {
          reviewId,
          criterionId: targetScoreEntry.criterionId,
          originalScore,
          newScore,
          changedById: adminId,
          reason,
        }
      });

      // 2. Update ReviewScore
      await tx.reviewScore.update({
        where: { id: targetScoreEntry.id },
        data: { score: newScore }
      });

      // 3. Log Audit Trail
      await tx.auditLog.create({
        data: {
          userId: adminId,
          actorRole: 'ADMINISTRATOR',
          action: 'ADMIN_SCORE_OVERRIDE',
          details: `Admin score override for Team "${review.team.name}" - Criterion "${targetScoreEntry.criterion.name}": ${originalScore} -> ${newScore}. Reason: ${reason}`,
          resource: 'ReviewScore',
          resourceId: targetScoreEntry.id,
          previousState: String(originalScore),
          newState: String(newScore),
        }
      });
    });

    return res.json({
      success: true,
      message: `Score override recorded: ${originalScore} -> ${newScore}`,
      originalScore,
      newScore,
      reason,
    });
  } catch (error) {
    console.error('Admin score override error:', error);
    return res.status(500).json({ error: 'Failed to execute score override' });
  }
});

// 8. GET /api/reviews/history/all - Dedicated Admin Judge Review History Console
router.get('/history/all', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const judges = await prisma.user.findMany({
      where: { roleId: 'JUDGE' },
      include: {
        assignedTracks: { select: { name: true } },
        judgeReviews: {
          where: { status: 'SUBMITTED' },
          include: {
            round: true,
            team: { select: { name: true, teamCode: true } },
            scores: { include: { criterion: true } },
            overrides: { include: { changedBy: { select: { name: true } } } }
          },
          orderBy: { updatedAt: 'desc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    const judgesSummary = judges.map(j => {
      const completed = j.judgeReviews;
      const r1Count = completed.filter(r => r.round.sequence === 1).length;
      const r2Count = completed.filter(r => r.round.sequence === 2).length;
      const r3Count = completed.filter(r => r.round.sequence === 3).length;

      let totalScoreSum = 0;
      let totalMaxSum = 0;

      completed.forEach(r => {
        r.scores.forEach(s => {
          totalScoreSum += s.score;
          totalMaxSum += s.criterion.maxMarks;
        });
      });

      const avgPercentage = totalMaxSum > 0 ? Math.round((totalScoreSum / totalMaxSum) * 100) : 0;
      const lastEval = completed[0]?.updatedAt || null;

      return {
        judgeId: j.id,
        name: j.name,
        email: j.email,
        judgeStatus: j.judgeStatus,
        assignedTracks: j.assignedTracks.map(t => t.name).join(', ') || 'All Tracks',
        totalEvaluations: completed.length,
        r1Count,
        r2Count,
        r3Count,
        avgScorePercentage: avgPercentage,
        lastEvaluationTimestamp: lastEval,
      };
    });

    // Fetch chronological history logs
    const allSubmittedReviews = await prisma.review.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        judge: { select: { id: true, name: true, email: true } },
        team: { select: { id: true, name: true, teamCode: true, track: { select: { name: true } } } },
        round: { select: { id: true, name: true, sequence: true, rubricVersion: true } },
        scores: { include: { criterion: true } },
        overrides: { include: { changedBy: { select: { name: true } } } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const historyLogs = allSubmittedReviews.map(r => {
      let totalScore = 0;
      let maxScore = 0;
      r.scores.forEach(s => {
        totalScore += s.score;
        maxScore += s.criterion.maxMarks;
      });

      return {
        id: r.id,
        timestamp: r.updatedAt,
        judgeId: r.judge.id,
        judgeName: r.judge.name,
        teamId: r.team.id,
        teamName: r.team.name,
        teamCode: r.team.teamCode || r.team.id.substring(0, 8),
        trackName: r.team.track.name,
        roundId: r.round.id,
        roundName: r.round.name,
        roundSequence: r.round.sequence,
        rubricVersion: r.rubricVersion || r.round.rubricVersion,
        totalScore,
        maxScore,
        status: r.status,
        comments: r.comments,
        scores: r.scores.map(s => ({
          criterionName: s.criterion.name,
          score: s.score,
          maxMarks: s.criterion.maxMarks,
        })),
        overrides: r.overrides.map(o => ({
          originalScore: o.originalScore,
          newScore: o.newScore,
          changedBy: o.changedBy.name,
          reason: o.reason,
          createdAt: o.createdAt,
        }))
      };
    });

    return res.json({ judgesSummary, historyLogs });
  } catch (error) {
    console.error('Fetch judge review history error:', error);
    return res.status(500).json({ error: 'Failed to fetch review history' });
  }
});

// 9. GET /api/reviews/history/judge/:judgeId - Individual Judge Report
router.get('/history/judge/:judgeId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { judgeId } = req.params;
    const userRole = req.user?.role;
    const reqUserId = req.user?.userId;

    if (userRole !== 'ADMINISTRATOR' && reqUserId !== judgeId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const judge = await prisma.user.findUnique({
      where: { id: judgeId },
      include: { assignedTracks: true }
    });

    if (!judge) return res.status(404).json({ error: 'Judge not found' });

    const reviews = await prisma.review.findMany({
      where: { judgeId },
      include: {
        team: { select: { name: true, teamCode: true, track: { select: { name: true } } } },
        round: true,
        scores: { include: { criterion: true } },
        overrides: { include: { changedBy: { select: { name: true } } } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: judgeId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return res.json({
      judge: {
        id: judge.id,
        name: judge.name,
        email: judge.email,
        phone: judge.phone,
        judgeStatus: judge.judgeStatus,
        assignedTracks: judge.assignedTracks.map(t => t.name),
      },
      reviews,
      auditLogs,
    });
  } catch (error) {
    console.error('Fetch judge report error:', error);
    return res.status(500).json({ error: 'Failed to fetch judge report' });
  }
});

export default router;



