import { Router, Request, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const trackSchema = z.object({
  name: z.string().min(1, 'Track name is required'),
});

// 1. GET all tracks for the active hackathon
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.json({ tracks: [] });
    }

    const tracks = await prisma.track.findMany({
      where: { hackathonId: activeHackathon.id },
      orderBy: { name: 'asc' },
    });

    return res.json({ tracks });
  } catch (error) {
    console.error('Failed to get tracks:', error);
    return res.status(500).json({ error: 'An internal server error occurred' });
  }
});

// 2. POST /api/tracks (Admin create track)
router.post('/', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = trackSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.status(400).json({ error: 'No active hackathon to create track in.' });
    }

    const { name } = parseResult.data;

    // Check duplicate
    const existing = await prisma.track.findFirst({
      where: { name, hackathonId: activeHackathon.id },
    });

    if (existing) {
      return res.status(400).json({ error: 'Track name already exists.' });
    }

    const track = await prisma.track.create({
      data: {
        name,
        hackathonId: activeHackathon.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'TRACK_CREATE',
        details: `Created track "${track.name}".`,
      },
    });

    return res.status(201).json({ success: true, track });
  } catch (error) {
    console.error('Create track error:', error);
    return res.status(500).json({ error: 'Failed to create track' });
  }
});

// 3. PUT /api/tracks/:id (Admin edit track)
router.put('/:id', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = trackSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const track = await prisma.track.findUnique({ where: { id } });
    if (!track) return res.status(404).json({ error: 'Track not found' });

    const updated = await prisma.track.update({
      where: { id },
      data: { name: parseResult.data.name },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'TRACK_EDIT',
        details: `Renamed track "${track.name}" to "${updated.name}".`,
      },
    });

    return res.json({ success: true, track: updated });
  } catch (error) {
    console.error('Edit track error:', error);
    return res.status(500).json({ error: 'Failed to edit track' });
  }
});

// 4. DELETE /api/tracks/:id (Admin delete track with Safety Checks)
router.delete('/:id', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const track = await prisma.track.findUnique({ where: { id } });
    if (!track) return res.status(404).json({ error: 'Track not found' });

    // Safety check: Prevent deletion if any teams are assigned to this track
    const teamsCount = await prisma.team.count({
      where: { trackId: id },
    });

    if (teamsCount > 0) {
      return res.status(400).json({
        error: `Cannot delete track "${track.name}": ${teamsCount} team(s) are currently assigned to it. Please migrate these teams to another track first.`
      });
    }

    await prisma.track.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'TRACK_DELETE',
        details: `Deleted track "${track.name}".`,
      },
    });

    return res.json({ success: true, message: `Track "${track.name}" deleted successfully.` });
  } catch (error) {
    console.error('Delete track error:', error);
    return res.status(500).json({ error: 'Failed to delete track' });
  }
});

function isAllowedToViewLeaderboard(visibility: string, userRole: string): boolean {
  if (userRole === 'ADMINISTRATOR') return true;
  if (visibility === 'HIDDEN') return false;
  if (visibility === 'ADMIN_ONLY') return false;
  if (visibility === 'ADMIN_JUDGES') return userRole === 'JUDGE';
  if (visibility === 'STUDENTS') return userRole === 'STUDENT' || userRole === 'JUDGE';
  if (visibility === 'PUBLIC') return true;
  return false;
}

function calculateTeamWeightedScore(team: any, rounds: any[], excludeMostRecent = false) {
  let reviewsToUse = team.reviews;
  if (excludeMostRecent && team.reviews.length > 0) {
    const sortedReviews = [...team.reviews].sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const mostRecentId = sortedReviews[0].id;
    reviewsToUse = team.reviews.filter((r: any) => r.id !== mostRecentId);
  }

  let finalScore = 0;
  const totalReviewsCount = reviewsToUse.length;

  for (const round of rounds) {
    const roundReviews = reviewsToUse.filter((r: any) => r.roundId === round.id && r.status === 'SUBMITTED');
    if (roundReviews.length === 0) continue;

    let roundTotalScoreSum = 0;
    for (const review of roundReviews) {
      let judgeTotal = 0;
      for (const score of review.scores) {
        judgeTotal += (score.score || 0);
      }
      roundTotalScoreSum += judgeTotal;
    }

    const roundAverage = roundTotalScoreSum / roundReviews.length;
    finalScore += roundAverage;
  }

  return { score: Number(finalScore.toFixed(1)), reviewsCount: totalReviewsCount };
}

