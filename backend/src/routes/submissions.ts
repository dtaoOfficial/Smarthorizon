import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { generateDownloadToken, verifyDownloadToken, verifyAccessToken } from '../utils/jwt';
import { generateExcelWorkbook, streamPdfReport, generateCsvReport, formatTimestamp, sanitizeCell, ExportSheetDef } from '../utils/exportEngine';
import { getTeamSubmissionCategoryDir, sanitizeName } from '../utils/submissionStorage';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const router = Router();

// Word count calculation helper (splits on whitespace/newlines and filters empty strings)
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// GitHub URL validation helper
export function isValidGitHubUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const githubRegex = /^https:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/)?$/i;
  return githubRegex.test(trimmed) || (trimmed.toLowerCase().includes('github.com/') && trimmed.startsWith('https://'));
}

// Multer storage & filter configuration for PPT/PPTX presentation uploads (25MB max)
const storage = multer.memoryStorage();
const uploadPresentation = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.ppt', '.pptx'];
    const allowedMimes = [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/octet-stream',
      'application/x-mspowerpoint',
      'application/powerpoint',
      'application/mspowerpoint',
      'application/x-powerpoint',
      'application/x-dos_ms_powerpoint',
      'application/pot',
      'application/pps',
    ];

    if (!allowedExts.includes(ext)) {
      return cb(new Error('INVALID_FILE_TYPE: Only PowerPoint presentation files (.ppt, .pptx) are allowed.'));
    }

    if (file.mimetype && !allowedMimes.includes(file.mimetype.toLowerCase())) {
      // Log warning but proceed if extension matches
      console.warn(`Uploading file with non-standard MIME type ${file.mimetype} for extension ${ext}`);
    }

    cb(null, true);
  },
});

// Helper: Check if submissions are open globally and currently active
async function getSubmissionOpenState() {
  const activeHackathon = await prisma.hackathon.findFirst({
    where: { active: true },
  });

  if (!activeHackathon) {
    return {
      activeHackathon: null,
      submissionsOpen: false,
      isCurrentlyOpen: false,
      reason: 'No active hackathon found',
    };
  }

  const now = new Date();
  let isWithinTimeWindow = true;

  if (activeHackathon.submissionOpenTime && now < activeHackathon.submissionOpenTime) {
    isWithinTimeWindow = false;
  }
  if (activeHackathon.submissionCloseTime && now > activeHackathon.submissionCloseTime) {
    isWithinTimeWindow = false;
  }

  const isCurrentlyOpen = activeHackathon.submissionsOpen && isWithinTimeWindow;

  return {
    activeHackathon,
    submissionsOpen: activeHackathon.submissionsOpen,
    submissionOpenTime: activeHackathon.submissionOpenTime,
    submissionCloseTime: activeHackathon.submissionCloseTime,
    isCurrentlyOpen,
    reason: !activeHackathon.submissionsOpen
      ? 'Submissions are currently closed by administration.'
      : !isWithinTimeWindow
      ? 'Submissions are outside the configured schedule window.'
      : 'Open',
  };
}

// ==========================================
// 1. GET /api/submissions/status - Public/Auth Submission Status
// ==========================================
router.get('/status', async (req, res) => {
  try {
    const state = await getSubmissionOpenState();
    return res.json({
      submissionsOpen: state.submissionsOpen,
      isCurrentlyOpen: state.isCurrentlyOpen,
      submissionOpenTime: state.submissionOpenTime,
      submissionCloseTime: state.submissionCloseTime,
      reason: state.reason,
    });
  } catch (error) {
    console.error('Fetch submission status error:', error);
    return res.json({ submissionsOpen: false, isCurrentlyOpen: false });
  }
});

