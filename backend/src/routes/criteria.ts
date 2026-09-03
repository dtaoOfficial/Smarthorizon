import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const roundSchema = z.object({
  name: z.string().min(1, 'Round name is required'),
  description: z.string().optional().nullable(),
  sequence: z.number().int().default(1),
  trackId: z.string().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  submissionDeadline: z.string().optional().nullable(),
  active: z.boolean().default(false),
  locked: z.boolean().default(false),
  thresholdExcellent: z.number().default(85),
  thresholdGood: z.number().default(65),
  thresholdImprovement: z.number().default(45),
  duration: z.number().min(1, 'Review duration (minutes) must be positive').default(10),
  weight: z.number().min(0, 'Review weight must be non-negative').default(1.0),
});

async function validateRubricForActivation(roundId: string, durationMinutes: number) {
  if (durationMinutes <= 0) {
    throw new Error('Review duration must be a positive number of minutes.');
  }

  const criteria = await prisma.judgingCriterion.findMany({
    where: { roundId }
  });

  if (criteria.length === 0) {
    throw new Error('At least one judging criterion is required to activate the review round.');
  }

  const names = new Set<string>();
  for (const c of criteria) {
    if (c.maxMarks <= 0) {
      throw new Error(`Criterion "${c.name}" must have positive maximum marks.`);
    }
    const nameNorm = c.name.trim().toLowerCase();
    if (names.has(nameNorm)) {
      throw new Error(`Duplicate criterion name detected: "${c.name}". Rubric criteria names must be unique.`);
    }
    names.add(nameNorm);
  }
}

const criterionSchema = z.object({
  roundId: z.string().optional(),
  name: z.string().min(1, 'Criterion name is required'),
  description: z.string().optional().default(''),
  maxMarks: z.number().min(1, 'Maximum marks must be at least 1'),
  weight: z.number().default(1.0).optional(),
  sequence: z.number().int().default(1).optional(),
  required: z.boolean().default(true).optional(),
});

// 1. GET /api/criteria/rounds - List all rounds including criteria rubrics
router.get('/rounds', authenticateToken, requireRole(['ADMINISTRATOR', 'JUDGE', 'DATA_ENTRY', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rounds = await prisma.reviewRound.findMany({
      include: {
        criteria: {
          orderBy: { sequence: 'asc' }
        },
        track: { select: { name: true } }
      },
      orderBy: { sequence: 'asc' }
    });

    const enriched = rounds.map(r => {
      const maxMarksTotal = r.criteria.reduce((sum, c) => sum + c.maxMarks, 0);
      return {
        ...r,
        duration: Math.round(r.duration / 60) || 5, // expose minutes
        durationSeconds: r.duration,
        maxMarksTotal
      };
    });

    return res.json({ rounds: enriched });
  } catch (error) {
    console.error('Fetch rounds error:', error);
    return res.status(500).json({ error: 'Failed to fetch review rounds' });
  }
});

// 2. POST /api/criteria/rounds - Admin create round
router.post('/rounds', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = roundSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
    if (!activeHackathon) return res.status(400).json({ error: 'No active hackathon exists.' });

    const data = parseResult.data;

    // Constraint: Only one active round per track
    if (data.active) {
      const activeExists = await prisma.reviewRound.findFirst({
        where: { trackId: data.trackId || null, active: true }
      });
      if (activeExists) {
        return res.status(400).json({ error: `Only one active review round is allowed for ${data.trackId ? 'this track' : 'overall'} at any time.` });
      }
    }

    const round = await prisma.reviewRound.create({
      data: {
        name: data.name,
        description: data.description,
        sequence: data.sequence,
        trackId: data.trackId || null,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        submissionDeadline: data.submissionDeadline ? new Date(data.submissionDeadline) : null,
        active: data.active,
        locked: data.locked,
        thresholdExcellent: data.thresholdExcellent,
        thresholdGood: data.thresholdGood,
        thresholdImprovement: data.thresholdImprovement,
        duration: data.duration * 60, // save as seconds
        weight: data.weight,
        hackathonId: activeHackathon.id,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'RUBRIC_VERSION_SAVE',
        details: `Created review round "${round.name}".`,
      }
    });

    return res.status(201).json({ success: true, round });
  } catch (error) {
    console.error('Create round error:', error);
    return res.status(500).json({ error: 'Failed to create review round' });
  }
});

