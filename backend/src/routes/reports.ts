import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { generateExcelWorkbook, streamPdfReport, generateCsvReport, formatTimestamp, sanitizeCell, ExportSheetDef } from '../utils/exportEngine';
import { calculateTeamScoresFromRounds } from '../services/scoring';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';

const router = Router();

// Formula injection protection helper
function sanitizeCsvCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

// 1. GET /api/reports/summary - Overall Event Summary Metrics
router.get('/summary', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teamsRegistered = await prisma.team.count();
    const teamsCheckedIn = await prisma.team.count({ where: { checkedIn: true } });
    const reviewsCompleted = await prisma.review.count({ where: { status: 'SUBMITTED' } });
    const questionsAnswered = await prisma.question.count({ where: { status: { in: ['Resolved', 'Closed'] } } });
    const announcementsPublished = await prisma.announcement.count({ where: { status: 'PUBLISHED' } });

    // Judge utilization: % of judges currently assigned to at least 1 team
    const totalJudges = await prisma.user.count({ where: { roleId: 'JUDGE' } });
    const busyJudges = await prisma.user.count({
      where: {
        roleId: 'JUDGE',
        judgeAssignments: { some: {} }
      }
    });
    const judgeUtilization = totalJudges > 0 ? Math.round((busyJudges / totalJudges) * 100) : 0;

    // Average Review time
    const judgesList = await prisma.user.findMany({
      where: { roleId: 'JUDGE' },
      select: { avgReviewTime: true }
    });
    const validTimes = judgesList.map(j => j.avgReviewTime).filter(t => t > 0);
    const avgReviewTime = validTimes.length > 0 ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length) : 15;

    // Track completion rates
    const tracks = await prisma.track.findMany({
      include: {
        teams: {
          include: {
            reviews: { where: { status: 'SUBMITTED' } },
            judgeAssignments: true,
          }
        }
      }
    });

    const trackCompletion = tracks.map(t => {
      let completedReviews = 0;
      let pendingReviews = 0;

      t.teams.forEach(team => {
        completedReviews += team.reviews.length;
        pendingReviews += team.judgeAssignments.length;
      });

      const totalReviews = completedReviews + pendingReviews;
      const completionRate = totalReviews > 0 ? Math.round((completedReviews / totalReviews) * 100) : 100;

      return {
        trackName: t.name,
        completedReviews,
        pendingReviews,
        completionRate,
      };
    });

    return res.json({
      summary: {
        teamsRegistered,
        teamsCheckedIn,
        reviewsCompleted,
        questionsAnswered,
        announcementsPublished,
        judgeUtilization,
        avgReviewTime,
        trackCompletion,
      }
    });
  } catch (error) {
    console.error('Summary report error:', error);
    return res.status(500).json({ error: 'Failed to fetch event summary report' });
  }
});

// 2. GET /api/reports/evaluations - Evaluations details list
router.get('/evaluations', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trackId } = req.query;

    const whereClause: any = {};
    if (trackId) whereClause.trackId = String(trackId);

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        track: { select: { name: true } },
        reviews: {
          where: { status: 'SUBMITTED' },
          include: {
            scores: {
              include: {
                criterion: { select: { name: true, maxMarks: true } }
              }
            },
            judge: { select: { name: true } }
          }
        }
      }
    });

    const list = teams.map(t => {
      let totalScoreSum = 0;
      const scoresBreakdown: Record<string, number> = {};
      const comments: string[] = [];

      t.reviews.forEach(rev => {
        if (rev.comments) comments.push(rev.comments);
        rev.scores.forEach(s => {
          totalScoreSum += s.score;
          const critName = s.criterion.name;
          if (!scoresBreakdown[critName]) scoresBreakdown[critName] = 0;
          scoresBreakdown[critName] += s.score;
        });
      });

      const judgeCount = t.reviews.length;
      // Average score across judges
      const finalScore = judgeCount > 0 ? Math.round((totalScoreSum / judgeCount) * 10) / 10 : 0;

      // Average breakdown
      Object.keys(scoresBreakdown).forEach(k => {
        scoresBreakdown[k] = Math.round((scoresBreakdown[k] / judgeCount) * 10) / 10;
      });

      return {
        teamId: t.id,
        teamName: t.name,
        trackName: t.track.name,
        judgeCount,
        scoresBreakdown,
        finalScore,
        comments,
      };
    });

    return res.json({ evaluations: list });
  } catch (error) {
    console.error('Evaluations report error:', error);
    return res.status(500).json({ error: 'Failed to compile evaluations report' });
  }
});

// 3. GET /api/reports/attendance - Attendance roster details list
router.get('/attendance', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trackId } = req.query;

    const whereClause: any = {};
    if (trackId) whereClause.trackId = String(trackId);

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        track: { select: { name: true } },
        members: {
          orderBy: { role: 'asc' }
        },
      },
      orderBy: { registrationId: 'asc' }
    });

    const list = teams.map(t => {
      const leader = t.members.find(m => m.role === 'LEADER') || t.members[0];
      const code = t.teamCode || t.registrationId || t.id;

      return {
        teamId: t.id,
        registrationId: t.registrationId || `REG-${t.id.slice(0, 4)}`,
        teamName: t.name,
        domain: t.domain || t.track?.name || 'General',
        trackName: t.track?.name || 'General',
        college: t.college || t.collegeName || 'Not specified',
        checkedIn: t.checkedIn,
        checkInTime: t.checkInTime,
        checkedInBy: t.checkedInBy || 'Desk Staff',
        teamCode: code,
        leadName: leader?.name || t.leadName || 'N/A',
        leadEmail: leader?.email || t.leadEmail || 'N/A',
        leadMobile: leader?.phone || t.leadMobile || 'N/A',
        leadUsn: t.leadUsn || 'N/A',
        membersCount: t.members.length,
        members: t.members.map(m => ({
          id: m.id,
          name: m.name,
          role: m.role,
          email: m.email || 'N/A',
          phone: m.phone || 'N/A',
        })),
        membersList: t.members.map(m => `${m.name} (${m.role})`).join(', '),
        status: t.checkedIn ? 'Checked In' : 'Pending Check-In',
      };
    });

    const totalTeams = list.length;
    const checkedInCount = list.filter(t => t.checkedIn).length;
    const pendingCount = list.filter(t => !t.checkedIn).length;
    const checkInPercentage = totalTeams > 0 ? Number(((checkedInCount / totalTeams) * 100).toFixed(1)) : 0;

    return res.json({
      summary: {
        totalTeams,
        checkedInCount,
        pendingCount,
        checkInPercentage,
      },
      attendance: list,
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    return res.status(500).json({ error: 'Failed to compile attendance report' });
  }
});