// ==========================================
// 2. POST /api/submissions/toggle - Admin Toggle & Schedule Controls
// ==========================================
router.post('/toggle', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { open, openTime, closeTime } = req.body;
    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.status(400).json({ error: 'No active hackathon found' });
    }

    const updatedOpen = typeof open === 'boolean' ? open : !activeHackathon.submissionsOpen;

    const dataToUpdate: any = {
      submissionsOpen: updatedOpen,
    };

    if (openTime !== undefined) {
      dataToUpdate.submissionOpenTime = openTime ? new Date(openTime) : null;
    }
    if (closeTime !== undefined) {
      dataToUpdate.submissionCloseTime = closeTime ? new Date(closeTime) : null;
    }

    await prisma.hackathon.update({
      where: { id: activeHackathon.id },
      data: dataToUpdate,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        actorRole: 'ADMINISTRATOR',
        action: updatedOpen ? 'SUBMISSION_OPENED' : 'SUBMISSION_CLOSED',
        details: `Administrator ${updatedOpen ? 'opened' : 'closed'} project submissions globally.`,
      },
    });

    const state = await getSubmissionOpenState();

    return res.json({
      success: true,
      submissionsOpen: state.submissionsOpen,
      isCurrentlyOpen: state.isCurrentlyOpen,
      submissionOpenTime: state.submissionOpenTime,
      submissionCloseTime: state.submissionCloseTime,
      message: `Submissions are now ${updatedOpen ? 'OPEN' : 'CLOSED'}.`,
    });
  } catch (error) {
    console.error('Toggle submissions error:', error);
    return res.status(500).json({ error: 'Failed to toggle submission state' });
  }
});