// 3. PUT /api/criteria/rounds/:id - Admin update round
router.put('/rounds/:id', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = roundSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const round = await prisma.reviewRound.findUnique({ where: { id } });
    if (!round) return res.status(404).json({ error: 'Review round not found' });

    const data = parseResult.data;

    // Rubric Activation Validation
    if (data.active) {
      try {
        await validateRubricForActivation(id, data.duration);
      } catch (err: any) {
        return res.status(400).json({ error: err.message });
      }

      const activeExists = await prisma.reviewRound.findFirst({
        where: { id: { not: id }, trackId: data.trackId || null, active: true }
      });
      if (activeExists) {
        return res.status(400).json({ error: `Only one active review round is allowed for ${data.trackId ? 'this track' : 'overall'} at any time.` });
      }
    }

    const durationInSecs = data.duration > 30 ? data.duration : data.duration * 60;

    const updated = await prisma.reviewRound.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        sequence: data.sequence,
        trackId: data.trackId || null,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        submissionDeadline: data.submissionDeadline ? new Date(data.submissionDeadline) : null,
        active: data.active,
        locked: data.locked,
        thresholdExcellent: data.thresholdExcellent,
        thresholdGood: data.thresholdGood,
        thresholdImprovement: data.thresholdImprovement,
        duration: durationInSecs,
        weight: data.weight,
        rubricVersion: { increment: 1 }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'RUBRIC_VERSION_SAVE',
        details: `Updated metadata for review round "${updated.name}".`,
      }
    });

    return res.json({ success: true, round: updated });
  } catch (error) {
    console.error('Update round error:', error);
    return res.status(500).json({ error: 'Failed to update review round' });
  }
});

// 3.5 PUT /api/criteria/rounds/:id/toggle-lock
router.put('/rounds/:id/toggle-lock', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const round = await prisma.reviewRound.findUnique({ where: { id } });
    if (!round) return res.status(404).json({ error: 'Review round not found' });

    const updated = await prisma.reviewRound.update({
      where: { id },
      data: { locked: !round.locked }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'RUBRIC_VERSION_SAVE',
        details: `${updated.locked ? 'Locked' : 'Unlocked'} rubric for round "${round.name}".`,
      }
    });

    return res.json({ success: true, locked: updated.locked, round: updated });
  } catch (error) {
    console.error('Toggle round lock error:', error);
    return res.status(500).json({ error: 'Failed to toggle round lock state' });
  }
});

// 4. DELETE /api/criteria/rounds/:id - Admin delete round (safety checks)
router.delete('/rounds/:id', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const round = await prisma.reviewRound.findUnique({
      where: { id },
      include: {
        reviews: true,
        criteria: true
      }
    });

    if (!round) return res.status(404).json({ error: 'Review round not found' });

    if (round.reviews.length > 0) {
      return res.status(400).json({
        error: `Cannot delete round: ${round.reviews.length} evaluations have already been conducted in this round.`
      });
    }

    // Delete criteria first
    await prisma.judgingCriterion.deleteMany({ where: { roundId: id } });
    await prisma.reviewRound.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'RUBRIC_VERSION_SAVE',
        details: `Deleted review round "${round.name}".`,
      }
    });

    return res.json({ success: true, message: `Review round "${round.name}" deleted successfully.` });
  } catch (error) {
    console.error('Delete round error:', error);
    return res.status(500).json({ error: 'Failed to delete review round' });
  }
});

// 5. POST /api/criteria/rounds/:id/clone - Clone Rubric
router.post('/rounds/:id/clone', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { targetRoundId, targetTrackId, copyCriteria, copyThresholds } = req.body;

    const sourceRound = await prisma.reviewRound.findUnique({
      where: { id },
      include: { criteria: true }
    });

    if (!sourceRound) return res.status(404).json({ error: 'Source review round not found' });

    let targetRound: any;
    if (targetRoundId) {
      targetRound = await prisma.reviewRound.findUnique({ where: { id: targetRoundId } });
      if (!targetRound) return res.status(404).json({ error: 'Target review round not found' });
    } else {
      targetRound = await prisma.reviewRound.create({
        data: {
          name: `${sourceRound.name} (Cloned)`,
          description: sourceRound.description,
          sequence: sourceRound.sequence + 1,
          trackId: targetTrackId || null,
          hackathonId: sourceRound.hackathonId,
          active: false,
          locked: false,
          thresholdExcellent: copyThresholds ? sourceRound.thresholdExcellent : 85,
          thresholdGood: copyThresholds ? sourceRound.thresholdGood : 65,
          thresholdImprovement: copyThresholds ? sourceRound.thresholdImprovement : 45,
          duration: sourceRound.duration,
          weight: sourceRound.weight,
        }
      });
    }

    if (copyCriteria && sourceRound.criteria.length > 0) {
      await prisma.judgingCriterion.createMany({
        data: sourceRound.criteria.map(c => ({
          roundId: targetRound.id,
          name: c.name,
          description: c.description,
          maxMarks: c.maxMarks,
          weight: c.weight,
          sequence: c.sequence,
          required: c.required
        }))
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'RUBRIC_VERSION_SAVE',
        details: `Cloned rubric from round "${sourceRound.name}" to round "${targetRound.name}".`,
      }
    });

    return res.status(201).json({ success: true, round: targetRound });
  } catch (error) {
    console.error('Clone round error:', error);
    return res.status(500).json({ error: 'Failed to clone review round' });
  }
});

