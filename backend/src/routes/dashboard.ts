import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// 1. GET /api/dashboard/stats
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trackId = req.query.trackId as string | undefined;

    // Find the active hackathon
    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.json({
        stats: {
          teamsCount: 0,
          checkedInCount: 0,
          pendingCheckInCount: 0,
          totalParticipantsCount: 0,
          paidTeamsCount: 0,
          pendingPaymentsCount: 0,
          reviewsCompletedCount: 0,
          reviewsRemainingCount: 0,
          activeJudgesCount: 0,
          totalJudgesCount: 0,
          unresolvedQuestionsCount: 0,
          completionRate: 0,
          collegesRepresentedCount: 0,
          teamsPerTrack: [],
          collegesDistribution: [],
          problemStatementDistribution: [],
        }
      });
    }

    // Build filters based on track context
    const teamFilter = {
      hackathonId: activeHackathon.id,
      ...(trackId ? { trackId } : {}),
    };

    // Metrics calculation in parallel using Promise.all for <100ms response time
    const judgesFilter = trackId ? { trackId } : {};

    const [
      totalTeams,
      checkedInTeams,
      totalParticipants,
      paidTeamsCount,
      assignments,
      activeReviewers,
      unresolvedQuestions,
      activeRounds,
      totalAssignments,
      allTeamsWithCollege,
      tracksList,
      qrCodesGeneratedCount,
      lastCheckInRecord
    ] = await Promise.all([
      prisma.team.count({ where: teamFilter }),
      prisma.team.count({ where: { ...teamFilter, checkedIn: true } }),
      prisma.teamMember.count({ where: { team: teamFilter } }),
      prisma.team.count({ where: { ...teamFilter, paymentStatusFinal: 'PAID' } }),
      prisma.judgeAssignment.findMany({ where: judgesFilter, select: { judgeId: true } }),
      prisma.review.findMany({ where: { team: teamFilter }, select: { judgeId: true } }),
      prisma.question.count({
        where: {
          hackathonId: activeHackathon.id,
          status: { in: ['OPEN', 'ASSIGNED', 'Open', 'Assigned'] },
          ...(trackId ? { user: { teamMembers: { some: { team: { trackId } } } } } : {})
        }
      }),
      prisma.reviewRound.findMany({ where: { hackathonId: activeHackathon.id } }),
      prisma.judgeAssignment.count({ where: judgesFilter }),
      prisma.team.findMany({
        where: teamFilter,
        select: {
          id: true,
          collegeName: true,
          college: true,
          selectedPsId: true,
          trackId: true
        }
      }),
      prisma.track.findMany({
        where: { hackathonId: activeHackathon.id },
        include: { _count: { select: { teams: true } } }
      }),
      prisma.team.count({ where: { ...teamFilter, qrCode: { not: null } } }),
      prisma.team.findFirst({
        where: { ...teamFilter, checkedIn: true, checkInTime: { not: null } },
        orderBy: { checkInTime: 'desc' },
        select: { checkInTime: true }
      })
    ]);

    const pendingCheckIn = totalTeams - checkedInTeams;
    const pendingPaymentsCount = totalTeams - paidTeamsCount;

    const uniqueJudgeIds = Array.from(new Set(assignments.map(a => a.judgeId)));
    const totalJudges = uniqueJudgeIds.length;

    const activeJudgeIds = Array.from(new Set(activeReviewers.map(r => r.judgeId)));
    const activeJudges = activeJudgeIds.length;

    const activeRoundIds = activeRounds.map(r => r.id);
    const expectedReviewsCount = totalAssignments * (activeRoundIds.length || 1);

    const submittedReviewsCount = await prisma.review.count({
      where: {
        roundId: { in: activeRoundIds },
        status: 'SUBMITTED',
        team: teamFilter,
      },
    });

    const reviewsRemainingCount = Math.max(0, expectedReviewsCount - submittedReviewsCount);
    let completionRate = expectedReviewsCount > 0
      ? Math.round((submittedReviewsCount / expectedReviewsCount) * 100)
      : 0;

    const teamsPerTrack = tracksList.map(t => ({
      id: t.id,
      name: t.name,
      count: t._count.teams,
    }));

    const collegeCounts: Record<string, number> = {};
    const psCounts: Record<string, number> = {};

    allTeamsWithCollege.forEach(t => {
      const c = t.collegeName || t.college || 'Unspecified';
      collegeCounts[c] = (collegeCounts[c] || 0) + 1;

      const ps = t.selectedPsId || 'Not Selected';
      psCounts[ps] = (psCounts[ps] || 0) + 1;
    });

    const collegesDistribution = Object.entries(collegeCounts).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const problemStatementDistribution = Object.entries(psCounts).map(([psId, count]) => ({ psId, count }))
      .sort((a, b) => b.count - a.count);

    return res.json({
      stats: {
        teamsCount: totalTeams,
        checkedInCount: checkedInTeams,
        pendingCheckInCount: pendingCheckIn,
        qrCodesGeneratedCount,
        lastCheckInTime: lastCheckInRecord?.checkInTime || null,
        totalParticipantsCount: totalParticipants,
        paidTeamsCount,
        pendingPaymentsCount,
        reviewsCompletedCount: submittedReviewsCount,
        reviewsRemainingCount,
        activeJudgesCount: activeJudges,
        totalJudgesCount: totalJudges || 0,
        unresolvedQuestionsCount: unresolvedQuestions,
        completionRate: completionRate > 100 ? 100 : completionRate,
        collegesRepresentedCount: collegesDistribution.length,
        teamsPerTrack,
        collegesDistribution,
        problemStatementDistribution,
      },
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

// 2. GET /api/dashboard/activity
router.get('/activity', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trackId = req.query.trackId as string | undefined;

    // Fetch review activities
    const reviews = await prisma.review.findMany({
      where: {
        team: trackId ? { trackId } : {},
      },
      include: {
        judge: { select: { name: true } },
        team: { select: { name: true, track: { select: { name: true } } } },
        round: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    // Fetch question activities
    const questions = await prisma.question.findMany({
      where: trackId ? {
        user: {
          teamMembers: {
            some: {
              team: { trackId }
            }
          }
        }
      } : {},
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Fetch announcements
    const announcements = await prisma.announcement.findMany({
      where: trackId ? { trackId } : {},
      include: {
        author: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Merge activities into a unified feed
    const feed: any[] = [];

    reviews.forEach((r) => {
      feed.push({
        id: `review-${r.id}`,
        type: 'REVIEW',
        title: r.status === 'SUBMITTED' ? 'Review Submitted' : 'Review In Progress',
        content: `Judge ${r.judge.name} ${r.status === 'SUBMITTED' ? 'completed' : 'started'} evaluation of ${r.team.name} for ${r.round.name}.`,
        track: r.team.track.name,
        timestamp: r.updatedAt,
      });
    });

    questions.forEach((q) => {
      feed.push({
        id: `question-${q.id}`,
        type: 'QUESTION',
        title: `Question Submitted (${q.category})`,
        content: `User ${q.user.name} submitted a question: "${q.title}"`,
        track: q.category,
        timestamp: q.createdAt,
      });
    });

    announcements.forEach((a) => {
      feed.push({
        id: `announcement-${a.id}`,
        type: 'ANNOUNCEMENT',
        title: 'Announcement Published',
        content: `"${a.title}" was published by ${a.author.name}.`,
        track: 'Global',
        timestamp: a.createdAt,
      });
    });

    // Sort: newest first
    feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.json({ activity: feed.slice(0, 15) });
  } catch (error) {
    console.error('Activity fetch error:', error);
    return res.status(500).json({ error: 'Failed to compile activity stream' });
  }
});

// 3. GET /api/dashboard/alerts
router.get('/alerts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trackId = req.query.trackId as string | undefined;
    const alerts: any[] = [];

    // Find the active hackathon
    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.json({ alerts: [] });
    }

    const teamFilter = {
      hackathonId: activeHackathon.id,
      ...(trackId ? { trackId } : {}),
    };

    // Alert 1: Unanswered questions
    const unansweredCount = await prisma.question.count({
      where: {
        hackathonId: activeHackathon.id,
        status: 'OPEN',
        ...(trackId ? {
          user: {
            teamMembers: {
              some: {
                team: { trackId }
              }
            }
          }
        } : {})
      },
    });
    if (unansweredCount > 0) {
      alerts.push({
        id: 'alert-questions',
        type: 'CRITICAL',
        message: `${unansweredCount} support question(s) are currently waiting for a response.`,
        actionLink: '/questions',
        actionLabel: 'View Support Queue',
      });
    }

    // Alert 2: Teams not checked in
    const pendingCheckIn = await prisma.team.count({
      where: {
        ...teamFilter,
        checkedIn: false,
      },
    });
    if (pendingCheckIn > 0) {
      alerts.push({
        id: 'alert-checkin',
        type: 'WARNING',
        message: `${pendingCheckIn} registered team(s) have not checked in to the venue yet.`,
        actionLink: '/checkin',
        actionLabel: 'Manage Check-Ins',
      });
    }

    // Alert 3: Pending reviews warning (Judges who have not completed reviews for active rounds)
    const activeRounds = await prisma.reviewRound.findMany({
      where: { hackathonId: activeHackathon.id, active: true },
    });

    if (activeRounds.length > 0) {
      const activeRoundIds = activeRounds.map(r => r.id);
      const assignments = await prisma.judgeAssignment.findMany({
        where: trackId ? { trackId } : {},
        include: {
          judge: { select: { name: true } },
          team: { select: { name: true } },
        },
      });

      let pendingReviewsCount = 0;
      for (const assign of assignments) {
        for (const roundId of activeRoundIds) {
          const review = await prisma.review.findUnique({
            where: {
              roundId_teamId_judgeId: {
                roundId,
                teamId: assign.teamId,
                judgeId: assign.judgeId,
              },
            },
          });
          if (!review || review.status !== 'SUBMITTED') {
            pendingReviewsCount++;
          }
        }
      }

      if (pendingReviewsCount > 0) {
        alerts.push({
          id: 'alert-pending-reviews',
          type: 'INFO',
          message: `${pendingReviewsCount} review assignment(s) are pending in the active round.`,
          actionLink: '/dashboard',
          actionLabel: 'Monitor Matrix',
        });
      }
    }

    return res.json({ alerts });
  } catch (error) {
    console.error('Alerts fetch error:', error);
    return res.status(500).json({ error: 'Failed to compile operational alerts' });
  }
});

// 4. GET /api/dashboard/review-matrix
router.get('/review-matrix', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trackId = req.query.trackId as string | undefined;

    // Find the active hackathon
    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.json({ rounds: [], matrix: [] });
    }

    // Fetch all rounds for this hackathon
    const rounds = await prisma.reviewRound.findMany({
      where: { hackathonId: activeHackathon.id },
      orderBy: { sequence: 'asc' },
    });

    // Fetch teams
    const teams = await prisma.team.findMany({
      where: {
        hackathonId: activeHackathon.id,
        ...(trackId ? { trackId } : {}),
      },
      include: {
        track: { select: { name: true } },
        judgeAssignments: true,
        reviews: true,
      },
      orderBy: { name: 'asc' },
    });

    // Calculate matrix rows
    const matrix = teams.map((team) => {
      const reviewStatus: Record<string, string> = {};

      const teamJudgesCount = team.judgeAssignments.length;

      rounds.forEach((round) => {
        if (teamJudgesCount === 0) {
          reviewStatus[round.id] = 'Missing';
          return;
        }

        // Get reviews written for this round
        const roundReviews = team.reviews.filter((r) => r.roundId === round.id);
        const submittedCount = roundReviews.filter((r) => r.status === 'SUBMITTED').length;
        const draftCount = roundReviews.filter((r) => r.status === 'DRAFT').length;

        if (submittedCount === teamJudgesCount) {
          reviewStatus[round.id] = 'Completed';
        } else if (submittedCount > 0 || draftCount > 0) {
          reviewStatus[round.id] = 'In Progress';
        } else {
          // If the round is active but not started, or if the team isn't checked in, it is 'Delayed' / 'Waiting'
          if (!team.checkedIn) {
            reviewStatus[round.id] = 'Delayed';
          } else {
            reviewStatus[round.id] = 'Waiting';
          }
        }
      });

      // Overall status logic:
      // - If all active rounds are Completed -> "Completed"
      // - If any round is In Progress -> "In Progress"
      // - If any round is Delayed -> "Delayed"
      // - If no judges assigned -> "Missing"
      // - Else -> "Waiting"
      let overallStatus = 'Waiting';
      if (teamJudgesCount === 0) {
        overallStatus = 'Missing';
      } else {
        const statuses = Object.values(reviewStatus);
        const allCompleted = statuses.every((s) => s === 'Completed');
        const anyInProgress = statuses.some((s) => s === 'In Progress');
        const anyDelayed = statuses.some((s) => s === 'Delayed');

        if (allCompleted) {
          overallStatus = 'Completed';
        } else if (anyInProgress) {
          overallStatus = 'In Progress';
        } else if (anyDelayed) {
          overallStatus = 'Delayed';
        }
      }

      return {
        id: team.id,
        name: team.name,
        track: team.track.name,
        checkedIn: team.checkedIn,
        reviews: reviewStatus,
        overallStatus,
      };
    });

    return res.json({
      rounds: rounds.map(r => ({ id: r.id, name: r.name, active: r.active })),
      matrix,
    });
  } catch (error) {
    console.error('Matrix fetch error:', error);
    return res.status(500).json({ error: 'Failed to compile Review Progress Matrix' });
  }
});

// 5. GET /api/dashboard/judge-assignments
router.get('/judge-assignments', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'JUDGE') {
      return res.status(403).json({ error: 'Access denied: Judge role required' });
    }

    const judgeId = req.user.userId;

    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.json({ stats: { assigned: 0, completed: 0, pending: 0 }, queue: [] });
    }

    const rounds = await prisma.reviewRound.findMany({
      where: { hackathonId: activeHackathon.id },
      orderBy: { sequence: 'asc' },
    });

    const activeRound = rounds.find(r => r.active) || rounds[0] || null;

    const assignments = await prisma.judgeAssignment.findMany({
      where: { judgeId },
      include: {
        team: {
          include: {
            track: { select: { name: true } },
            reviews: {
              where: { judgeId },
              include: { scores: true }
            }
          }
        }
      }
    });

    const queue = assignments.map((assign) => {
      const team = assign.team;

      const roundDetails = rounds.map((r, idx) => {
        const review = team.reviews.find(rev => rev.roundId === r.id);
        const scoreSum = review?.scores?.reduce((acc: number, s: any) => acc + s.score, 0) ?? null;
        return {
          roundId: r.id,
          roundName: r.name || `Round ${idx + 1}`,
          sequence: r.sequence,
          active: r.active,
          status: review ? review.status : 'NOT_STARTED',
          score: scoreSum,
          reviewId: review?.id || null,
        };
      });

      let reviewStatus = 'NOT_STARTED';
      let reviewId = null;
      
      if (activeRound) {
        const activeRoundReview = team.reviews.find(r => r.roundId === activeRound.id);
        if (activeRoundReview) {
          reviewStatus = activeRoundReview.status;
          reviewId = activeRoundReview.id;
        }
      }

      return {
        teamId: team.id,
        teamName: team.name,
        projectTitle: team.projectTitle,
        trackId: team.trackId,
        trackName: team.track.name,
        reviewStatus,
        reviewId,
        roundDetails,
      };
    });

    const totalAssigned = queue.length;
    const completedCount = queue.filter(item => item.reviewStatus === 'SUBMITTED').length;
    const pendingCount = totalAssigned - completedCount;

    return res.json({
      stats: {
        assigned: totalAssigned,
        completed: completedCount,
        pending: pendingCount,
      },
      rounds: rounds.map(r => ({ id: r.id, name: r.name, active: r.active, sequence: r.sequence })),
      queue,
      activeRound: activeRound ? { id: activeRound.id, name: activeRound.name } : null
    });
  } catch (error) {
    console.error('Judge assignments fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch judge assignments' });
  }
});