// ==========================================
// 3. GET /api/submissions/my-team - Get Current Team's Submission
// ==========================================
router.get('/my-team', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'STUDENT') {
      return res.status(403).json({ error: 'Access denied: Student role required' });
    }

    // Find student's team
    const member = await prisma.teamMember.findFirst({
      where: { userId },
      select: { teamId: true, role: true },
    });

    let teamId: string | null = member?.teamId || null;
    let isLeader = member?.role === 'LEADER';

    if (!teamId) {
      const teamByLead = await prisma.team.findFirst({
        where: { leadEmail: req.user?.email },
        select: { id: true },
      });
      if (teamByLead) {
        teamId = teamByLead.id;
        isLeader = true;
      }
    }

    if (!teamId) {
      return res.status(404).json({ error: 'You are not assigned to any registered team.' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        track: { select: { id: true, name: true } },
        members: true,
        projectSubmission: {
          include: {
            submittedBy: { select: { name: true, email: true } },
            revisions: {
              orderBy: { createdAt: 'desc' },
              include: { submittedBy: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team record not found.' });
    }

    const state = await getSubmissionOpenState();

    return res.json({
      isCurrentlyOpen: state.isCurrentlyOpen,
      submissionsOpen: state.submissionsOpen,
      submissionOpenTime: state.submissionOpenTime,
      submissionCloseTime: state.submissionCloseTime,
      isLeader,
      team: {
        id: team.id,
        name: team.name,
        teamCode: team.teamCode,
        registrationId: team.registrationId,
        trackName: team.track.name,
        college: team.college || team.collegeName,
        projectTitle: team.projectTitle,
        projectDesc: team.projectDesc,
        projectUrl: team.projectUrl,
        presentationUrl: team.presentationUrl,
      },
      submission: team.projectSubmission || null,
    });
  } catch (error) {
    console.error('Fetch my-team submission error:', error);
    return res.status(500).json({ error: 'Failed to fetch team submission' });
  }
});

// ==========================================
// 4. POST /api/submissions/upload-presentation - Upload Presentation File (.ppt / .pptx)
// ==========================================
router.post(
  '/upload-presentation',
  authenticateToken,
  uploadPresentation.single('presentation'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      if (!req.file) return res.status(400).json({ error: 'PowerPoint presentation file is required.' });

      // Verify team membership & role permissions
      let teamId = req.body.teamId;
      if (userRole === 'STUDENT') {
        const member = await prisma.teamMember.findFirst({
          where: { userId },
          select: { teamId: true },
        });
        if (!member) {
          const leadTeam = await prisma.team.findFirst({ where: { leadEmail: req.user?.email } });
          if (!leadTeam) {
            return res.status(403).json({ error: 'Access denied: You are not assigned to a team.' });
          }
          teamId = leadTeam.id;
        } else {
          teamId = member.teamId;
        }
      } else if (userRole !== 'ADMINISTRATOR') {
        return res.status(403).json({ error: 'Access denied: Only team members or administrators can upload presentation files.' });
      }

      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) return res.status(404).json({ error: 'Team not found' });

      // Check submission open status server-side
      if (userRole === 'STUDENT') {
        const state = await getSubmissionOpenState();
        if (!state.isCurrentlyOpen) {
          return res.status(403).json({
            error: 'SERVER REJECTED: Project submissions are currently CLOSED by hackathon administration.',
          });
        }
      }

      // Check versioning history for team's presentation uploads
      const existingSubmission = await prisma.projectSubmission.findUnique({
        where: { teamId: team.id },
      });

      const lastFileRecord = await prisma.submissionFile.findFirst({
        where: { teamId: team.id, category: 'presentation' },
        orderBy: { version: 'desc' },
      });

      const nextVersion = Math.max(
        existingSubmission ? existingSubmission.version + 1 : 1,
        lastFileRecord ? lastFileRecord.version + 1 : 1
      );

      // Construct canonical team directory: submissions/SHIH26-TID-XXX_TEAM-NAME/presentation/
      const { absoluteDir, relativeDir } = getTeamSubmissionCategoryDir(team, 'presentation');
      const ext = path.extname(req.file.originalname).toLowerCase();
      const storedFileName = `presentation_v${nextVersion}${ext}`;
      const fullPath = path.join(absoluteDir, storedFileName);

      fs.writeFileSync(fullPath, req.file.buffer);

      const storagePath = `${relativeDir}/${storedFileName}`;

      // Create SubmissionFile DB Record
      const fileRecord = await prisma.submissionFile.create({
        data: {
          teamId: team.id,
          submissionId: existingSubmission?.id || null,
          category: 'presentation',
          originalFileName: req.file.originalname,
          storedFileName,
          mimeType: req.file.mimetype || (ext === '.ppt' ? 'application/vnd.ms-powerpoint' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
          fileSize: req.file.size,
          storagePath,
          version: nextVersion,
          uploadedById: userId,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          actorRole: userRole,
          action: 'SUBMISSION_FILE_UPLOADED',
          details: `Uploaded presentation "${req.file.originalname}" (v${nextVersion}, ${(req.file.size / (1024 * 1024)).toFixed(2)} MB) for Team "${team.name}". Storage path: ${storagePath}`,
          resource: 'SubmissionFile',
          resourceId: fileRecord.id,
        },
      });

      return res.json({
        success: true,
        message: `PowerPoint presentation (v${nextVersion}) uploaded successfully.`,
        presentationUrl: storagePath,
        originalFileName: req.file.originalname,
        storedFileName,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        version: nextVersion,
        fileId: fileRecord.id,
      });
    } catch (error: any) {
      console.error('Upload presentation error:', error);
      return res.status(500).json({ error: error.message || 'Failed to upload presentation' });
    }
  }
);

// ==========================================
// 5. POST /api/submissions/submit - Submit or Update Project Submission
// ==========================================
const submitSchema = z.object({
  projectTitle: z
    .string()
    .trim()
    .min(3, 'Project Title must be at least 3 characters long.')
    .max(150, 'Project Title cannot exceed 150 characters.'),
  projectAbstract: z.string().trim().min(10, 'Project Abstract is required (minimum 10 characters).'),
  githubUrl: z.string().trim().min(1, 'Public GitHub repository URL is required.'),
  presentationUrl: z.string().trim().min(1, 'PowerPoint presentation file is required.'),
  originalFileName: z.string().optional(),
  fileSize: z.number().optional(),
});

router.post('/submit', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'STUDENT') {
      return res.status(403).json({ error: 'Access denied: Student role required' });
    }

    // 1. Check Server-Side Submissions Open State (CRITICAL)
    const state = await getSubmissionOpenState();
    if (!state.isCurrentlyOpen) {
      return res.status(403).json({
        error: 'SERVER REJECTED: Project submissions are currently CLOSED by hackathon administration.',
      });
    }

    // 2. Find team & verify leader / membership
    const member = await prisma.teamMember.findFirst({
      where: { userId },
      include: { team: true },
    });

    let team = member?.team || null;
    let isLeader = member?.role === 'LEADER';

    if (!team) {
      const leadTeam = await prisma.team.findFirst({ where: { leadEmail: req.user?.email } });
      if (leadTeam) {
        team = leadTeam;
        isLeader = true;
      }
    }

    if (!team) {
      return res.status(404).json({ error: 'You are not assigned to any team.' });
    }

    if (!isLeader && member?.role !== 'MEMBER') {
      return res.status(403).json({ error: 'Access denied: Only team leader or members can submit.' });
    }

    // 3. Validate Payload
    const parseResult = submitSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { projectTitle, projectAbstract, githubUrl, presentationUrl, originalFileName, fileSize } = parseResult.data;

    // 4. Server-Side Abstract Word Count Check (MUST BE <= 100 WORDS)
    const wordCount = countWords(projectAbstract);
    if (wordCount > 100) {
      return res.status(400).json({
        error: `Project Abstract exceeds 100 words. Current count: ${wordCount} words. Please edit your abstract to be 100 words or fewer.`,
      });
    }

    // 5. Server-Side GitHub URL Validation
    if (!isValidGitHubUrl(githubUrl)) {
      return res.status(400).json({
        error: 'Invalid GitHub URL. Must be a valid public GitHub repository URL (e.g. https://github.com/username/repository).',
      });
    }

    // 6. Database Upsert & Revision Logging (Atomic Transaction)
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const existingSubmission = await tx.projectSubmission.findUnique({
        where: { teamId: team!.id },
      });

      const nextVersion = existingSubmission ? existingSubmission.version + 1 : 1;
      const fileNameToSave = originalFileName || existingSubmission?.originalFileName || `Presentation_Team_${team!.teamCode || team!.id}.pptx`;
      const sizeToSave = fileSize || existingSubmission?.fileSize || 0;

      const submission = await tx.projectSubmission.upsert({
        where: { teamId: team!.id },
        update: {
          projectTitle,
          projectAbstract,
          githubUrl,
          presentationUrl,
          originalFileName: fileNameToSave,
          fileSize: sizeToSave,
          status: 'SUBMITTED',
          submittedById: userId,
          version: nextVersion,
          updatedAt: now,
        },
        create: {
          teamId: team!.id,
          projectTitle,
          projectAbstract,
          githubUrl,
          presentationUrl,
          originalFileName: fileNameToSave,
          fileSize: sizeToSave,
          status: 'SUBMITTED',
          submittedById: userId,
          version: 1,
          submittedAt: now,
        },
      });

      // Update any unlinked submission files for this team to point to this submission
      await tx.submissionFile.updateMany({
        where: { teamId: team!.id, submissionId: null },
        data: { submissionId: submission.id },
      });

      // Save revision history record
      await tx.projectSubmissionRevision.create({
        data: {
          submissionId: submission.id,
          projectTitle,
          projectAbstract,
          githubUrl,
          presentationUrl,
          originalFileName: fileNameToSave,
          fileSize: sizeToSave,
          version: nextVersion,
          submittedById: userId,
        },
      });

      // Update Team model canonical fields for 100% backward compatibility
      await tx.team.update({
        where: { id: team!.id },
        data: {
          projectTitle,
          projectDesc: projectAbstract,
          projectUrl: githubUrl,
          presentationUrl,
          repoVisibility: 'PUBLIC',
          repoLastUpdated: now,
        },
      });

      // Log Audit Event
      await tx.auditLog.create({
        data: {
          userId,
          actorRole: userRole,
          action: existingSubmission ? 'SUBMISSION_UPDATED' : 'SUBMISSION_CREATED',
          details: `${existingSubmission ? 'Updated' : 'Created'} project submission (v${nextVersion}) for Team "${team!.name}". Title: "${projectTitle}". Abstract: ${wordCount} words.`,
          resource: 'ProjectSubmission',
          resourceId: submission.id,
        },
      });

      return submission;
    });

    return res.json({
      success: true,
      message: `Project submission ${result.version > 1 ? 'updated' : 'received'} successfully!`,
      submission: result,
      submittedAt: result.updatedAt,
    });
  } catch (error: any) {
    console.error('Submit project error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process project submission' });
  }
});