// 4. GET /api/reports/judges - Judge performance and workload report
router.get('/judges', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const judges = await prisma.user.findMany({
      where: { roleId: 'JUDGE' },
      include: {
        judgeAssignments: true,
        judgeReviews: {
          where: { status: 'SUBMITTED' },
          include: {
            scores: true
          }
        }
      }
    });

    const list = judges.map(j => {
      const completedCount = j.judgeReviews.length;
      const pendingCount = j.judgeAssignments.length;
      const assignedCount = completedCount + pendingCount;

      let totalScoreSum = 0;
      let scoresCount = 0;

      j.judgeReviews.forEach(rev => {
        rev.scores.forEach(s => {
          totalScoreSum += s.score;
          scoresCount += 1;
        });
      });

      const avgScoreGiven = scoresCount > 0 ? Math.round((totalScoreSum / scoresCount) * 10) / 10 : 0;
      const isImbalanced = pendingCount > 4; // flag judge workload warning

      return {
        judgeId: j.id,
        judgeName: j.name,
        assignedCount,
        completedCount,
        pendingCount,
        avgDuration: j.avgReviewTime || 15,
        avgScoreGiven,
        isImbalanced,
      };
    });

    return res.json({ judges: list });
  } catch (error) {
    console.error('Judges performance report error:', error);
    return res.status(500).json({ error: 'Failed to compile judge performance report' });
  }
});

// 5. GET /api/reports/support - Live Support Tickets SLA Report
router.get('/support', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const questions = await prisma.question.findMany({
      include: {
        user: {
          include: {
            teamMembers: {
              include: {
                team: true
              }
            }
          }
        },
        replies: true
      }
    });

    const tracks = await prisma.track.findMany();

    const list = tracks.map(t => {
      let technicalCount = 0;
      let organizationalCount = 0;
      let totalResolutionTime = 0;
      let resolvedCount = 0;
      let overdueCount = 0;

      // Filter questions matching this track
      const trackQuestions = questions.filter(q => {
        const team = q.user.teamMembers[0]?.team;
        return team?.trackId === t.id;
      });

      trackQuestions.forEach(q => {
        if (q.category === 'TECHNICAL') technicalCount += 1;
        else organizationalCount += 1;

        if (q.status === 'Resolved' || q.status === 'Closed') {
          const resTime = new Date(q.updatedAt).getTime() - new Date(q.createdAt).getTime();
          totalResolutionTime += Math.floor(resTime / 60000); // in minutes
          resolvedCount += 1;
        }

        // SLA calculation: Overdue if Open/Assigned for >15m with no reply
        const ageMins = Math.floor((Date.now() - new Date(q.createdAt).getTime()) / 60000);
        if (q.replies.length === 0 && ageMins > 15 && ['Open', 'Assigned', 'In Progress'].includes(q.status)) {
          overdueCount += 1;
        }
      });

      const avgResolutionTime = resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0;

      return {
        trackId: t.id,
        trackName: t.name,
        technicalCount,
        organizationalCount,
        resolvedCount,
        avgResolutionTime,
        overdueCount,
      };
    });

    return res.json({ support: list });
  } catch (error) {
    console.error('Support report error:', error);
    return res.status(500).json({ error: 'Failed to compile support metrics report' });
  }
});

// 6. GET /api/reports/announcements - Announcements Reach Report
router.get('/announcements', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentCount = await prisma.user.count({ where: { roleId: 'STUDENT' } });
    const judgeCount = await prisma.user.count({ where: { roleId: 'JUDGE' } });
    const adminCount = await prisma.user.count({ where: { roleId: 'ADMINISTRATOR' } });

    const announcements = await prisma.announcement.findMany({
      include: {
        track: { select: { name: true } },
        receipts: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    const list = announcements.map(a => {
      let totalRecipients = studentCount + judgeCount + adminCount;
      if (a.targetAudience === 'STUDENTS') totalRecipients = studentCount;
      else if (a.targetAudience === 'JUDGES') totalRecipients = judgeCount;
      else if (a.targetAudience === 'ADMINS') totalRecipients = adminCount;

      const readCount = a.receipts.filter(r => r.status === 'READ' || r.status === 'ACKNOWLEDGED').length;
      const ackCount = a.receipts.filter(r => r.status === 'ACKNOWLEDGED').length;

      const readPercentage = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;
      const ackPercentage = totalRecipients > 0 ? Math.round((ackCount / totalRecipients) * 100) : 0;

      return {
        id: a.id,
        title: a.title,
        targetAudience: a.targetAudience,
        trackName: a.track?.name || 'All Tracks',
        readPercentage,
        ackPercentage,
        publishTime: a.publishAt,
      };
    });

    return res.json({ announcements: list });
  } catch (error) {
    console.error('Announcements reach report error:', error);
    return res.status(500).json({ error: 'Failed to compile announcements report' });
  }
});

// 7. GET /api/reports/rankings - Admin-only Rankings Standings (calculates overall and track standings)
router.get('/rankings', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rounds = await prisma.reviewRound.findMany({
      orderBy: { sequence: 'asc' }
    });

    const teams = await prisma.team.findMany({
      include: {
        track: { select: { name: true } },
        reviews: {
          where: { status: 'SUBMITTED' },
          include: { scores: true }
        }
      }
    });

    // Compile per-round average scores using Canonical Scoring Engine
    const compiled = teams.map(t => {
      const summary = calculateTeamScoresFromRounds(rounds, t.reviews);

      return {
        teamId: t.id,
        teamName: t.name,
        trackId: t.trackId,
        trackName: t.track.name,
        round1Average: summary.r1Avg,
        round2Average: summary.r2Avg,
        round3Average: summary.r3Avg,
        finalScore: summary.totalScore,
        judgeCount: t.reviews.length,
        locked: t.locked,
      };
    });

    // Sort descending by score
    const sortedOverall = [...compiled].sort((a, b) => b.finalScore - a.finalScore);

    // Apply ranking index (handling ties)
    let currentRank = 1;
    const rankedOverall = sortedOverall.map((t, idx) => {
      if (idx > 0 && t.finalScore < sortedOverall[idx - 1].finalScore) {
        currentRank = idx + 1;
      }
      return {
        ...t,
        rank: currentRank,
      };
    });

    return res.json({ rankings: rankedOverall });
  } catch (error) {
    console.error('Rankings standings error:', error);
    return res.status(500).json({ error: 'Failed to compile standings' });
  }
});

