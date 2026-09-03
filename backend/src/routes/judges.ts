import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const statusUpdateSchema = z.object({
  status: z.enum(['Available', 'Reviewing', 'Walking', 'Break', 'Offline']),
  currentTeamId: z.string().nullable().optional(),
  nextTeamId: z.string().nullable().optional(),
});

// 1. GET /api/judges - Get all judges with workload metrics
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    if (!userRole) return res.status(401).json({ error: 'Unauthorized' });

    // Judges can only view themselves, Admins see all
    const whereClause: any = { roleId: 'JUDGE' };
    if (userRole === 'JUDGE') {
      whereClause.id = userId;
    }

    const judges = await prisma.user.findMany({
      where: whereClause,
      include: {
        assignedTracks: true,
        judgeAssignments: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                status: true,
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        judgeReviews: {
          select: {
            teamId: true,
            status: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const compiledJudges = await Promise.all(judges.map(async (j) => {
      // Calculatecompleted reviews
      const completedReviewsCount = j.judgeReviews.filter(r => r.status === 'SUBMITTED').length;
      const pendingReviewsCount = Math.max(0, j.judgeAssignments.length - completedReviewsCount);

      // Get current team and next team details
      let currentTeamName = 'None';
      let nextTeamName = 'None';

      if (j.currentTeamId) {
        const team = await prisma.team.findUnique({ where: { id: j.currentTeamId }, select: { name: true } });
        if (team) currentTeamName = team.name;
      }
      if (j.nextTeamId) {
        const team = await prisma.team.findUnique({ where: { id: j.nextTeamId }, select: { name: true } });
        if (team) nextTeamName = team.name;
      }

      // Compile queue list in order
      const queue = j.judgeAssignments
        .filter((assign) => assign && assign.team)
        .map((assign) => ({
          assignmentId: assign.id,
          teamId: assign.teamId,
          teamName: assign.team ? assign.team.name : 'Unassigned',
          order: assign.order,
          status: assign.team ? assign.team.status : 'Registered',
        }));

      return {
        id: j.id,
        name: j.name,
        email: j.email,
        phone: j.phone || 'Not provided',
        status: j.judgeStatus,
        avgReviewTime: j.avgReviewTime,
        assignedTracks: j.assignedTracks.map(t => ({ id: t.id, name: t.name })),
        teamsAssignedCount: j.judgeAssignments.length,
        completedReviewsCount,
        pendingReviewsCount,
        currentTeamId: j.currentTeamId,
        currentTeamName,
        nextTeamId: j.nextTeamId,
        nextTeamName,
        queue,
      };
    }));

    // Generate workloads balancing metrics and highlight overload suggestions
    // Workload calculation is specific to track
    const trackWorkloads: Record<string, number[]> = {};
    compiledJudges.forEach(j => {
      j.assignedTracks.forEach(t => {
        if (!trackWorkloads[t.name]) trackWorkloads[t.name] = [];
        trackWorkloads[t.name].push(j.teamsAssignedCount);
      });
    });

    const suggestionsMap: Record<string, any> = {};
    compiledJudges.forEach(j => {
      // If judge is Reviewing or Offline and has high workload
      const isOverloaded = j.pendingReviewsCount > 3; 
      if (isOverloaded) {
        // Recommend another judge from the same track with the lowest workload
        let bestRecommendation: any = null;
        let lowestWorkload = Infinity;

        j.assignedTracks.forEach(t => {
          compiledJudges.forEach(other => {
            if (other.id !== j.id && other.status === 'Available' && other.assignedTracks.some(ot => ot.id === t.id)) {
              if (other.pendingReviewsCount < lowestWorkload) {
                lowestWorkload = other.pendingReviewsCount;
                bestRecommendation = {
                  id: other.id,
                  name: other.name,
                  pendingReviewsCount: other.pendingReviewsCount,
                  trackName: t.name,
                };
              }
            }
          });
        });

        if (bestRecommendation) {
          suggestionsMap[j.id] = bestRecommendation;
        }
      }
    });

    return res.json({
      judges: compiledJudges,
      suggestions: suggestionsMap,
    });
  } catch (error) {
    console.error('Fetch judges error:', error);
    return res.status(500).json({ error: 'Failed to fetch judges list' });
  }
});

// 2. POST /api/judges/assign-teams (Assign / Replace / Unassign Teams to Judges)
router.post('/assign-teams', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { judgeIds, teamIds, trackId, mode = 'ADD' } = req.body;

    if (!judgeIds || !Array.isArray(judgeIds) || !teamIds || !Array.isArray(teamIds)) {
      return res.status(400).json({ error: 'judgeIds and teamIds must be arrays' });
    }

    const assignmentsCreated: any[] = [];
    let unassignedCount = 0;

    // SQLite safe transaction
    await prisma.$transaction(async (tx) => {
      for (const judgeId of judgeIds) {
        if (mode === 'OVERWRITE') {
          // Remove previous assignments for this judge to enforce exact assignment set
          const deleted = await tx.judgeAssignment.deleteMany({
            where: { judgeId }
          });
          unassignedCount += deleted.count;
        }

        if (mode === 'UNASSIGN') {
          for (const teamId of teamIds) {
            const existing = await tx.judgeAssignment.findUnique({
              where: { judgeId_teamId: { judgeId, teamId } }
            });
            if (existing) {
              await tx.judgeAssignment.delete({ where: { id: existing.id } });
              unassignedCount += 1;
            }
          }
          continue;
        }

        let currentOrder = 0;
        for (const teamId of teamIds) {
          const existing = await tx.judgeAssignment.findUnique({
            where: { judgeId_teamId: { judgeId, teamId } }
          });

          if (!existing) {
            currentOrder += 1;
            const assign = await tx.judgeAssignment.create({
              data: {
                judgeId,
                teamId,
                trackId: trackId || null,
                order: currentOrder,
              }
            });
            assignmentsCreated.push(assign);
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: `JUDGE_ASSIGN_${mode}`,
        details: `${mode} assignment for ${judgeIds.length} judge(s) and ${teamIds.length} team(s).`,
      }
    });

    return res.json({
      success: true,
      assignedCount: assignmentsCreated.length,
      unassignedCount,
      count: assignmentsCreated.length
    });
  } catch (error) {
    console.error('Assign judges error:', error);
    return res.status(500).json({ error: 'Failed to assign teams to judges' });
  }
});

// 3. POST /api/judges/unassign-teams (Bulk Unassign Teams)
router.post('/unassign-teams', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { judgeIds, teamIds } = req.body;

    if (!judgeIds || !Array.isArray(judgeIds) || !teamIds || !Array.isArray(teamIds)) {
      return res.status(400).json({ error: 'judgeIds and teamIds must be arrays' });
    }

    let deletedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const judgeId of judgeIds) {
        for (const teamId of teamIds) {
          const existing = await tx.judgeAssignment.findUnique({
            where: {
              judgeId_teamId: { judgeId, teamId }
            }
          });

          if (existing) {
            await tx.judgeAssignment.delete({
              where: { id: existing.id }
            });
            deletedCount += 1;
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'JUDGE_UNASSIGN_BULK',
        details: `Unassigned judges from ${teamIds.length} teams.`,
      }
    });

    return res.json({ success: true, count: deletedCount });
  } catch (error) {
    console.error('Bulk unassign judges error:', error);
    return res.status(500).json({ error: 'Failed to unassign teams' });
  }
});