// ==========================================
// 6. GET /api/submissions/admin/all - Admin Submissions Dashboard & List
// ==========================================
router.get('/admin/all', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
    const state = await getSubmissionOpenState();

    const teams = await prisma.team.findMany({
      where: activeHackathon ? { hackathonId: activeHackathon.id } : {},
      include: {
        track: { select: { id: true, name: true } },
        members: true,
        submissionFiles: {
          orderBy: { createdAt: 'desc' },
        },
        projectSubmission: {
          include: {
            submittedBy: { select: { name: true, email: true } },
            revisions: {
              select: { id: true, version: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const totalTeams = teams.length;
    const submittedTeams = teams.filter((t) => !!t.projectSubmission);
    const submittedCount = submittedTeams.length;
    const pendingCount = totalTeams - submittedCount;
    const submissionRatePercent = totalTeams > 0 ? Number(((submittedCount / totalTeams) * 100).toFixed(1)) : 0;

    const list = teams.map((t) => {
      const leader = t.members.find((m) => m.role === 'LEADER') || t.members[0];
      const sub = t.projectSubmission;

      return {
        teamId: t.id,
        teamCode: t.teamCode || t.id.substring(0, 8).toUpperCase(),
        registrationId: t.registrationId || t.teamCode,
        name: t.name,
        trackId: t.trackId,
        trackName: t.track.name,
        college: t.college || t.collegeName || 'N/A',
        leadName: t.leadName || leader?.name || 'N/A',
        leadEmail: t.leadEmail || leader?.email || 'N/A',
        status: sub ? 'SUBMITTED' : 'NOT_SUBMITTED',
        projectTitle: sub?.projectTitle || t.projectTitle || null,
        projectAbstract: sub?.projectAbstract || t.projectDesc || null,
        wordCount: sub?.projectAbstract ? countWords(sub.projectAbstract) : 0,
        githubUrl: sub?.githubUrl || t.projectUrl || null,
        presentationUrl: sub?.presentationUrl || t.presentationUrl || null,
        originalFileName: sub?.originalFileName || (t.presentationUrl ? path.basename(t.presentationUrl) : null),
        submissionFiles: t.submissionFiles || [],
        fileSize: sub?.fileSize || 0,
        version: sub?.version || 1,
        revisionCount: sub?.revisions?.length || (sub ? 1 : 0),
        submittedAt: sub?.submittedAt || null,
        updatedAt: sub?.updatedAt || null,
        submittedByName: sub?.submittedBy?.name || null,
      };
    });

    return res.json({
      summary: {
        totalTeams,
        submittedCount,
        pendingCount,
        submissionRatePercent,
        submissionsOpen: state.submissionsOpen,
        isCurrentlyOpen: state.isCurrentlyOpen,
        submissionOpenTime: state.submissionOpenTime,
        submissionCloseTime: state.submissionCloseTime,
      },
      submissions: list,
    });
  } catch (error) {
    console.error('Fetch admin submissions error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin submission overview' });
  }
});

// ==========================================
// 7. GET /api/submissions/admin/export-csv - Stream CSV Export of Submissions
// ==========================================
router.get('/export-csv', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trackId, status, search } = req.query;

    const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });

    const teams = await prisma.team.findMany({
      where: {
        ...(activeHackathon ? { hackathonId: activeHackathon.id } : {}),
        ...(trackId && typeof trackId === 'string' && trackId !== 'all' ? { trackId } : {}),
      },
      include: {
        track: { select: { name: true } },
        members: true,
        projectSubmission: true,
      },
      orderBy: { name: 'asc' },
    });

    let filtered = teams;

    if (status === 'submitted') {
      filtered = filtered.filter((t: any) => !!t.projectSubmission);
    } else if (status === 'pending') {
      filtered = filtered.filter((t: any) => !t.projectSubmission);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (t: any) =>
          t.name.toLowerCase().includes(q) ||
          (t.teamCode && t.teamCode.toLowerCase().includes(q)) ||
          (t.projectTitle && t.projectTitle.toLowerCase().includes(q)) ||
          (t.projectSubmission?.projectTitle && t.projectSubmission.projectTitle.toLowerCase().includes(q)) ||
          (t.leadName && t.leadName.toLowerCase().includes(q))
      );
    }

    const format = (req.query.format as string || 'xlsx').toLowerCase();

    // Summary Stats
    const totalTeams = filtered.length;
    const submittedCount = filtered.filter((t: any) => !!t.projectSubmission).length;
    const pendingCount = totalTeams - submittedCount;
    const submissionRatePct = totalTeams > 0 ? `${Math.round((submittedCount / totalTeams) * 100)}%` : '0%';

    // Track Breakdown Summary Table
    const trackSummaryMap: Record<string, { track: string; total: number; submitted: number; pending: number }> = {};
    filtered.forEach((t: any) => {
      const trName = t.track?.name || 'General';
      if (!trackSummaryMap[trName]) trackSummaryMap[trName] = { track: trName, total: 0, submitted: 0, pending: 0 };
      trackSummaryMap[trName].total += 1;
      if (t.projectSubmission) trackSummaryMap[trName].submitted += 1;
      else trackSummaryMap[trName].pending += 1;
    });

    const summaryHeaders = ['Track / Domain', 'Total Teams', 'Submitted Decks', 'Pending Decks', 'Submission Rate %'];
    const summaryRows = Object.values(trackSummaryMap).map(t => [
      t.track,
      t.total,
      t.submitted,
      t.pending,
      t.total > 0 ? `${Math.round((t.submitted / t.total) * 100)}%` : '0%',
    ]);

    // Sheet 1 Main Submissions Table
    const headers = [
      'Sl. No.',
      'Team ID',
      'Team Code',
      'Team Name',
      'Track',
      'Team Leader Name',
      'Team Leader Email',
      'Submission Status',
      'Project Title',
      'Project Abstract',
      'GitHub Repository URL',
      'Presentation File',
      'Submitted At',
    ];

    const submissionRows: any[][] = [];
    let slNo = 1;

    filtered.forEach((t) => {
      const leader = t.members.find((m) => m.role === 'LEADER') || t.members[0];
      const sub = t.projectSubmission;

      submissionRows.push([
        slNo++,
        t.registrationId || t.id.substring(0, 8).toUpperCase(),
        t.teamCode || 'N/A',
        t.name,
        t.track.name,
        t.leadName || leader?.name || 'N/A',
        t.leadEmail || leader?.email || 'N/A',
        sub ? 'SUBMITTED' : 'PENDING',
        sub?.projectTitle || t.projectTitle || 'N/A',
        sub?.projectAbstract || t.projectDesc || 'N/A',
        sub?.githubUrl || t.projectUrl || 'N/A',
        sub?.originalFileName || (t.presentationUrl ? path.basename(t.presentationUrl) : 'N/A'),
        sub?.submittedAt ? formatTimestamp(sub.submittedAt) : 'N/A',
      ]);
    });

    if (format === 'xlsx') {
      const sheets: ExportSheetDef[] = [
        {
          sheetName: 'SUBMISSIONS LIST',
          reportTitle: 'Smart Horizon 2026 — Project Submissions Master Roster',
          summaryStats: [
            { label: 'Total Teams', value: totalTeams },
            { label: 'Submissions Received', value: submittedCount },
            { label: 'Pending Submissions', value: pendingCount },
            { label: 'Submission Rate', value: submissionRatePct },
          ],
          headers,
          rows: submissionRows,
          colWidths: [8, 14, 14, 25, 20, 22, 28, 16, 25, 45, 35, 25, 22],
        },
        {
          sheetName: 'SUBMISSION STATUS SUMMARY',
          reportTitle: 'Smart Horizon 2026 — Track-Wise Submission Rates Summary',
          headers: summaryHeaders,
          rows: summaryRows,
        },
      ];

      const buffer = generateExcelWorkbook(sheets);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Submissions.xlsx"');
      return res.send(buffer);
    } else if (format === 'pdf') {
      return streamPdfReport(res, 'SmartHorizon2026_Submissions.pdf', {
        reportTitle: 'Smart Horizon 2026 — Project Submissions Report',
        summaryStats: [
          { label: 'Total Teams', value: totalTeams },
          { label: 'Submitted', value: submittedCount },
          { label: 'Pending', value: pendingCount },
        ],
        headers: ['Sl.', 'Team ID', 'Team Name', 'Track', 'Leader', 'Project Title', 'Status'],
        rows: submissionRows.map(r => [r[0], r[1], r[3], r[4], r[5], r[8], r[7]].map(String)),
        orientation: 'landscape',
      });
    } else {
      const csvStr = generateCsvReport(headers, submissionRows.map(r => r.map(String)));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Submissions.csv"');
      return res.send(csvStr);
    }
  } catch (error) {
    console.error('Export CSV error:', error);
    return res.status(500).json({ error: 'Failed to generate submissions export' });
  }
});