// 6. GET /api/dashboard/mission-control
router.get('/mission-control', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'ADMINISTRATOR') {
      return res.status(403).json({ error: 'Access denied: Admin required' });
    }

    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
      include: { tracks: true }
    });

    if (!activeHackathon) {
      return res.json({
        topTracks: [],
        currentLeaders: [],
        recentlyChangedRankings: [],
        reviewsInProgress: [],
        avgReviewTimeSeconds: 0,
        judgeStatus: [],
        qrScanActivity: [],
        supportQueue: [],
        attentionPanel: [],
      });
    }

    // 1. Fetch all reviews and teams to compute scores, rankings, and average times
    const teams = await prisma.team.findMany({
      where: { hackathonId: activeHackathon.id },
      include: {
        track: true,
        members: true,
        reviews: {
          include: {
            scores: { include: { criterion: true } },
            judge: { select: { name: true } },
            round: true,
          }
        }
      }
    });

    // Helper: calculate weighted score for a review
    const calculateReviewScore = (review: any) => {
      let weightedSum = 0;
      let maxWeightedSum = 0;
      for (const score of review.scores) {
        weightedSum += score.score * score.criterion.weight;
        maxWeightedSum += score.criterion.maxMarks * score.criterion.weight;
      }
      return maxWeightedSum > 0 ? (weightedSum / maxWeightedSum) * 100 : 0;
    };

    // Calculate team scores
    const teamScores = teams.map(team => {
      const submittedReviews = team.reviews.filter(r => r.status === 'SUBMITTED');
      let score = 0;
      if (submittedReviews.length > 0) {
        const sumScores = submittedReviews.reduce((acc, r) => acc + calculateReviewScore(r), 0);
        score = Number((sumScores / submittedReviews.length).toFixed(2));
      }
      return {
        id: team.id,
        name: team.name,
        trackId: team.trackId,
        trackName: team.track.name,
        score,
        reviewsCount: submittedReviews.length,
        projectTitle: team.projectTitle || 'N/A'
      };
    });

    // Calculate rank per track (for leaders and track averages)
    const trackGrouped = new Map<string, typeof teamScores>();
    teamScores.forEach(ts => {
      if (!trackGrouped.has(ts.trackId)) {
        trackGrouped.set(ts.trackId, []);
      }
      trackGrouped.get(ts.trackId)!.push(ts);
    });

    const currentLeaders: any[] = [];
    const topTracks: any[] = [];

    trackGrouped.forEach((tsList, trackId) => {
      // Sort teams descending by score
      tsList.sort((a, b) => b.score - a.score);
      const trackName = tsList[0]?.trackName || 'Track';
      
      // Leader is the top team
      if (tsList.length > 0) {
        currentLeaders.push({
          trackId,
          trackName,
          teamName: tsList[0].name,
          score: tsList[0].score,
          projectTitle: tsList[0].projectTitle
        });
      }

      // Track average score
      const avgTrackScore = tsList.reduce((acc, team) => acc + team.score, 0) / tsList.length;
      topTracks.push({
        trackId,
        trackName,
        averageScore: Number(avgTrackScore.toFixed(2)),
        teamsCount: tsList.length
      });
    });

    topTracks.sort((a, b) => b.averageScore - a.averageScore);

    // 2. Reviews In Progress & Average Review Time
    const allReviews = teams.flatMap(t => t.reviews.map(r => ({ ...r, teamName: t.name, trackName: t.track.name })));
    const submittedReviews = allReviews.filter(r => r.status === 'SUBMITTED');
    const draftReviews = allReviews.filter(r => r.status === 'DRAFT');

    const totalSubmitted = submittedReviews.length;
    const totalDuration = submittedReviews.reduce((acc, r) => acc + (r.actualDuration || 0), 0);
    const avgReviewTimeSeconds = totalSubmitted > 0 ? totalDuration / totalSubmitted : 0;

    const overdueCount = allReviews.filter(r => {
      if (r.status === 'SUBMITTED') {
        return (r.actualDuration || 0) > (r.round.duration || 600);
      } else {
        const elapsed = (Date.now() - new Date(r.updatedAt).getTime()) / 1000;
        return elapsed > (r.round.duration || 600);
      }
    }).length;

    const reviewsInProgress = draftReviews.map(r => {
      const elapsed = Math.round((Date.now() - new Date(r.updatedAt).getTime()) / 1000);
      const remaining = Math.max(0, (r.round.duration || 600) - elapsed);
      return {
        id: r.id,
        teamName: r.teamName,
        trackName: r.trackName,
        judgeName: r.judge.name,
        roundName: r.round.name,
        elapsed,
        remaining,
        duration: r.round.duration || 600,
      };
    });

    // 3. Recently Changed Rankings
    const recentlyChangedRankings = submittedReviews
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        teamName: r.teamName,
        trackName: r.trackName,
        judgeName: r.judge.name,
        roundName: r.round.name,
        timestamp: r.updatedAt,
      }));

    // 4. Judge Status
    const judges = await prisma.user.findMany({
      where: { roleId: 'JUDGE' },
      select: {
        id: true,
        name: true,
        email: true,
        judgeStatus: true,
        avgReviewTime: true,
        currentTeamId: true,
      }
    });

    const judgeStatus = await Promise.all(judges.map(async j => {
      let currentTeamName = null;
      if (j.currentTeamId) {
        const t = await prisma.team.findUnique({ where: { id: j.currentTeamId }, select: { name: true } });
        currentTeamName = t?.name || null;
      }
      return {
        ...j,
        currentTeamName
      };
    }));

    // 5. QR Scan Activity
    const qrLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: ['QR_SCAN_SUCCESS', 'UNAUTHORIZED_SCAN', 'REVIEW_STARTED']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const qrScanActivity = await Promise.all(qrLogs.map(async log => {
      let judgeName = 'Unknown Judge';
      if (log.userId) {
        const u = await prisma.user.findUnique({ where: { id: log.userId }, select: { name: true } });
        judgeName = u?.name || 'Unknown Judge';
      }
      return {
        id: log.id,
        timestamp: log.createdAt,
        judgeName,
        details: log.details
      };
    }));

    // 6. Support Queue
    const supportQueue = await prisma.question.findMany({
      where: { status: { in: ['Open', 'Assigned', 'In Progress'] } },
      include: {
        user: { select: { name: true } },
        assignedTo: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 7. Attention Panel
    const attentionPanel: any[] = [];
    const criticalQuestions = supportQueue.filter(q => q.priority === 'CRITICAL' || q.priority === 'HIGH').length;
    if (criticalQuestions > 0) {
      attentionPanel.push({
        type: 'CRITICAL',
        message: `${criticalQuestions} high-priority support question(s) require immediate attention.`
      });
    }

    if (overdueCount > 0) {
      attentionPanel.push({
        type: 'WARNING',
        message: `${overdueCount} review(s) have exceeded their scheduled time limit.`
      });
    }

    const pendingCheckIn = teams.filter(t => !t.checkedIn).length;
    if (pendingCheckIn > 0) {
      attentionPanel.push({
        type: 'INFO',
        message: `${pendingCheckIn} team(s) have not checked in yet.`
      });
    }

    return res.json({
      topTracks,
      currentLeaders,
      recentlyChangedRankings,
      reviewsInProgress,
      avgReviewTimeSeconds: Math.round(avgReviewTimeSeconds),
      judgeStatus,
      qrScanActivity,
      supportQueue,
      attentionPanel,
    });
  } catch (error) {
    console.error('Mission control error:', error);
    return res.status(500).json({ error: 'Failed to retrieve mission control operational data.' });
  }
});

export default router;