// 4. PUT /api/judges/:id/queue (Reorder Queue)
router.put('/:id/queue', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { orderedTeamIds } = req.body;

    if (!orderedTeamIds || !Array.isArray(orderedTeamIds)) {
      return res.status(400).json({ error: 'orderedTeamIds array is required' });
    }

    await prisma.$transaction(
      orderedTeamIds.map((teamId, index) =>
        prisma.judgeAssignment.update({
          where: {
            judgeId_teamId: { judgeId: id, teamId }
          },
          data: { order: index + 1 }
        })
      )
    );

    // Update current/next references automatically
    const topTwo = orderedTeamIds.slice(0, 2);
    await prisma.user.update({
      where: { id },
      data: {
        currentTeamId: topTwo[0] || null,
        nextTeamId: topTwo[1] || null,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'JUDGE_QUEUE_REORDER',
        details: `Reordered evaluation queue for judge ID ${id}.`,
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Reorder queue error:', error);
    return res.status(500).json({ error: 'Failed to reorder judge queue' });
  }
});

// 5. PUT /api/judges/:id/status (Update Operational Status)
router.put('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    if (!userRole) return res.status(401).json({ error: 'Unauthorized' });

    // Judges can edit only their own status, Admins can edit any
    if (userRole === 'JUDGE' && userId !== id) {
      return res.status(403).json({ error: 'Access denied: cannot update status of another judge' });
    }

    const parseResult = statusUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const { status, currentTeamId, nextTeamId } = parseResult.data;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        judgeStatus: status,
        currentTeamId: currentTeamId !== undefined ? currentTeamId : undefined,
        nextTeamId: nextTeamId !== undefined ? nextTeamId : undefined,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'JUDGE_STATUS_UPDATE',
        details: `Updated judge status for "${updated.name}" to "${status}".`,
      }
    });

    return res.json({ success: true, judge: updated });
  } catch (error) {
    console.error('Update judge status error:', error);
    return res.status(500).json({ error: 'Failed to update judge status' });
  }
});