// Single-use consumed download nonces store to prevent replay attacks
const consumedDownloadNonces = new Set<string>();

// Cleanup consumed nonces every 10 minutes
setInterval(() => {
  consumedDownloadNonces.clear();
}, 10 * 60 * 1000);

// ==========================================
// 8A. POST /api/submissions/download-token/:teamId - Issue Short-Lived Single-Use Download Token (60s)
// ==========================================
router.post('/download-token/:teamId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId || !userRole) return res.status(401).json({ error: 'Unauthorized' });

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Authorization evaluation
    if (userRole === 'STUDENT') {
      const isMember = team.members.some((m) => m.userId === userId);
      const isLead = team.leadEmail && req.user?.email && team.leadEmail.toLowerCase() === req.user.email.toLowerCase();
      if (!isMember && !isLead) {
        return res.status(403).json({ error: 'Access denied: You can only request download tokens for your own team.' });
      }
    } else if (userRole === 'JUDGE') {
      const isAssigned = await prisma.judgeAssignment.findFirst({
        where: { judgeId: userId, teamId: team.id }
      });
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied: You are not assigned to evaluate this team.' });
      }
    } else if (userRole !== 'ADMINISTRATOR') {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions.' });
    }

    const downloadToken = generateDownloadToken({ userId, role: userRole, teamId: team.id });
    return res.json({ success: true, downloadToken, expiresInSeconds: 60 });
  } catch (error) {
    console.error('Generate download token error:', error);
    return res.status(500).json({ error: 'Failed to issue single-use download token' });
  }
});