// 8. POST /api/reports/rankings/lock - Lock/Unlock Standings results
router.post('/rankings/lock', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lock } = req.body; // true or false

    const teams = await prisma.team.findMany();
    await prisma.$transaction(
      teams.map(t => prisma.team.update({
        where: { id: t.id },
        data: { locked: lock }
      }))
    );

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'RESULTS_LOCK_TOGGLE',
        details: `${lock ? 'Locked' : 'Unlocked'} final ranking results for all teams.`,
      }
    });

    return res.json({ success: true, locked: lock });
  } catch (error) {
    console.error('Lock rankings error:', error);
    return res.status(500).json({ error: 'Failed to toggle lock status' });
  }
});

// 8.5 POST /api/reports/reset - Admin Reset All Simulated Operational Data
router.post('/reset', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.eventFeedback.deleteMany({});
    await prisma.studentFeedback.deleteMany({});
    await prisma.juryFeedback.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.announcementReceipt.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.questionReply.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.reviewScore.deleteMany({});
    await prisma.reviewOverride.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.evaluationClaim.deleteMany({});
    await prisma.judgeAssignment.deleteMany({});
    await prisma.teamSubmission.deleteMany({});
    await prisma.auditLog.deleteMany({});

    await prisma.team.updateMany({
      data: {
        checkedIn: false,
        checkInTime: null,
        checkedInBy: null,
        checkInStatus: 'PENDING',
        status: 'Registered',
        teamCode: null,
        qrCode: null,
        qrGeneratedAt: null,
        locked: false,
      },
    });

    await prisma.user.updateMany({
      where: { roleId: 'JUDGE' },
      data: {
        judgeStatus: 'Available',
        avgReviewTime: 0.0,
        currentTeamId: null,
        nextTeamId: null,
      },
    });

    await prisma.track.updateMany({
      data: {
        resultsLocked: false,
        frozenLeaderboard: null,
      },
    });

    await prisma.reviewRound.updateMany({
      data: {
        active: false,
        locked: false,
      },
    });

    const round1 = await prisma.reviewRound.findFirst({
      where: { sequence: 1 },
    });

    if (round1) {
      await prisma.reviewRound.update({
        where: { id: round1.id },
        data: { active: true },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        actorRole: 'ADMINISTRATOR',
        action: 'SYSTEM_RESET',
        details: 'Admin triggered full operational data reset.',
      },
    });

    return res.json({ success: true, message: 'All operational data (check-ins, reviews, scores, feedback, tickets) reset successfully.' });
  } catch (error) {
    console.error('Reset operational data error:', error);
    return res.status(500).json({ error: 'Failed to reset operational data' });
  }
});

// 9. GET /api/reports/payments - Payment Status Report
router.get('/payments', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        registrationId: true,
        name: true,
        collegeName: true,
        college: true,
        domain: true,
        leadName: true,
        leadEmail: true,
        paymentStatusFinal: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const paidCount = teams.filter((t) => t.paymentStatusFinal === 'PAID').length;
    const pendingCount = teams.length - paidCount;

    return res.json({
      summary: {
        totalTeams: teams.length,
        paidTeams: paidCount,
        pendingTeams: pendingCount,
        paymentRate: teams.length > 0 ? Math.round((paidCount / teams.length) * 100) : 0,
      },
      teams,
    });
  } catch (error) {
    console.error('Payment report error:', error);
    return res.status(500).json({ error: 'Failed to generate payment report' });
  }
});

// 10. GET /api/reports/domains - Domain Summary Report
router.get('/domains', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        track: { select: { name: true } },
        members: true,
      },
    });

    const domainMap: Record<string, { domain: string; teamsCount: number; participantsCount: number; checkedInCount: number; paidCount: number }> = {};

    teams.forEach((t) => {
      const d = t.domain || t.track.name || 'Other';
      if (!domainMap[d]) {
        domainMap[d] = {
          domain: d,
          teamsCount: 0,
          participantsCount: 0,
          checkedInCount: 0,
          paidCount: 0,
        };
      }

      domainMap[d].teamsCount += 1;
      domainMap[d].participantsCount += (t.members.length || 1);
      if (t.checkedIn) domainMap[d].checkedInCount += 1;
      if (t.paymentStatusFinal === 'PAID') domainMap[d].paidCount += 1;
    });

    const list = Object.values(domainMap).sort((a, b) => b.teamsCount - a.teamsCount);

    return res.json({ domains: list });
  } catch (error) {
    console.error('Domain report error:', error);
    return res.status(500).json({ error: 'Failed to generate domain summary report' });
  }
});