// 6. POST /api/judges/:id/tracks (Assign Judge to Tracks - Admin only)
router.post('/:id/tracks', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { trackIds } = req.body;

    if (!trackIds || !Array.isArray(trackIds)) {
      return res.status(400).json({ error: 'trackIds array is required' });
    }

    const judge = await prisma.user.findUnique({
      where: { id, roleId: 'JUDGE' }
    });

    if (!judge) return res.status(404).json({ error: 'Judge not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        assignedTracks: {
          connect: trackIds.map(tid => ({ id: tid }))
        }
      },
      include: { assignedTracks: true }
    });

    return res.json({ success: true, assignedTracks: updated.assignedTracks });
  } catch (error) {
    console.error('Assign judge tracks error:', error);
    return res.status(500).json({ error: 'Failed to assign judge tracks' });
  }
});

// 7. DELETE /api/judges/:id/tracks/:trackId (Unassign Track)
router.delete('/:id/tracks/:trackId', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, trackId } = req.params;

    const judge = await prisma.user.findUnique({
      where: { id, roleId: 'JUDGE' }
    });

    if (!judge) return res.status(404).json({ error: 'Judge not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        assignedTracks: {
          disconnect: { id: trackId }
        }
      },
      include: { assignedTracks: true }
    });

    return res.json({ success: true, assignedTracks: updated.assignedTracks });
  } catch (error) {
    console.error('Unassign judge track error:', error);
    return res.status(500).json({ error: 'Failed to unassign track' });
  }
});

// 8. GET /api/judges/:id/reviews-audit (Get detailed review history, criteria marks, remarks, and current judging status)
router.get('/:id/reviews-audit', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const judge = await prisma.user.findUnique({
      where: { id, roleId: 'JUDGE' },
      include: {
        assignedTracks: true,
      },
    });

    if (!judge) return res.status(404).json({ error: 'Judge not found' });

    // Fetch current team info if currently judging
    let currentTeam: any = null;
    if (judge.currentTeamId) {
      currentTeam = await prisma.team.findUnique({
        where: { id: judge.currentTeamId },
        select: {
          id: true,
          name: true,
          registrationId: true,
          track: { select: { name: true } },
          status: true,
        },
      });
    }

    // Fetch all submitted reviews by this judge with criteria scores & round details
    const reviews = await prisma.review.findMany({
      where: { judgeId: id },
      include: {
        round: { select: { name: true, sequence: true } },
        team: {
          select: {
            id: true,
            name: true,
            registrationId: true,
            track: { select: { name: true } },
          },
        },
        scores: {
          include: {
            criterion: { select: { name: true, maxMarks: true, weight: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const compiledReviews = reviews.map((r) => {
      const criteriaBreakdown = r.scores.map((s) => ({
        criterionName: s.criterion.name,
        score: s.score,
        maxMarks: s.criterion.maxMarks,
        weight: s.criterion.weight,
      }));

      const totalMarks = r.scores.reduce((sum, s) => sum + (s.score || 0), 0);
      const totalMaxMarks = r.scores.reduce((sum, s) => sum + (s.criterion.maxMarks || 10), 0);

      return {
        reviewId: r.id,
        roundSequence: r.round.sequence,
        roundName: r.round.name,
        teamId: r.team.id,
        teamName: r.team.name,
        registrationId: r.team.registrationId,
        trackName: r.team.track?.name || 'N/A',
        criteriaBreakdown,
        totalMarks: Number(totalMarks.toFixed(1)),
        totalMaxMarks,
        remarks: r.comments || 'No remarks provided.',
        durationSeconds: r.actualDuration || 0,
        submittedAt: r.createdAt,
      };
    });

    return res.json({
      judge: {
        id: judge.id,
        name: judge.name,
        email: judge.email,
        phone: judge.phone || 'N/A',
        status: judge.judgeStatus,
        avgReviewTime: judge.avgReviewTime,
        assignedTracks: judge.assignedTracks.map((t) => t.name),
        isCurrentlyJudging: judge.judgeStatus === 'Reviewing' && !!currentTeam,
        currentTeam,
      },
      reviewsCount: compiledReviews.length,
      reviews: compiledReviews,
    });
  } catch (error) {
    console.error('Fetch judge reviews audit error:', error);
    return res.status(500).json({ error: 'Failed to fetch judge reviews audit data' });
  }
});

export default router;