// ==========================================
// 8B. GET /api/submissions/download/:teamId - Download Individual Presentation PPT File
// ==========================================
router.get('/download/:teamId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teamId } = req.params;
    let userId: string | undefined;
    let userRole: string | undefined;

    // Check 1: Authorization Header (Bearer Token)
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];

    if (bearerToken) {
      const payload = verifyAccessToken(bearerToken);
      if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired authentication token' });
      }
      userId = payload.userId;
      userRole = payload.role;
    } else if (req.query.downloadToken && typeof req.query.downloadToken === 'string') {
      // Check 2: Single-Purpose Short-Lived Download Token (60s Expiration)
      const downloadPayload = verifyDownloadToken(req.query.downloadToken);
      if (!downloadPayload) {
        return res.status(401).json({ error: 'Invalid or expired download token.' });
      }

      if (downloadPayload.teamId !== teamId) {
        return res.status(403).json({ error: 'Download token is not valid for this file.' });
      }

      // Check single-use nonce
      if (consumedDownloadNonces.has(downloadPayload.nonce)) {
        return res.status(403).json({ error: 'Download token has already been consumed.' });
      }

      // Mark single-use nonce as consumed
      consumedDownloadNonces.add(downloadPayload.nonce);
      userId = downloadPayload.userId;
      userRole = downloadPayload.role;
    } else {
      return res.status(401).json({ error: 'Authentication required. Authorization header or valid download token required.' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true, projectSubmission: true },
    });

    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Server-Side Database-Backed Authorization
    if (userRole === 'STUDENT') {
      const isMember = team.members.some((m) => m.userId === userId);
      const isLead = team.leadEmail && team.members.some(m => m.userId === userId);
      if (!isMember && !isLead) {
        return res.status(403).json({ error: 'Access denied: You can only download your own team presentation.' });
      }
    } else if (userRole === 'JUDGE') {
      const isAssigned = await prisma.judgeAssignment.findFirst({
        where: { judgeId: userId, teamId: team.id }
      });
      if (!isAssigned) {
        return res.status(403).json({ error: 'Access denied: You can only download presentations for teams assigned to you.' });
      }
    } else if (userRole !== 'ADMINISTRATOR') {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions.' });
    }

    const pptPath = team.projectSubmission?.presentationUrl || team.presentationUrl;
    if (!pptPath) {
      return res.status(404).json({ error: 'No presentation uploaded for this team.' });
    }

    const uploadsDir = path.resolve(__dirname, '../../uploads');
    const normalizedRelative = path.normalize(pptPath).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.resolve(__dirname, '../../', normalizedRelative.startsWith('/') ? normalizedRelative.substring(1) : normalizedRelative);

    if (!absolutePath.startsWith(uploadsDir) || !fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Presentation file not found on server storage.' });
    }

    const ext = path.extname(absolutePath).toLowerCase() || '.pptx';
    const cleanTeamName = team.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const downloadFilename = `SHIH26-${team.teamCode || team.id.substring(0, 8)}_${cleanTeamName}${ext}`;

    const mimeType = ext === '.ppt'
      ? 'application/vnd.ms-powerpoint'
      : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadFilename)}"; filename*=UTF-8''${encodeURIComponent(downloadFilename)}`);
    res.setHeader('Cache-Control', 'private, no-transform, no-store');
    return res.download(absolutePath, downloadFilename);
  } catch (error) {
    console.error('Download presentation error:', error);
    return res.status(500).json({ error: 'Failed to download presentation file' });
  }
});