// 11. GET /api/reports/colleges - College Summary Report
router.get('/colleges', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: { members: true },
    });

    const collegeMap: Record<string, { collegeName: string; teamsCount: number; participantsCount: number; paidCount: number }> = {};

    teams.forEach((t) => {
      const c = t.collegeName || t.college || 'Unspecified College';
      if (!collegeMap[c]) {
        collegeMap[c] = {
          collegeName: c,
          teamsCount: 0,
          participantsCount: 0,
          paidCount: 0,
        };
      }

      collegeMap[c].teamsCount += 1;
      collegeMap[c].participantsCount += (t.members.length || 1);
      if (t.paymentStatusFinal === 'PAID') collegeMap[c].paidCount += 1;
    });

    const list = Object.values(collegeMap).sort((a, b) => b.teamsCount - a.teamsCount);

    return res.json({ colleges: list, totalColleges: list.length });
  } catch (error) {
    console.error('College report error:', error);
    return res.status(500).json({ error: 'Failed to generate college summary report' });
  }
});

// 12. GET /api/reports/marksheet - Theme-Wise Final Marksheet Report
router.get('/marksheet', authenticateToken, requireRole(['ADMINISTRATOR', 'JUDGE']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trackId } = req.query;

    const rounds = await prisma.reviewRound.findMany({
      orderBy: { sequence: 'asc' },
    });

    const whereClause: any = {};
    if (trackId) whereClause.trackId = String(trackId);

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        track: { select: { name: true } },
        reviews: {
          where: { status: 'SUBMITTED' },
          include: {
            round: true,
            scores: {
              include: {
                criterion: true,
              },
            },
            judge: { select: { name: true } },
          },
        },
      },
    });

    // Map each team to detailed review scores using Canonical Scoring Engine
    const teamMarks = teams.map((team) => {
      const themeName = team.track?.name || team.domain || 'General Theme';
      const summary = calculateTeamScoresFromRounds(rounds, team.reviews);

      const comments: string[] = [];
      team.reviews.forEach((rev) => {
        if (rev.comments) comments.push(rev.comments);
      });

      return {
        teamId: team.id,
        registrationId: team.registrationId || team.teamCode || `#REG-${team.id.substring(0, 5).toUpperCase()}`,
        teamName: team.name,
        college: team.collegeName || team.college || 'Unspecified Institution',
        domain: themeName,
        trackName: themeName,
        selectedPsId: team.selectedPsId || 'N/A',
        problemStatementTitle: team.problemStatement || 'N/A',
        leadName: team.leadName || 'N/A',
        leadEmail: team.leadEmail || 'N/A',
        review1Score: summary.r1Avg,
        review2Score: summary.r2Avg,
        review3Score: summary.r3Avg,
        totalScore: summary.totalScore,
        completedReviewsCount: summary.completedRoundsCount,
        status: summary.status,
        comments,
      };
    });

    // Group by Theme / Track
    const themeGroupMap: Record<string, any> = {};

    teamMarks.forEach((t) => {
      const themeKey = t.trackName;
      if (!themeGroupMap[themeKey]) {
        themeGroupMap[themeKey] = {
          themeId: themeKey,
          themeName: themeKey,
          psId: themeKey,
          psTitle: `${themeKey} Theme`,
          domain: themeKey,
          teamsCount: 0,
          completedCount: 0,
          teams: [],
        };
      }

      themeGroupMap[themeKey].teamsCount += 1;
      if (t.completedReviewsCount === 3) themeGroupMap[themeKey].completedCount += 1;
      themeGroupMap[themeKey].teams.push(t);
    });

    // Sort teams within each theme by totalScore descending and assign rank
    Object.values(themeGroupMap).forEach((group: any) => {
      group.teams.sort((a: any, b: any) => b.totalScore - a.totalScore);
      let rank = 1;
      group.teams.forEach((t: any, idx: number) => {
        if (idx > 0 && t.totalScore < group.teams[idx - 1].totalScore) {
          rank = idx + 1;
        }
        t.rank = rank;
      });
    });

    const themes = Object.values(themeGroupMap).sort((a: any, b: any) => b.teamsCount - a.teamsCount);

    const totalTeams = teamMarks.length;
    const completedAllReviewsCount = teamMarks.filter((t) => t.completedReviewsCount === 3).length;
    const inProgressCount = teamMarks.filter((t) => t.completedReviewsCount > 0 && t.completedReviewsCount < 3).length;
    const pendingCount = teamMarks.filter((t) => t.completedReviewsCount === 0).length;

    return res.json({
      themes,
      problemStatements: themes, // Backward compatibility alias
      summary: {
        totalTeams,
        totalThemes: themes.length,
        totalProblemStatements: themes.length,
        completedAllReviewsCount,
        inProgressCount,
        pendingCount,
      },
      rounds: rounds.map((r) => ({ id: r.id, name: r.name, sequence: r.sequence })),
    });
  } catch (error) {
    console.error('Marksheet report error:', error);
    return res.status(500).json({ error: 'Failed to generate theme marksheets' });
  }
});