async function computeLeaderboard(trackId: string, roundId?: string) {
  const track = await prisma.track.findUnique({
    where: { id: trackId }
  });
  if (!track) return [];
  
  if (track.resultsLocked && track.frozenLeaderboard) {
    try {
      return JSON.parse(track.frozenLeaderboard);
    } catch (e) {
      console.error('Failed to parse frozen leaderboard:', e);
    }
  }

  let roundsToQuery: any[] = [];
  if (roundId) {
    const r = await prisma.reviewRound.findUnique({ where: { id: roundId } });
    if (r) roundsToQuery.push(r);
  } else {
    // Fetch all review rounds for this track (plus overall rounds)
    roundsToQuery = await prisma.reviewRound.findMany({
      where: {
        OR: [
          { trackId },
          { trackId: null }
        ]
      }
    });
  }

  const roundIds = roundsToQuery.map(r => r.id);
  if (roundIds.length === 0) {
    return [];
  }
  
  const teams = await prisma.team.findMany({
    where: { trackId },
    include: {
      members: { select: { name: true } },
      reviews: {
        where: {
          roundId: { in: roundIds },
          status: 'SUBMITTED'
        },
        include: {
          scores: {
            include: {
              criterion: true
            }
          }
        }
      }
    }
  });
  
  const teamScores = teams.map(team => {
    const { score, reviewsCount } = calculateTeamWeightedScore(team, roundsToQuery, false);
    return {
      id: team.id,
      registrationId: team.registrationId,
      teamCode: team.teamCode,
      name: team.name,
      projectTitle: team.projectTitle || 'N/A',
      membersList: team.members.map((m: any) => m.name).join(', '),
      score,
      reviewsCount,
      trackName: track.name,
      trackId: track.id,
    };
  });
  
  teamScores.sort((a, b) => b.score - a.score);
  
  let prevCurrentScore = -1;
  let actualCurrentRank = 1;
  const currentRankMap = new Map<string, number>();
  
  teamScores.forEach((t, idx) => {
    if (t.score !== prevCurrentScore) {
      actualCurrentRank = idx + 1;
    }
    prevCurrentScore = t.score;
    currentRankMap.set(t.id, actualCurrentRank);
  });
  
  const prevTeamScores = teams.map(team => {
    const { score } = calculateTeamWeightedScore(team, roundsToQuery, true);
    return { id: team.id, score };
  });
  
  prevTeamScores.sort((a, b) => b.score - a.score);
  
  let prevScoreVal = -1;
  let actualPrevRank = 1;
  const previousRankMap = new Map<string, number>();
  
  prevTeamScores.forEach((t, idx) => {
    if (t.score !== prevScoreVal) {
      actualPrevRank = idx + 1;
    }
    prevScoreVal = t.score;
    previousRankMap.set(t.id, actualPrevRank);
  });
  
  const finalRankings = teamScores.map((team) => {
    const currRank = currentRankMap.get(team.id) || 1;
    const prevRank = previousRankMap.get(team.id);
    
    const isNew = team.reviewsCount === 1 && prevRank === undefined;
    let movement = 'No Change';
    let movementValue = 0;
    
    if (prevRank !== undefined && prevRank !== currRank) {
      movementValue = prevRank - currRank;
      if (movementValue > 0) {
        movement = `↑ +${movementValue}`;
      } else {
        movement = `↓ ${movementValue}`;
      }
    } else if (isNew) {
      movement = 'New';
    }
    
    return {
      ...team,
      rank: currRank,
      movement,
      movementValue,
    };
  });
  
  return finalRankings;
}