// 6. POST /api/criteria - Admin add criterion
router.post('/', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = criterionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const { roundId, name, description, maxMarks, weight, sequence, required } = parseResult.data;

    if (!roundId) {
      return res.status(400).json({ error: 'Round ID is required to add criterion.' });
    }

    const round = await prisma.reviewRound.findUnique({ where: { id: roundId } });
    if (!round) return res.status(404).json({ error: 'Review round not found' });

    // Check duplicate name in same round
    const duplicate = await prisma.judgingCriterion.findFirst({
      where: { roundId, name: { equals: name } }
    });
    if (duplicate) {
      return res.status(400).json({ error: 'A criterion with this name already exists in this round.' });
    }

    const criterion = await prisma.judgingCriterion.create({
      data: {
        roundId,
        name,
        description: description || '',
        maxMarks: Number(maxMarks),
        weight: weight !== undefined ? Number(weight) : 1.0,
        sequence: sequence !== undefined ? Number(sequence) : 1,
        required: required !== undefined ? required : true
      }
    });

    // Update round rubric version
    await prisma.reviewRound.update({
      where: { id: roundId },
      data: { rubricVersion: { increment: 1 } }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'RUBRIC_VERSION_SAVE',
        details: `Added criterion "${name}" to round "${round.name}".`,
      }
    });

    return res.status(201).json({ success: true, criterion });
  } catch (error) {
    console.error('Add criterion error:', error);
    return res.status(500).json({ error: 'Failed to add criterion' });
  }
});

// 7. PUT /api/criteria/:id - Admin edit criterion
router.put('/:id', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = criterionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten().fieldErrors });
    }

    const { name, description, maxMarks, weight, sequence, required } = parseResult.data;

    const criterion = await prisma.judgingCriterion.findUnique({
      where: { id },
      include: { round: true }
    });

    if (!criterion) return res.status(404).json({ error: 'Criterion not found' });

    // If maxMarks changed, adjust review scores exceeding new maximum
    if (criterion.maxMarks !== maxMarks) {
      await prisma.reviewScore.updateMany({
        where: { criterionId: id, score: { gt: maxMarks } },
        data: { score: maxMarks }
      });
      // Increment round rubric version
      await prisma.reviewRound.update({
        where: { id: criterion.roundId },
        data: { rubricVersion: { increment: 1 } }
      });
    }

    const updated = await prisma.judgingCriterion.update({
      where: { id },
      data: {
        name,
        description: description || '',
        maxMarks: Number(maxMarks),
        weight: weight !== undefined ? Number(weight) : 1.0,
        sequence: sequence !== undefined ? Number(sequence) : criterion.sequence,
        required: required !== undefined ? required : true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'RUBRIC_VERSION_SAVE',
        details: `Updated criterion "${updated.name}" inside round "${criterion.round.name}".`,
      }
    });

    return res.json({ success: true, criterion: updated });
  } catch (error) {
    console.error('Edit criterion error:', error);
    return res.status(500).json({ error: 'Failed to edit criterion' });
  }
});

// 8. DELETE /api/criteria/:id - Admin delete criterion
router.delete('/:id', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const criterion = await prisma.judgingCriterion.findUnique({
      where: { id },
      include: { round: true }
    });

    if (!criterion) return res.status(404).json({ error: 'Criterion not found' });

    // Cascade delete any recorded reviewScore rows for this criterion
    await prisma.reviewScore.deleteMany({ where: { criterionId: id } });
    await prisma.judgingCriterion.delete({ where: { id } });

    // Increment round rubric version
    await prisma.reviewRound.update({
      where: { id: criterion.roundId },
      data: { rubricVersion: { increment: 1 } }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action: 'RUBRIC_VERSION_SAVE',
        details: `Deleted criterion "${criterion.name}" from round "${criterion.round.name}".`,
      }
    });

    return res.json({ success: true, message: `Criterion "${criterion.name}" deleted successfully.` });
  } catch (error) {
    console.error('Delete criterion error:', error);
    return res.status(500).json({ error: 'Failed to delete criterion' });
  }
});

export default router;