// 13. GET /api/reports/marksheet/export - Export Professional Evaluation & Marksheet Report
router.get('/marksheet/export', authenticateToken, requireRole(['ADMINISTRATOR', 'JUDGE']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trackId } = req.query;
    const format = (req.query.format as string || 'xlsx').toLowerCase();

    const rounds = await prisma.reviewRound.findMany({
      orderBy: { sequence: 'asc' },
    });

    const whereClause: any = {};
    if (trackId) whereClause.trackId = String(trackId);

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        track: { select: { name: true } },
        reviews: {
          where: { status: 'SUBMITTED' },
          include: {
            round: true,
            scores: {
              include: {
                criterion: true,
              },
            },
            judge: { select: { name: true } },
          },
        },
      },
      orderBy: { registrationId: 'asc' },
    });

    // SHEET 1: OVERALL RESULTS
    const overallHeaders = ['Rank', 'Team ID', 'Team Code', 'Team Name', 'Track', 'Round 1 Avg (/100)', 'Round 2 Avg (/100)', 'Round 3 Avg (/100)', 'Final Score (/300)', 'Evaluation Status'];
    const overallRowsList: any[][] = [];

    // SHEET 2: CRITERION SCORES
    const criterionHeaders = ['Team ID', 'Team Name', 'Track', 'Judge Name', 'Round', 'Criterion', 'Score', 'Max Marks', 'Feedback / Comments'];
    const criterionRowsList: any[][] = [];

    // SHEET 3: JUDGE EVALUATIONS (Grouped by Judge)
    const judgeHeaders = ['Judge Name', 'Team ID', 'Team Name', 'Track', 'Round', 'Total Score (/100)', 'Comments'];
    const judgeRowsList: any[][] = [];

    // SHEET 4: TEAM EVALUATIONS (Grouped by Team)
    const teamEvalHeaders = ['Team ID', 'Team Name', 'Track', 'Round', 'Judge Name', 'Total Score (/100)', 'Comments'];
    const teamEvalRowsList: any[][] = [];

    const compiledTeams = teams.map((team) => {
      const summary = calculateTeamScoresFromRounds(rounds, team.reviews);

      team.reviews.forEach((rev) => {
        const revTotal = rev.scores.reduce((sum, s) => sum + s.score, 0);

        // Populate Sheet 3 & 4
        const judgeName = rev.judge?.name || 'Judge';
        const roundName = rev.round?.name || 'Round';

        judgeRowsList.push([
          judgeName,
          team.registrationId || team.id.substring(0, 8).toUpperCase(),
          team.name,
          team.track?.name || 'General',
          roundName,
          revTotal,
          rev.comments || 'No comments',
        ]);

        teamEvalRowsList.push([
          team.registrationId || team.id.substring(0, 8).toUpperCase(),
          team.name,
          team.track?.name || 'General',
          roundName,
          judgeName,
          revTotal,
          rev.comments || 'No comments',
        ]);

        // Populate Sheet 2 Criterion Scores
        rev.scores.forEach(scoreItem => {
          criterionRowsList.push([
            team.registrationId || team.id.substring(0, 8).toUpperCase(),
            team.name,
            team.track?.name || 'General',
            judgeName,
            roundName,
            scoreItem.criterion?.name || 'Criterion',
            scoreItem.score,
            scoreItem.criterion?.maxMarks || 10,
            rev.comments || 'N/A',
          ]);
        });
      });

      return {
        teamId: team.id,
        regId: team.registrationId || team.id.substring(0, 8).toUpperCase(),
        teamCode: team.teamCode || 'N/A',
        name: team.name,
        trackName: team.track?.name || 'General',
        avgR1: summary.r1Avg,
        avgR2: summary.r2Avg,
        avgR3: summary.r3Avg,
        finalScore: summary.totalScore,
        status: summary.status,
      };
    });

    // Sort descending by finalScore to assign official ranks
    compiledTeams.sort((a, b) => b.finalScore - a.finalScore);

    let currentRank = 1;
    compiledTeams.forEach((t, idx) => {
      if (idx > 0 && t.finalScore < compiledTeams[idx - 1].finalScore) {
        currentRank = idx + 1;
      }

      overallRowsList.push([
        currentRank,
        t.regId,
        t.teamCode,
        t.name,
        t.trackName,
        t.avgR1,
        t.avgR2,
        t.avgR3,
        t.finalScore,
        t.status,
      ]);
    });

    if (format === 'xlsx') {
      const sheets: ExportSheetDef[] = [
        {
          sheetName: 'OVERALL RESULTS',
          reportTitle: 'Smart Horizon 2026 — Overall Evaluation Standings',
          summaryStats: [
            { label: 'Evaluated Teams', value: compiledTeams.length },
            { label: 'Completed (3/3)', value: compiledTeams.filter(t => t.status.startsWith('Completed')).length },
            { label: 'In Progress', value: compiledTeams.filter(t => t.status.startsWith('In Progress')).length },
          ],
          headers: overallHeaders,
          rows: overallRowsList,
        },
        {
          sheetName: 'CRITERION SCORES',
          reportTitle: 'Smart Horizon 2026 — Detailed Criterion Marks Breakdown',
          headers: criterionHeaders,
          rows: criterionRowsList,
        },
        {
          sheetName: 'JUDGE EVALUATIONS',
          reportTitle: 'Smart Horizon 2026 — Evaluation Roster Grouped by Judge',
          headers: judgeHeaders,
          rows: judgeRowsList,
        },
        {
          sheetName: 'TEAM EVALUATIONS',
          reportTitle: 'Smart Horizon 2026 — Evaluation Roster Grouped by Team',
          headers: teamEvalHeaders,
          rows: teamEvalRowsList,
        },
      ];

      const buffer = generateExcelWorkbook(sheets);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Evaluations.xlsx"');
      return res.send(buffer);
    } else if (format === 'pdf') {
      return await streamPdfReport(res, 'SmartHorizon2026_Evaluations.pdf', {
        reportTitle: 'Smart Horizon 2026 — Official Evaluation Marksheet Report',
        summaryStats: [
          { label: 'Total Evaluated Teams', value: compiledTeams.length },
          { label: 'Fully Completed', value: compiledTeams.filter(t => t.status.startsWith('Completed')).length },
        ],
        headers: overallHeaders,
        rows: overallRowsList.map(r => r.map(String)),
        orientation: 'landscape',
      });
    } else {
      const csvStr = generateCsvReport(overallHeaders, overallRowsList.map(r => r.map(String)));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Evaluations.csv"');
      return res.send(csvStr);
    }
  } catch (error) {
    console.error('Export marksheet error:', error);
    return res.status(500).json({ error: 'Failed to export theme marksheets' });
  }
});