function isUuid(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function formatHumanTeamId(team: any): string {
  if (team.teamCode && !isUuid(team.teamCode)) {
    return team.teamCode;
  }
  if (team.registrationId) {
    const reg = String(team.registrationId).trim();
    if (reg.toUpperCase().startsWith('T')) {
      return reg.toUpperCase();
    }
    const num = parseInt(reg, 10);
    if (!isNaN(num)) {
      return `T${String(num).padStart(3, '0')}`;
    }
    return reg;
  }
  return `T000`;
}

// Helper function for natural Human Team ID sorting (e.g. T003 < T017 < T021 < T028)
function sortByHumanTeamIdAscending(teams: any[]) {
  return [...teams].sort((a, b) => {
    const idA = String(a.teamId || '');
    const idB = String(b.teamId || '');
    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * PUBLIC LEADERBOARD PRIVACY + ORDERING LOGIC
 * STEP 1: Compute internal standings by official performance (score descending)
 * STEP 2: Select TOP 10 teams by official performance
 * STEP 3: Strip ALL sensitive performance/scoring/rank fields & assign human-facing Team ID
 * STEP 4: Sort ONLY those selected 10 teams by Human-Facing Team ID in ascending/natural order
 */
async function computePublicLeaderboard(trackId?: string, roundId?: string) {
  let tracksToQuery: any[] = [];
  if (trackId) {
    const tr = await prisma.track.findUnique({ where: { id: trackId } });
    if (tr) tracksToQuery.push(tr);
  } else {
    const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
    if (activeHackathon) {
      tracksToQuery = await prisma.track.findMany({ where: { hackathonId: activeHackathon.id } });
    }
  }

  let allPerformanceRankings: any[] = [];
  for (const tr of tracksToQuery) {
    const rankings = await computeLeaderboard(tr.id, roundId);
    allPerformanceRankings.push(...rankings);
  }

  // STEP 1 & 2: Sort by official performance score descending and take Top 10
  allPerformanceRankings.sort((a, b) => (b.score || 0) - (a.score || 0));
  const top10ByPerformance = allPerformanceRankings.slice(0, 10);

  // STEP 3: Remove all sensitive performance/scoring/rank fields and set human-facing Team ID
  const publicSafeTeams = top10ByPerformance.map((team: any) => {
    const humanId = formatHumanTeamId(team);
    return {
      teamId: humanId,
      teamName: team.name || team.teamName,
      projectTitle: team.projectTitle && team.projectTitle !== 'N/A' ? team.projectTitle : undefined,
      trackName: team.trackName,
    };
  });

  // STEP 4: Sort selected teams by Human-Facing Team ID ascending (natural ordering)
  return sortByHumanTeamIdAscending(publicSafeTeams);
}

// 4.5 GET /api/tracks/public-leaderboard - Unauthenticated/Public Leaderboard Privacy View
router.get('/public-leaderboard', async (req: Request, res: Response) => {
  try {
    const trackId = req.query.trackId as string | undefined;
    const roundId = req.query.roundId as string | undefined;

    const publicLeaderboard = await computePublicLeaderboard(trackId, roundId);
    return res.json({ leaderboard: publicLeaderboard, isPublicPrivacyView: true });
  } catch (error) {
    console.error('Public leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to retrieve public leaderboard.' });
  }
});

// 5. GET /api/tracks/leaderboard - Standings Endpoint (Full Admin standings for ADMIN, Privacy Top 10 for STUDENTS)
router.get('/leaderboard', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!userRole) return res.status(401).json({ error: 'Unauthorized' });

    const trackId = req.query.trackId as string | undefined;
    const roundId = req.query.roundId as string | undefined;
    const search = (req.query.search as string || '').trim().toLowerCase();
    const limitStr = req.query.limit as string | undefined;

    if (userRole === 'STUDENT') {
      return res.status(403).json({ error: 'Leaderboard access is disabled for students.' });
    }

    // For NON-ADMIN (Judge/Public) callers: Enforce Public Leaderboard Privacy + Team ID Ordering
    if (userRole !== 'ADMINISTRATOR') {
      let publicLeaderboard = await computePublicLeaderboard(trackId, roundId);

      if (search) {
        publicLeaderboard = publicLeaderboard.filter(t =>
          t.teamName.toLowerCase().includes(search) ||
          (t.projectTitle && t.projectTitle.toLowerCase().includes(search)) ||
          t.teamCode.toLowerCase().includes(search)
        );
      }

      return res.json({ leaderboard: publicLeaderboard, isPublicPrivacyView: true });
    }

    // For ADMINISTRATOR callers: Preserve full Admin standings with scores, ranks, and breakdown
    let tracksToQuery: any[] = [];
    if (trackId) {
      const tr = await prisma.track.findUnique({ where: { id: trackId } });
      if (tr) tracksToQuery.push(tr);
    } else {
      const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
      if (activeHackathon) {
        tracksToQuery = await prisma.track.findMany({ where: { hackathonId: activeHackathon.id } });
      }
    }

    let allLeaderboardEntries: any[] = [];

    for (const tr of tracksToQuery) {
      const rankings = await computeLeaderboard(tr.id, roundId);
      allLeaderboardEntries.push(...rankings);
    }

    if (!trackId) {
      // Sort overall rankings based on score descending
      allLeaderboardEntries.sort((a, b) => (b.score || 0) - (a.score || 0));
      let prevScore = -1;
      let actualRank = 1;
      allLeaderboardEntries = allLeaderboardEntries.map((t, idx) => {
        if (t.score !== undefined && t.score !== prevScore) {
          actualRank = idx + 1;
        }
        if (t.score !== undefined) prevScore = t.score;
        return { ...t, rank: actualRank };
      });
    }

    if (search) {
      allLeaderboardEntries = allLeaderboardEntries.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.projectTitle.toLowerCase().includes(search)
      );
    }

    if (limitStr === '5') {
      allLeaderboardEntries = allLeaderboardEntries.slice(0, 5);
    } else if (limitStr === '10') {
      allLeaderboardEntries = allLeaderboardEntries.slice(0, 10);
    }

    return res.json({ leaderboard: allLeaderboardEntries, isPublicPrivacyView: false });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to retrieve leaderboard rankings.' });
  }
});