// ==========================================
// 9. GET /api/submissions/admin/download-all-zip - Bulk Download Presentations as ZIP
// ==========================================
router.get('/admin/download-all-zip', authenticateToken, requireRole(['ADMINISTRATOR']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { trackId } = req.query;

    const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });

    const teams = await prisma.team.findMany({
      where: {
        ...(activeHackathon ? { hackathonId: activeHackathon.id } : {}),
        ...(trackId && typeof trackId === 'string' && trackId !== 'all' ? { trackId } : {}),
      },
      include: {
        track: { select: { name: true } },
        projectSubmission: true,
      },
    });

    const submittedTeams = teams.filter((t) => t.projectSubmission || t.presentationUrl);

    if (submittedTeams.length === 0) {
      return res.status(404).json({ error: 'No submitted presentations found for the selected filter.' });
    }

    const zip = new AdmZip();
    let fileCount = 0;

    for (const team of submittedTeams) {
      const relPath = team.projectSubmission?.presentationUrl || team.presentationUrl;
      if (!relPath) continue;

      const absolutePath = path.join(__dirname, '../../', relPath.startsWith('/') ? relPath : `/${relPath}`);

      if (fs.existsSync(absolutePath)) {
        const ext = path.extname(absolutePath).toLowerCase() || '.pptx';
        const cleanTeamName = team.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const cleanTrack = team.track.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const zipEntryName = `${cleanTrack}/SHIH26-${team.teamCode || team.id.substring(0, 8)}_${cleanTeamName}${ext}`;

        const fileBuffer = fs.readFileSync(absolutePath);
        zip.addFile(zipEntryName, fileBuffer);
        fileCount++;
      }
    }

    if (fileCount === 0) {
      return res.status(404).json({ error: 'None of the submitted presentation files could be found in storage.' });
    }

    const zipBuffer = zip.toBuffer();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipFilename = `SmartHorizon_Presentations_${timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    return res.send(zipBuffer);
  } catch (error) {
    console.error('Bulk ZIP download error:', error);
    return res.status(500).json({ error: 'Failed to generate bulk presentations ZIP file' });
  }
});

export default router;
