import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import prisma from '../db';

const router = Router();

const getDefaultConfig = () => {
  const now = new Date();
  return {
    hackathonTitle: 'SMARTHORIZON 2026 // 48-HOUR HACKATHON',
    hackathonEndTime: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16),
    reviewRoundName: 'Round 2: Mid-Evaluation Prototype Assessment',
    reviewRoundEndTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
    soundEnabled: true,
  };
};

// GET /api/timer
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = await prisma.timerConfig.findFirst();
    if (config) {
      return res.json({
        hackathonTitle: config.hackathonTitle,
        hackathonEndTime: config.hackathonEndTime,
        reviewRoundName: config.reviewRoundName,
        reviewRoundEndTime: config.reviewRoundEndTime,
        soundEnabled: config.soundEnabled
      });
    } else {
      return res.json(getDefaultConfig());
    }
  } catch (error) {
    console.error('Error reading timer config:', error);
    return res.status(500).json({ error: 'Failed to read timer configuration' });
  }
});

// POST /api/timer
router.post('/', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const newConfig = req.body;
    let config = await prisma.timerConfig.findFirst();
    
    if (config) {
      config = await prisma.timerConfig.update({
        where: { id: config.id },
        data: {
          hackathonTitle: newConfig.hackathonTitle ?? config.hackathonTitle,
          hackathonEndTime: newConfig.hackathonEndTime ?? config.hackathonEndTime,
          reviewRoundName: newConfig.reviewRoundName ?? config.reviewRoundName,
          reviewRoundEndTime: newConfig.reviewRoundEndTime ?? config.reviewRoundEndTime,
          soundEnabled: newConfig.soundEnabled ?? config.soundEnabled,
        }
      });
    } else {
      const def = getDefaultConfig();
      config = await prisma.timerConfig.create({
        data: {
          hackathonTitle: newConfig.hackathonTitle ?? def.hackathonTitle,
          hackathonEndTime: newConfig.hackathonEndTime ?? def.hackathonEndTime,
          reviewRoundName: newConfig.reviewRoundName ?? def.reviewRoundName,
          reviewRoundEndTime: newConfig.reviewRoundEndTime ?? def.reviewRoundEndTime,
          soundEnabled: newConfig.soundEnabled ?? def.soundEnabled,
        }
      });
    }

    return res.json({ success: true, config: {
      hackathonTitle: config.hackathonTitle,
      hackathonEndTime: config.hackathonEndTime,
      reviewRoundName: config.reviewRoundName,
      reviewRoundEndTime: config.reviewRoundEndTime,
      soundEnabled: config.soundEnabled
    }});
  } catch (error) {
    console.error('Error writing timer config:', error);
    return res.status(500).json({ error: 'Failed to save timer configuration' });
  }
});

export default router;