// 14. GET /api/reports/teams/export - Export Professional Teams Report
router.get('/teams/export', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const format = (req.query.format as string || 'xlsx').toLowerCase();

    const teams = await prisma.team.findMany({
      include: {
        track: { select: { name: true } },
        members: true,
        projectSubmission: true,
        reviews: { where: { status: 'SUBMITTED' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const summaryHeaders = ['Sl. No.', 'Team ID', 'Registration ID', 'Team Code', 'Team Name', 'Track / Domain', 'Leader Name', 'Leader Email', 'Submission Status', 'Evaluation Status', 'Payment Status', 'Check-In Status'];
    const summaryRows: any[][] = [];

    const memberHeaders = ['Team ID', 'Team Code', 'Team Name', 'Member Name', 'Email', 'Phone', 'Role', 'USN', 'College'];
    const memberRows: any[][] = [];

    let slNo = 1;
    teams.forEach(team => {
      const leader = team.members.find(m => m.role === 'LEADER') || team.members[0];
      const subStatus = team.projectSubmission ? 'SUBMITTED' : 'PENDING';
      const evalStatus = team.reviews.length >= 3 ? 'COMPLETED (3/3)' : team.reviews.length > 0 ? `IN_PROGRESS (${team.reviews.length}/3)` : 'PENDING';

      summaryRows.push([
        slNo++,
        team.registrationId || team.id.substring(0, 8).toUpperCase(),
        team.registrationId || 'N/A',
        team.teamCode || 'N/A',
        team.name,
        team.track?.name || 'General',
        team.leadName || leader?.name || 'N/A',
        team.leadEmail || leader?.email || 'N/A',
        subStatus,
        evalStatus,
        team.paymentStatusFinal || 'PENDING',
        team.checkInStatus || (team.checkedIn ? 'CHECKED_IN' : 'PENDING'),
      ]);

      team.members.forEach(member => {
        memberRows.push([
          team.registrationId || team.id.substring(0, 8).toUpperCase(),
          team.teamCode || 'N/A',
          team.name,
          member.name,
          member.email || 'N/A',
          member.phone || 'N/A',
          member.role || 'MEMBER',
          member.role === 'LEADER' ? (team.leadUsn || 'N/A') : 'N/A',
          team.collegeName || team.college || 'Unspecified Institution',
        ]);
      });
    });

    if (format === 'xlsx') {
      const sheets: ExportSheetDef[] = [
        {
          sheetName: 'TEAM SUMMARY',
          reportTitle: 'Smart Horizon 2026 — Registered Teams Master Roster',
          summaryStats: [
            { label: 'Total Teams', value: teams.length },
            { label: 'Checked In', value: teams.filter(t => t.checkedIn).length },
            { label: 'Submissions Received', value: teams.filter(t => !!t.projectSubmission).length },
          ],
          headers: summaryHeaders,
          rows: summaryRows,
        },
        {
          sheetName: 'TEAM MEMBERS',
          reportTitle: 'Smart Horizon 2026 — Team Members Roster',
          headers: memberHeaders,
          rows: memberRows,
        },
      ];

      const buffer = generateExcelWorkbook(sheets);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Teams.xlsx"');
      return res.send(buffer);
    } else if (format === 'pdf') {
      return await streamPdfReport(res, 'SmartHorizon2026_Teams.pdf', {
        reportTitle: 'Smart Horizon 2026 — Registered Teams Report',
        summaryStats: [
          { label: 'Total Teams', value: teams.length },
          { label: 'Checked In', value: teams.filter(t => t.checkedIn).length },
        ],
        headers: ['Sl.', 'Team ID', 'Team Code', 'Team Name', 'Track', 'Leader', 'Status'],
        rows: summaryRows.map(r => [r[0], r[1], r[3], r[4], r[5], r[6], r[8]].map(String)),
        orientation: 'landscape',
      });
    } else {
      const csvStr = generateCsvReport(summaryHeaders, summaryRows.map(r => r.map(String)));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Teams.csv"');
      return res.send(csvStr);
    }
  } catch (error) {
    console.error('Export teams report error:', error);
    return res.status(500).json({ error: 'Failed to export teams report' });
  }
});

// 15. GET /api/reports/participants/export - Export Professional Participant Roster
router.get('/participants/export', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const format = (req.query.format as string || 'xlsx').toLowerCase();

    const teams = await prisma.team.findMany({
      include: {
        track: { select: { name: true } },
        members: true,
        attendance: true,
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['Sl. No.', 'Team ID', 'Team Name', 'Participant Name', 'Email', 'Phone', 'Role', 'Track', 'USN', 'College', 'Attendance Status'];
    const rows: any[][] = [];
    let slNo = 1;

    teams.forEach(team => {
      const attendanceMap = new Map<string, any>();
      team.attendance.forEach(a => { if (a.memberId) attendanceMap.set(a.memberId, a); });

      team.members.forEach(member => {
        const memberAtt = attendanceMap.get(member.id);
        const status = memberAtt ? memberAtt.status : team.checkedIn ? 'PRESENT' : 'ABSENT';

        rows.push([
          slNo++,
          team.registrationId || team.id.substring(0, 8).toUpperCase(),
          team.name,
          member.name,
          member.email || 'N/A',
          member.phone || 'N/A',
          member.role || 'MEMBER',
          team.track?.name || 'General',
          member.role === 'LEADER' ? (team.leadUsn || 'N/A') : 'N/A',
          team.collegeName || team.college || 'Unspecified Institution',
          status,
        ]);
      });
    });

    if (format === 'xlsx') {
      const sheets: ExportSheetDef[] = [
        {
          sheetName: 'PARTICIPANTS ROSTER',
          reportTitle: 'Smart Horizon 2026 — Official Participant Roster',
          summaryStats: [
            { label: 'Total Participants', value: rows.length },
            { label: 'Present', value: rows.filter(r => r[10] === 'PRESENT').length },
            { label: 'Absent', value: rows.filter(r => r[10] === 'ABSENT').length },
          ],
          headers,
          rows,
        },
      ];

      const buffer = generateExcelWorkbook(sheets);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Participants.xlsx"');
      return res.send(buffer);
    } else if (format === 'pdf') {
      return await streamPdfReport(res, 'SmartHorizon2026_Participants.pdf', {
        reportTitle: 'Smart Horizon 2026 — Participant Roster Report',
        summaryStats: [
          { label: 'Total Participants', value: rows.length },
          { label: 'Present', value: rows.filter(r => r[10] === 'PRESENT').length },
        ],
        headers: ['Sl.', 'Team ID', 'Team Name', 'Participant', 'Email', 'Role', 'Track', 'Attendance'],
        rows: rows.map(r => [r[0], r[1], r[2], r[3], r[4], r[6], r[7], r[10]].map(String)),
        orientation: 'landscape',
      });
    } else {
      const csvStr = generateCsvReport(headers, rows.map(r => r.map(String)));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Participants.csv"');
      return res.send(csvStr);
    }
  } catch (error) {
    console.error('Export participants report error:', error);
    return res.status(500).json({ error: 'Failed to export participants report' });
  }
});

// 16. GET /api/reports/judges/export - Export Professional Judge Performance Roster
router.get('/judges/export', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const format = (req.query.format as string || 'xlsx').toLowerCase();

    const judges = await prisma.user.findMany({
      where: { roleId: 'JUDGE' },
      include: {
        assignedTracks: { select: { name: true } },
        judgeAssignments: true,
        judgeReviews: { where: { status: 'SUBMITTED' }, include: { scores: true } },
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['Sl. No.', 'Judge Name', 'Email', 'Status', 'Assigned Track(s)', 'Assigned Teams', 'Evaluations Completed', 'Evaluations Pending', 'Avg Review Time (mins)', 'Avg Score Given'];
    const rows: any[][] = [];
    let slNo = 1;

    judges.forEach(j => {
      const completedCount = j.judgeReviews.length;
      const pendingCount = j.judgeAssignments.length;
      const assignedCount = completedCount + pendingCount;
      const tracksStr = j.assignedTracks.map(t => t.name).join(', ') || 'General';

      let totalScoreSum = 0;
      let scoresCount = 0;
      j.judgeReviews.forEach(rev => {
        rev.scores.forEach(s => {
          totalScoreSum += s.score;
          scoresCount += 1;
        });
      });

      const avgScoreGiven = scoresCount > 0 ? (totalScoreSum / scoresCount).toFixed(1) : 'N/A';

      rows.push([
        slNo++,
        j.name,
        j.email,
        j.judgeStatus || 'Available',
        tracksStr,
        assignedCount,
        completedCount,
        pendingCount,
        j.avgReviewTime || 15,
        avgScoreGiven,
      ]);
    });

    if (format === 'xlsx') {
      const sheets: ExportSheetDef[] = [
        {
          sheetName: 'JUDGES ROSTER',
          reportTitle: 'Smart Horizon 2026 — Official Jury Panel & Workload Report',
          summaryStats: [
            { label: 'Total Judges', value: judges.length },
            { label: 'Active Reviews', value: judges.reduce((a, b) => a + b.judgeReviews.length, 0) },
          ],
          headers,
          rows,
        },
      ];

      const buffer = generateExcelWorkbook(sheets);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Judges.xlsx"');
      return res.send(buffer);
    } else if (format === 'pdf') {
      return await streamPdfReport(res, 'SmartHorizon2026_Judges.pdf', {
        reportTitle: 'Smart Horizon 2026 — Jury Panel Performance Report',
        summaryStats: [
          { label: 'Total Judges', value: judges.length },
        ],
        headers: ['Sl.', 'Judge Name', 'Email', 'Track(s)', 'Assigned', 'Completed', 'Pending', 'Avg Score'],
        rows: rows.map(r => [r[0], r[1], r[2], r[4], r[5], r[6], r[7], r[9]].map(String)),
        orientation: 'landscape',
      });
    } else {
      const csvStr = generateCsvReport(headers, rows.map(r => r.map(String)));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Judges.csv"');
      return res.send(csvStr);
    }
  } catch (error) {
    console.error('Export judges report error:', error);
    return res.status(500).json({ error: 'Failed to export judges report' });
  }
});

// 17. GET /api/reports/judge-assignments/export - Export Professional Judge Assignments Matrix
router.get('/judge-assignments/export', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const format = (req.query.format as string || 'xlsx').toLowerCase();

    const assignments = await prisma.judgeAssignment.findMany({
      include: {
        judge: { select: { name: true, email: true } },
        team: { include: { track: { select: { name: true } }, reviews: true } },
      },
      orderBy: [{ judgeId: 'asc' }, { order: 'asc' }],
    });

    const headers = ['Sl. No.', 'Judge Name', 'Judge Email', 'Track', 'Team ID', 'Team Code', 'Team Name', 'Assignment Order', 'Evaluation Status'];
    const rows: any[][] = [];

    // Sheet 2 Judge Roster Grouped
    const judgeRosterMap: Record<string, { judgeName: string; track: string; teams: string[] }> = {};

    let slNo = 1;
    assignments.forEach(a => {
      const judgeName = a.judge.name;
      const trackName = a.team.track?.name || 'General';
      const teamRegId = a.team.registrationId || a.team.id.substring(0, 8).toUpperCase();
      const evalStatus = a.team.reviews.some(r => r.judgeId === a.judgeId && r.status === 'SUBMITTED') ? 'COMPLETED' : 'PENDING';

      rows.push([
        slNo++,
        judgeName,
        a.judge.email,
        trackName,
        teamRegId,
        a.team.teamCode || 'N/A',
        a.team.name,
        a.order || 1,
        evalStatus,
      ]);

      if (!judgeRosterMap[judgeName]) {
        judgeRosterMap[judgeName] = { judgeName, track: trackName, teams: [] };
      }
      judgeRosterMap[judgeName].teams.push(`${a.team.teamCode || teamRegId} - ${a.team.name}`);
    });

    const rosterHeaders = ['Judge Name', 'Track', 'Assigned Teams Count', 'Assigned Teams Roster'];
    const rosterRows = Object.values(judgeRosterMap).map(j => [
      j.judgeName,
      j.track,
      j.teams.length,
      j.teams.join(' | '),
    ]);

    if (format === 'xlsx') {
      const sheets: ExportSheetDef[] = [
        {
          sheetName: 'ASSIGNMENTS LIST',
          reportTitle: 'Smart Horizon 2026 — Judge Assignments Matrix',
          summaryStats: [
            { label: 'Total Assignments', value: assignments.length },
          ],
          headers,
          rows,
        },
        {
          sheetName: 'JUDGE ROSTER',
          reportTitle: 'Smart Horizon 2026 — Judge Team Assignments Summary',
          headers: rosterHeaders,
          rows: rosterRows,
          colWidths: [25, 22, 20, 60],
        },
      ];

      const buffer = generateExcelWorkbook(sheets);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Judge_Assignments.xlsx"');
      return res.send(buffer);
    } else if (format === 'pdf') {
      return await streamPdfReport(res, 'SmartHorizon2026_Judge_Assignments.pdf', {
        reportTitle: 'Smart Horizon 2026 — Judge Assignments Report',
        summaryStats: [
          { label: 'Total Assignments', value: assignments.length },
        ],
        headers: ['Sl.', 'Judge Name', 'Track', 'Team ID', 'Team Name', 'Status'],
        rows: rows.map(r => [r[0], r[1], r[3], r[4], r[6], r[8]].map(String)),
        orientation: 'landscape',
      });
    } else {
      const csvStr = generateCsvReport(headers, rows.map(r => r.map(String)));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Judge_Assignments.csv"');
      return res.send(csvStr);
    }
  } catch (error) {
    console.error('Export judge assignments report error:', error);
    return res.status(500).json({ error: 'Failed to export judge assignments report' });
  }
});

// 18. GET /api/reports/rankings/export - Export Official Leaderboard Standings
router.get('/rankings/export', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const format = (req.query.format as string || 'xlsx').toLowerCase();

    const rounds = await prisma.reviewRound.findMany({
      orderBy: { sequence: 'asc' }
    });

    const teams = await prisma.team.findMany({
      include: {
        track: { select: { name: true } },
        reviews: {
          where: { status: 'SUBMITTED' },
          include: { scores: true }
        }
      }
    });

    const compiled = teams.map(t => {
      const summary = calculateTeamScoresFromRounds(rounds, t.reviews);

      return {
        regId: t.registrationId || t.id.substring(0, 8).toUpperCase(),
        teamCode: t.teamCode || 'N/A',
        name: t.name,
        trackName: t.track.name,
        avgR1: summary.r1Avg,
        avgR2: summary.r2Avg,
        avgR3: summary.r3Avg,
        finalScore: summary.totalScore,
      };
    });

    compiled.sort((a, b) => b.finalScore - a.finalScore);

    const headers = ['Official Rank', 'Team ID', 'Team Code', 'Team Name', 'Track / Domain', 'Round 1 Score (/100)', 'Round 2 Score (/100)', 'Round 3 Score (/100)', 'Final Score (/300)'];
    const rows: any[][] = [];

    let currentRank = 1;
    compiled.forEach((t, idx) => {
      if (idx > 0 && t.finalScore < compiled[idx - 1].finalScore) {
        currentRank = idx + 1;
      }
      rows.push([
        currentRank,
        t.regId,
        t.teamCode,
        t.name,
        t.trackName,
        t.avgR1,
        t.avgR2,
        t.avgR3,
        t.finalScore,
      ]);
    });

    if (format === 'xlsx') {
      const sheets: ExportSheetDef[] = [
        {
          sheetName: 'LEADERBOARD',
          reportTitle: 'Smart Horizon 2026 — Official Hackathon Leaderboard Standings',
          summaryStats: [
            { label: 'Total Teams', value: teams.length },
            { label: 'Top Score', value: compiled.length > 0 ? compiled[0].finalScore : 0 },
          ],
          headers,
          rows,
        },
      ];

      const buffer = generateExcelWorkbook(sheets);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Leaderboard.xlsx"');
      return res.send(buffer);
    } else if (format === 'pdf') {
      return await streamPdfReport(res, 'SmartHorizon2026_Leaderboard.pdf', {
        reportTitle: 'Smart Horizon 2026 — Official Leaderboard Standings Report',
        summaryStats: [
          { label: 'Total Teams', value: teams.length },
          { label: 'Winning Score', value: compiled.length > 0 ? compiled[0].finalScore : 0 },
        ],
        headers: ['Rank', 'Team ID', 'Team Name', 'Track', 'Round 1', 'Round 2', 'Round 3', 'Final Score'],
        rows: rows.map(r => [r[0], r[1], r[3], r[4], r[5], r[6], r[7], r[8]].map(String)),
        orientation: 'landscape',
      });
    } else {
      const csvStr = generateCsvReport(headers, rows.map(r => r.map(String)));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Leaderboard.csv"');
      return res.send(csvStr);
    }
  } catch (error) {
    console.error('Export rankings error:', error);
    return res.status(500).json({ error: 'Failed to export standings report' });
  }
});

export default router;