// 6. POST /api/tracks/:id/lock-results
router.post('/:id/lock-results', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const track = await prisma.track.findUnique({ where: { id } });
    if (!track) return res.status(404).json({ error: 'Track not found' });
    
    const rankings = await computeLeaderboard(id);
    
    await prisma.track.update({
      where: { id },
      data: {
        resultsLocked: true,
        frozenLeaderboard: JSON.stringify(rankings)
      }
    });
    
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'LEADERBOARD_LOCK',
        details: `Locked results leaderboard for track "${track.name}".`,
      }
    });
    
    return res.json({ success: true, message: `Rankings locked and frozen successfully for track "${track.name}".` });
  } catch (error) {
    console.error('Lock results error:', error);
    return res.status(500).json({ error: 'Failed to lock results.' });
  }
});

// 7. POST /api/tracks/:id/unlock-results
router.post('/:id/unlock-results', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const track = await prisma.track.findUnique({ where: { id } });
    if (!track) return res.status(404).json({ error: 'Track not found' });
    
    await prisma.track.update({
      where: { id },
      data: {
        resultsLocked: false,
        frozenLeaderboard: null
      }
    });
    
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'LEADERBOARD_UNLOCK',
        details: `Unlocked results leaderboard for track "${track.name}".`,
      }
    });
    
    return res.json({ success: true, message: `Rankings unlocked successfully for track "${track.name}".` });
  } catch (error) {
    console.error('Unlock results error:', error);
    return res.status(500).json({ error: 'Failed to unlock results.' });
  }
});

// 8. PUT /api/tracks/:id/visibility
router.put('/:id/visibility', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { visibility, exposeScoresToStudents } = req.body;
    
    if (visibility && !['HIDDEN', 'ADMIN_ONLY', 'ADMIN_JUDGES', 'PUBLIC', 'STUDENTS'].includes(visibility)) {
      return res.status(400).json({ error: 'Invalid visibility mode.' });
    }
    
    const track = await prisma.track.findUnique({ where: { id } });
    if (!track) return res.status(404).json({ error: 'Track not found' });
    
    const updateData: any = {};
    if (visibility !== undefined) {
      updateData.leaderboardVisibility = visibility;
    }
    if (exposeScoresToStudents !== undefined) {
      updateData.exposeScoresToStudents = exposeScoresToStudents;
    }
    
    await prisma.track.update({
      where: { id },
      data: updateData
    });
    
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'LEADERBOARD_VISIBILITY',
        details: `Set leaderboard visibility for track "${track.name}" to "${visibility || track.leaderboardVisibility}", exposeScoresToStudents to ${exposeScoresToStudents !== undefined ? exposeScoresToStudents : track.exposeScoresToStudents}.`,
      }
    });
    
    return res.json({ success: true, message: `Visibility updated successfully.` });
  } catch (error) {
    console.error('Visibility update error:', error);
    return res.status(500).json({ error: 'Failed to update visibility.' });
  }
});

export default router;
