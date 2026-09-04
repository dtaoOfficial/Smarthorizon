import { Router, Response } from 'express';
import prisma from '../db';
import { authenticateToken, AuthenticatedRequest, requireRole } from '../middleware/auth';
import { z } from 'zod';
import { generateTeamCode } from '../utils/qr';
import { generateExcelWorkbook, streamPdfReport, generateCsvReport, formatTimestamp, sanitizeCell, ExportSheetDef } from '../utils/exportEngine';
import QRCode from 'qrcode';
import AdmZip from 'adm-zip';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

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


const VALID_PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];
const phoneRegex = /^[+]*[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;

// Helper: Normalize incoming import object from snake_case, camelCase, or Space Case
function normalizeRowData(raw: any) {
  const getVal = (keys: string[]) => {
    for (const key of keys) {
      if (raw[key] !== undefined && raw[key] !== null) {
        const val = String(raw[key]).trim();
        if (val.length > 0) return val;
      }
    }
    return '';
  };

  const paymentRaw = getVal(['payment_status_final', 'paymentStatusFinal', 'paymentStatus', 'Payment Status', 'payment_status']).toUpperCase();
  const paymentStatus = VALID_PAYMENT_STATUSES.includes(paymentRaw) ? paymentRaw : 'PENDING';

  return {
    registrationId: getVal(['registration_id', 'registrationId', 'Registration ID', 'registrationID', 'reg_id']),
    teamName: getVal(['team_name', 'teamName', 'Team Name', 'name']),
    collegeName: getVal(['college_name', 'collegeName', 'College Name', 'college']),
    domain: getVal(['domain', 'Domain', 'trackName', 'track_name', 'track']),
    trackName: getVal(['domain', 'Domain', 'trackName', 'track_name', 'track']),
    selectedPsId: getVal(['selected_ps_id', 'selectedPsId', 'Selected PS ID', 'problemStatement', 'problem_statement', 'ps_id']),
    mentorName1: getVal(['mentor_name_1', 'mentorName1', 'Mentor Name 1', 'mentor_name', 'mentor']),
    
    leadName: getVal(['lead_name', 'leadName', 'Lead Name', 'leaderName', 'leader_name']),
    leadEmail: getVal(['lead_email', 'leadEmail', 'Lead Email', 'leaderEmail', 'leader_email']),
    leadMobile: getVal(['lead_mobile', 'leadMobile', 'Lead Mobile', 'leaderPhone', 'lead_phone']),
    leadUsn: getVal(['lead_usn', 'leadUsn', 'Lead USN', 'leaderUsn', 'lead_usn_no']),

    member2Name: getVal(['member2_name', 'member2Name', 'Member 2 Name']),
    member2Email: getVal(['member2_email', 'member2Email', 'Member 2 Email']),
    member2Mobile: getVal(['member2_mobile', 'member2Mobile', 'Member 2 Mobile']),
    member2Usn: getVal(['member2_usn', 'member2Usn', 'Member 2 USN']),

    member3Name: getVal(['member3_name', 'member3Name', 'Member 3 Name']),
    member3Email: getVal(['member3_email', 'member3Email', 'Member 3 Email']),
    member3Mobile: getVal(['member3_mobile', 'member3Mobile', 'Member 3 Mobile']),
    member3Usn: getVal(['member3_usn', 'member3Usn', 'Member 3 USN']),

    member4Name: getVal(['member4_name', 'member4Name', 'Member 4 Name']),
    member4Email: getVal(['member4_email', 'member4Email', 'Member 4 Email']),
    member4Mobile: getVal(['member4_mobile', 'member4Mobile', 'Member 4 Mobile']),
    member4Usn: getVal(['member4_usn', 'member4Usn', 'Member 4 USN']),

    member5Name: getVal(['member5_name', 'member5Name', 'Member 5 Name']),
    member5Email: getVal(['member5_email', 'member5Email', 'Member 5 Email']),
    member5Mobile: getVal(['member5_mobile', 'member5Mobile', 'Member 5 Mobile']),
    member5Usn: getVal(['member5_usn', 'member5Usn', 'Member 5 USN']),

    paymentStatusFinal: paymentStatus,
    rawPaymentInput: paymentRaw,
  };
}

// 1. GET /api/registration/attendance-summary
router.get('/attendance-summary', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trackId = req.query.trackId as string | undefined;

    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.json({
        totalRegistered: 0,
        checkedIn: 0,
        pending: 0,
        totalParticipants: 0,
        checkedInParticipants: 0,
        absentParticipants: 0,
        attendancePercentage: 0,
      });
    }

    const teamFilter = {
      hackathonId: activeHackathon.id,
      ...(trackId ? { trackId } : {}),
    };

    const totalRegistered = await prisma.team.count({ where: teamFilter });
    const checkedIn = await prisma.team.count({
      where: { ...teamFilter, checkedIn: true },
    });
    const pending = totalRegistered - checkedIn;

    // Fetch member attendance statistics
    const teams = await prisma.team.findMany({
      where: teamFilter,
      include: {
        members: true,
        attendance: true,
      }
    });

    let totalParticipants = 0;
    let checkedInParticipants = 0;

    teams.forEach(team => {
      let memberCount = team.members.length;
      if (memberCount === 0) {
        let count = 0;
        if (team.leadName) count++;
        if (team.member2Name) count++;
        if (team.member3Name) count++;
        if (team.member4Name) count++;
        if (team.member5Name) count++;
        memberCount = count > 0 ? count : 1;
      }
      totalParticipants += memberCount;

      const presentMemberIds = new Set(
        team.attendance.filter(a => a.memberId && a.status === 'PRESENT').map(a => a.memberId!)
      );

      if (presentMemberIds.size > 0) {
        checkedInParticipants += Math.min(memberCount, presentMemberIds.size);
      } else if (team.checkedIn) {
        checkedInParticipants += memberCount;
      }
    });

    const absentParticipants = Math.max(0, totalParticipants - checkedInParticipants);
    const attendancePercentage = totalRegistered > 0
      ? Math.round((checkedIn / totalRegistered) * 100)
      : 0;

    return res.json({
      totalRegistered,
      checkedIn,
      pending,
      totalParticipants,
      checkedInParticipants,
      absentParticipants,
      attendancePercentage,
    });
  } catch (error) {
    console.error('Attendance summary error:', error);
    return res.status(500).json({ error: 'Failed to fetch attendance summary' });
  }
});

// POST /api/registration/self-check-in
// Student team leader scans the QR code shown by Admin to verify and mark team PRESENT
router.post('/self-check-in', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userEmail = req.user?.email;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'QR Code payload is required.' });
    }

    const cleanCode = code.trim();

    // Find team for this student / team leader
    let team: any = await prisma.team.findFirst({
      where: {
        OR: [
          ...(userEmail ? [{ leadEmail: { equals: userEmail } }] : []),
          ...(userId ? [{ members: { some: { userId } } }] : []),
          ...(userEmail ? [{ members: { some: { email: { equals: userEmail } } } }] : []),
        ],
      },
      include: {
        members: true,
        track: { select: { name: true } },
      },
    });

    if (!team && userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.currentTeamId) {
        team = await prisma.team.findUnique({
          where: { id: user.currentTeamId },
          include: { members: true, track: { select: { name: true } } },
        });
      }
    }

    if (!team) {
      return res.status(400).json({ error: 'You are not associated with any registered hackathon team.' });
    }

    // Verify scanned code against team's QR code, teamCode, registrationId, or team ID
    const validCodes = [
      team.qrCode,
      team.teamCode,
      team.registrationId,
      team.id,
      `REG-${team.id.substring(0, 5).toUpperCase()}`,
      `SH26-${team.id.substring(0, 6).toUpperCase()}`,
    ].filter((c): c is string => Boolean(c));

    const matches = validCodes.some(
      (valid) => valid.toLowerCase() === cleanCode.toLowerCase() || cleanCode.toLowerCase().includes(valid.toLowerCase())
    );

    if (!matches) {
      return res.status(400).json({
        error: `QR Code mismatch! Scanned payload '${cleanCode}' does not match your team '${team.name}' (${team.registrationId || team.teamCode}). Please scan the exact QR code displayed by the Admin for your team.`,
      });
    }

        // Identify the specific member scanning the QR
    const targetMember = team.members.find((m: any) => m.userId === userId || (userEmail && m.email === userEmail));
    
    if (!targetMember) {
      return res.status(400).json({ error: 'You are not recognized as a registered member of this team.' });
    }

    // Mark ONLY this specific member as PRESENT
    await prisma.attendance.upsert({
      where: { id: (await prisma.attendance.findFirst({ where: { teamId: team.id, memberId: targetMember.id } }))?.id || '' },
      update: { status: 'PRESENT' },
      create: {
        teamId: team.id,
        memberId: targetMember.id,
        status: 'PRESENT',
        checkedInBy: `Self-Scanned Venue QR Code (${req.user?.name || req.user?.email})`,
      },
    });

    // Re-calculate team check-in status
    const allAttendance = await prisma.attendance.findMany({
      where: { teamId: team.id }
    });

    const presentMemberIds = new Set(
      allAttendance.filter(a => a.memberId && a.status === 'PRESENT').map(a => a.memberId!)
    );

    const totalMembers = team.members.length;
    const presentCount = presentMemberIds.size;

    let checkInStatus = 'PENDING';
    let isCheckedIn = false;

    if (presentCount === 0) {
      checkInStatus = 'PENDING';
      isCheckedIn = false;
    } else if (presentCount < totalMembers) {
      checkInStatus = 'PARTIALLY_CHECKED_IN';
      isCheckedIn = true;
    } else {
      checkInStatus = 'FULLY_CHECKED_IN';
      isCheckedIn = true;
    }

    const updatedTeam = await prisma.team.update({
      where: { id: team.id },
      data: {
        checkedIn: isCheckedIn,
        checkInTime: isCheckedIn ? (team.checkInTime || new Date()) : null,
        checkInStatus: checkInStatus,
        checkedInBy: isCheckedIn ? (team.checkedInBy || `Self-Scanned Venue QR Code`) : null,
      },
    });

    return res.json({
      success: true,
      message: `Check-In Verified Successfully! You (${targetMember.name}) have been marked PRESENT. Team status: ${checkInStatus}.`,
      team: updatedTeam,
    });
  } catch (error) {
    console.error('Self check-in error:', error);
    return res.status(500).json({ error: 'Failed to process self check-in' });
  }
});


// 2. GET /api/registration/teams (paginated, searched across all registration fields)
router.get('/teams', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const trackId = req.query.trackId as string | undefined;
    const search = (req.query.search as string || '').trim();
    const sortBy = req.query.sortBy as string || 'registrationId';
    const sortOrder = (req.query.sortOrder as string || 'asc') === 'desc' ? 'desc' : 'asc';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.json({ teams: [], total: 0 });
    }

    const status = req.query.status as string | undefined;
    const paymentStatus = (req.query.paymentStatus || req.query.payment_status_final) as string | undefined;

    // Build multi-field search clause
    const whereClause: any = {
      hackathonId: activeHackathon.id,
      ...(trackId ? { trackId } : {}),
      ...(status ? { checkedIn: status === 'checkedIn' || status === 'true' } : {}),
      ...(paymentStatus ? { paymentStatusFinal: paymentStatus.toUpperCase() } : {}),
      ...(search ? {
        OR: [
          { teamCode: { contains: search } },
          { registrationId: { contains: search } },
          { name: { contains: search } },
          { college: { contains: search } },
          { collegeName: { contains: search } },
          { domain: { contains: search } },
          { selectedPsId: { contains: search } },
          { problemStatement: { contains: search } },
          { mentorName1: { contains: search } },
          { leadName: { contains: search } },
          { leadEmail: { contains: search } },
          { leadMobile: { contains: search } },
          { leadUsn: { contains: search } },
          { member2Name: { contains: search } },
          { member2Email: { contains: search } },
          { member2Usn: { contains: search } },
          { member3Name: { contains: search } },
          { member3Email: { contains: search } },
          { member3Usn: { contains: search } },
          { member4Name: { contains: search } },
          { member4Email: { contains: search } },
          { member4Usn: { contains: search } },
          { member5Name: { contains: search } },
          { member5Email: { contains: search } },
          { member5Usn: { contains: search } },
          { projectTitle: { contains: search } },
          {
            members: {
              some: {
                OR: [
                  { name: { contains: search } },
                  { email: { contains: search } },
                ]
              }
            }
          }
        ]
      } : {})
    };

    let orderBy: any = {};
    if (sortBy === 'track') {
      orderBy = { track: { name: sortOrder } };
    } else if (sortBy === 'name') {
      orderBy = { name: sortOrder };
    } else if (sortBy === 'college') {
      orderBy = { collegeName: sortOrder };
    } else if (sortBy === 'checkInTime') {
      orderBy = { checkInTime: sortOrder };
    } else if (sortBy === 'checkedIn') {
      orderBy = { checkedIn: sortOrder };
    } else {
      orderBy = { registrationId: sortOrder };
    }

    const total = await prisma.team.count({ where: whereClause });
    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        track: { select: { id: true, name: true } },
        members: true,
        attendance: { select: { memberId: true, status: true } },
        judgeAssignments: { select: { judgeId: true } },
      },
      orderBy,
      skip,
      take: limit,
    });

    const mappedTeams = teams.map(team => ({
      id: team.id,
      trackId: team.trackId,
      registrationId: team.registrationId || team.id.substring(0, 8).toUpperCase(),
      registration_id: team.registrationId || team.id.substring(0, 8).toUpperCase(),
      name: team.name,
      teamName: team.name,
      team_name: team.name,
      teamCode: team.teamCode,
      qrCode: team.qrCode,
      trackName: team.track.name,
      assignedJudgeCount: team.judgeAssignments?.length || 0,
      college: team.college || team.collegeName || 'N/A',
      collegeName: team.collegeName || team.college || 'N/A',
      college_name: team.collegeName || team.college || 'N/A',
      domain: team.domain || team.track.name,
      selectedPsId: team.selectedPsId || team.problemStatement || 'N/A',
      selected_ps_id: team.selectedPsId || team.problemStatement || 'N/A',
      mentorName1: team.mentorName1 || 'Unassigned',
      mentor_name_1: team.mentorName1 || 'Unassigned',
      
      leadName: team.leadName || team.members.find(m => m.role === 'LEADER')?.name || team.members[0]?.name || 'N/A',
      leadEmail: team.leadEmail || team.members.find(m => m.role === 'LEADER')?.email || team.members[0]?.email || 'N/A',
      leadMobile: team.leadMobile || team.members.find(m => m.role === 'LEADER')?.phone || 'N/A',
      leadUsn: team.leadUsn || 'N/A',

      member2Name: team.member2Name || team.members[1]?.name || '',
      member2Email: team.member2Email || team.members[1]?.email || '',
      member2Mobile: team.member2Mobile || team.members[1]?.phone || '',
      member2Usn: team.member2Usn || '',

      member3Name: team.member3Name || team.members[2]?.name || '',
      member3Email: team.member3Email || team.members[2]?.email || '',
      member3Mobile: team.member3Mobile || team.members[2]?.phone || '',
      member3Usn: team.member3Usn || '',

      member4Name: team.member4Name || team.members[3]?.name || '',
      member4Email: team.member4Email || team.members[3]?.email || '',
      member4Mobile: team.member4Mobile || team.members[3]?.phone || '',
      member4Usn: team.member4Usn || '',

      member5Name: team.member5Name || team.members[4]?.name || '',
      member5Email: team.member5Email || team.members[4]?.email || '',
      member5Mobile: team.member5Mobile || team.members[4]?.phone || '',
      member5Usn: team.member5Usn || '',

      paymentStatusFinal: team.paymentStatusFinal || 'PENDING',
      payment_status_final: team.paymentStatusFinal || 'PENDING',

      membersCount: team.members.length,
      membersList: team.members.map(m => m.name).join(', '),
      members: (() => {
        const attMap = new Map((team as any).attendance?.map((a: any) => [a.memberId, a.status]) || []);
        return team.members.map(m => ({
          id: m.id,
          name: m.name,
          role: m.role || 'MEMBER',
          email: m.email || '',
          attendanceStatus: (attMap.get(m.id) as string) || 'ABSENT',
        }));
      })(),
      checkedIn: team.checkedIn,
      checkInStatus: (team as any).checkInStatus || (team.checkedIn ? 'FULLY_CHECKED_IN' : 'PENDING'),
      checkInTime: team.checkInTime,
      registrationStatus: team.checkedIn ? 'CONFIRMED' : 'REGISTERED',
    }));

    return res.json({
      teams: mappedTeams,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Fetch registration teams error:', error);
    return res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// 3. POST /api/registration/verify-scan
router.post('/verify-scan', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'QR Code is required' });
    }

    const cleanCode = code.trim();

    // Look up team by teamCode, qrCode, registrationId, or id
    const team = await prisma.team.findFirst({
      where: {
        OR: [
          { teamCode: cleanCode },
          { qrCode: cleanCode },
          { registrationId: cleanCode },
          { id: cleanCode },
        ]
      },
      include: {
        track: { select: { name: true } },
        judgeAssignments: { select: { judgeId: true } }
      }
    });

    if (!team) {
      return res.status(404).json({
        exists: false,
        error: 'Invalid QR Code. No matching team found in the database.',
      });
    }

    let isAssigned = true;
    let assignmentMessage = '';

    if (userRole === 'JUDGE' && userId) {
      const isJudgeAssigned = team.judgeAssignments.some(j => j.judgeId === userId);
      if (!isJudgeAssigned) {
        isAssigned = false;
        assignmentMessage = 'You are not assigned to evaluate this team.';
      }
    }

    // Log scan activity
    await prisma.auditLog.create({
      data: {
        userId,
        action: isAssigned ? 'QR_SCAN_SUCCESS' : 'UNAUTHORIZED_SCAN',
        details: `Scanned code "${cleanCode}" for Team "${team.name}" (Checked In: ${team.checkedIn}). ${assignmentMessage}`,
      }
    });

    return res.json({
      exists: true,
      teamId: team.id,
      teamName: team.name,
      teamCode: team.teamCode,
      registrationId: team.registrationId,
      trackName: team.track.name,
      checkedIn: team.checkedIn,
      checkInTime: team.checkInTime,
      isAssigned,
      message: assignmentMessage || (team.checkedIn ? 'Team is already checked in.' : 'Team ready for evaluation.'),
    });
  } catch (error) {
    console.error('Verify scan error:', error);
    return res.status(500).json({ error: 'Failed to verify scanned QR code' });
  }
});

// 3.5 POST /api/registration/self-check-in - Team Leader Self-Scan Check-In
router.post('/self-check-in', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userEmail = req.user?.email;
    const { code } = req.body || {};

    if (!userId || !userEmail) return res.status(401).json({ error: 'Unauthorized' });

    // Find the student's team
    const member = await prisma.teamMember.findFirst({
      where: { OR: [{ userId }, { email: userEmail }] },
      select: { teamId: true },
    });

    let teamId = member?.teamId;
    if (!teamId) {
      const leadTeam = await prisma.team.findFirst({
        where: { leadEmail: userEmail },
        select: { id: true },
      });
      teamId = leadTeam?.id;
    }

    if (!teamId) {
      return res.status(404).json({ error: 'No associated team found for your user account.' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { track: { select: { name: true } } },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Validate scanned QR code if provided
    if (code && typeof code === 'string' && code.trim().length > 0) {
      const sanitizedCode = code.trim().toUpperCase();
      const validCodes = [
        'SMARTHORIZON_VENUE_CHECKIN',
        'VENUE_CHECKIN_2026',
        'SMARTHORIZON2026',
        'CHECKIN_VENUE_2026',
        team.teamCode?.toUpperCase(),
        team.registrationId?.toUpperCase(),
        team.id.toUpperCase(),
      ].filter(Boolean);

      const isValid = validCodes.some((vc) => vc && (sanitizedCode === vc || sanitizedCode.includes(vc)));
      if (!isValid) {
        return res.status(400).json({
          error: `Invalid QR Code scanned ("${code}"). Please scan the official Venue Check-In QR Code displayed at the admin desk.`,
        });
      }
    }

    if (team.checkedIn) {
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        message: `Your team "${team.name}" is already marked PRESENT in the Admin Console.`,
        team: {
          id: team.id,
          name: team.name,
          registrationId: team.registrationId,
          checkedIn: true,
          checkInTime: team.checkInTime,
        },
      });
    }

    const now = new Date();
    let teamCode = team.teamCode;
    if (!teamCode) {
      teamCode = await generateTeamCode(team.trackId, team.track.name, prisma);
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        checkedIn: true,
        checkInTime: now,
        checkedInBy: `Self-Scanned Venue QR Code by Leader (${team.leadName || req.user?.email || 'Leader'})`,
        checkInStatus: 'CHECKED_IN',
        status: 'Checked In',
        teamCode,
        qrCode: teamCode,
        qrGeneratedAt: now,
      },
    });

    await prisma.attendance.create({
      data: {
        teamId: team.id,
        checkedInBy: userId,
        createdAt: now,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        actorRole: 'STUDENT',
        action: 'TEAM_SELF_CHECKIN',
        details: `Team Leader self-scanned QR code and marked Team "${team.name}" (${team.registrationId}) as PRESENT.`,
      },
    });

    return res.json({
      success: true,
      alreadyCheckedIn: false,
      message: `Check-In Verified! Team "${team.name}" is now marked PRESENT in the Admin Console.`,
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        registrationId: updatedTeam.registrationId,
        checkedIn: true,
        checkInTime: updatedTeam.checkInTime,
      },
    });
  } catch (error) {
    console.error('Self-check-in error:', error);
    return res.status(500).json({ error: 'Failed to complete self-check-in' });
  }
});

// 3.6 POST /api/registration/toggle-present - Admin Manual Present/Not Present Toggle Switch
router.post('/toggle-present', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teamId, present } = req.body;
    if (!teamId || typeof present !== 'boolean') {
      return res.status(400).json({ error: 'teamId and present boolean are required' });
    }

    const adminUser = req.user;
    const adminName = (adminUser as any)?.name || adminUser?.email || 'Admin/Volunteer';

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const now = new Date();

    if (present) {
      let teamCode = team.teamCode;
      if (!teamCode) {
        const track = await prisma.track.findUnique({ where: { id: team.trackId } });
        teamCode = await generateTeamCode(team.trackId, track?.name || 'General', prisma);
      }

      const updated = await prisma.team.update({
        where: { id: teamId },
        data: {
          checkedIn: true,
          checkInTime: now,
          checkedInBy: `Manually Marked Present by ${adminName}`,
          checkInStatus: 'FULLY_CHECKED_IN',
          status: 'Checked In',
          teamCode,
          qrCode: teamCode,
        },
      });

      // Update or create attendance records for all members
      const teamWithMembers = await prisma.team.findUnique({
        where: { id: teamId },
        include: { members: true },
      });

      if (teamWithMembers?.members) {
        for (const member of teamWithMembers.members) {
          const existing = await prisma.attendance.findFirst({
            where: { teamId: team.id, memberId: member.id },
          });
          if (existing) {
            await prisma.attendance.update({
              where: { id: existing.id },
              data: { status: 'PRESENT', checkedInBy: adminUser?.userId || 'ADMIN' },
            });
          } else {
            await prisma.attendance.create({
              data: {
                teamId: team.id,
                memberId: member.id,
                status: 'PRESENT',
                checkedInBy: adminUser?.userId || 'ADMIN',
                createdAt: now,
              },
            });
          }
        }
      }

      await prisma.auditLog.create({
        data: {
          userId: adminUser?.userId,
          actorRole: 'ADMINISTRATOR',
          action: 'ADMIN_MANUAL_PRESENT',
          details: `Admin ${adminName} manually marked Team "${team.name}" as PRESENT.`,
        },
      });

      return res.json({
        success: true,
        checkedIn: true,
        message: `Team "${team.name}" manually marked as PRESENT.`,
        team: updated,
      });
    } else {
      const updated = await prisma.team.update({
        where: { id: teamId },
        data: {
          checkedIn: false,
          checkInTime: null,
          checkedInBy: null,
          checkInStatus: 'PENDING',
          status: 'Registered',
        },
      });

      // Update all member attendance records to ABSENT
      await prisma.attendance.updateMany({
        where: { teamId: team.id, memberId: { not: null } },
        data: { status: 'ABSENT' },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminUser?.userId,
          actorRole: 'ADMINISTRATOR',
          action: 'ADMIN_MANUAL_NOT_PRESENT',
          details: `Admin ${adminName} manually marked Team "${team.name}" as NOT PRESENT.`,
        },
      });

      return res.json({
        success: true,
        checkedIn: false,
        message: `Team "${team.name}" manually marked as NOT PRESENT.`,
        team: updated,
      });
    }
  } catch (error) {
    console.error('Toggle present error:', error);
    return res.status(500).json({ error: 'Failed to toggle team present status' });
  }
});

// 4. POST /api/registration/check-in/:id
router.post('/check-in/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = req.user;

    if (!adminUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminNameOrEmail = (adminUser as any).name || adminUser.email || 'Venue Volunteer/Admin';

    // Execute check-in within a single atomic database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch team with track
      const team = await tx.team.findUnique({
        where: { id },
        include: { track: { select: { name: true } } }
      });

      if (!team) {
        throw new Error('TEAM_NOT_FOUND');
      }

      // 2. If already checked in, return existing QR and check-in details without generating a new QR
      if (team.checkedIn) {
        return {
          alreadyCheckedIn: true,
          team: {
            id: team.id,
            name: team.name,
            registrationId: team.registrationId,
            teamCode: team.teamCode,
            qrCode: team.qrCode,
            trackName: team.track.name,
            checkedIn: true,
            checkInTime: team.checkInTime,
            checkedInBy: team.checkedInBy || 'Venue Volunteer',
            qrGeneratedAt: team.qrGeneratedAt || team.checkInTime,
          }
        };
      }

      const now = new Date();

      // 3. Generate unique team code if missing (e.g. SH26-HC-001)
      let teamCode = team.teamCode;
      if (!teamCode) {
        teamCode = await generateTeamCode(team.trackId, team.track.name, tx);
      }

      const qrCode = teamCode;

      // 4. Update team check-in details & issue permanent QR code
      const updatedTeam = await tx.team.update({
        where: { id },
        data: {
          checkedIn: true,
          checkInTime: now,
          checkedInBy: adminNameOrEmail,
          status: 'Checked In',
          teamCode,
          qrCode,
          qrGeneratedAt: now,
        }
      });

      // 5. Create attendance log entry
      const attendanceLog = await tx.attendance.create({
        data: {
          teamId: id,
          checkedInBy: adminUser.userId,
          createdAt: now,
        }
      });

      // 6. Create detailed audit log entry
      await tx.auditLog.create({
        data: {
          userId: adminUser.userId,
          action: 'TEAM_CHECKIN_QR_ISSUED',
          details: `Issued venue QR code & checked in Team "${team.name}" (Code: ${teamCode}, Reg ID: ${team.registrationId}) by ${adminNameOrEmail}.`,
        }
      });

      return {
        alreadyCheckedIn: false,
        team: {
          id: updatedTeam.id,
          name: updatedTeam.name,
          registrationId: updatedTeam.registrationId,
          teamCode: updatedTeam.teamCode,
          qrCode: updatedTeam.qrCode,
          trackName: team.track.name,
          checkedIn: true,
          checkInTime: updatedTeam.checkInTime,
          checkedInBy: updatedTeam.checkedInBy,
          qrGeneratedAt: updatedTeam.qrGeneratedAt,
        },
        attendanceLog,
      };
    });

    return res.json({
      success: true,
      alreadyCheckedIn: result.alreadyCheckedIn,
      message: result.alreadyCheckedIn ? 'This team has already checked in.' : 'Team successfully checked in & QR badge issued.',
      team: result.team,
    });
  } catch (error: any) {
    if (error.message === 'TEAM_NOT_FOUND') {
      return res.status(404).json({ error: 'Team not found' });
    }
    console.error('Check-in transaction error:', error);
    return res.status(500).json({ error: 'Failed to complete venue check-in' });
  }
});

// 4. POST /api/registration/validate-import (Full Validation with all fields)
router.post('/validate-import', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawRows = req.body.rows;
    if (!Array.isArray(rawRows)) {
      return res.status(400).json({ error: 'Rows array is required' });
    }

    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
      include: { tracks: true },
    });

    if (!activeHackathon) {
      return res.status(400).json({ error: 'No active hackathon found to import into.' });
    }

    const validTracks = activeHackathon.tracks.map(t => t.name.toLowerCase());

    const dbTeams = await prisma.team.findMany({
      where: { hackathonId: activeHackathon.id },
      select: { name: true, registrationId: true },
    });
    const dbEmails = await prisma.user.findMany({
      select: { email: true },
    });

    const existingTeamNames = new Set(dbTeams.map(t => t.name.toLowerCase()));
    const existingRegIds = new Set(dbTeams.filter(t => t.registrationId).map(t => t.registrationId!.toLowerCase()));
    const existingEmails = new Set(dbEmails.map(u => u.email.toLowerCase()));

    const fileTeamNames = new Set<string>();
    const fileRegIds = new Set<string>();
    const fileEmails = new Set<string>();

    let totalParticipants = 0;
    let duplicateEmailsCount = 0;
    let duplicateRegIdsCount = 0;
    let missingFieldsCount = 0;
    let invalidTracksCount = 0;
    let existingTeamsCount = 0;
    let invalidMobilesCount = 0;
    let invalidPaymentStatusCount = 0;

    const tracksDetected = new Set<string>();

    const validationResults = rawRows.map((rawRow, index) => {
      const row = normalizeRowData(rawRow);
      const errors: string[] = [];
      let status: 'VALID' | 'INVALID' | 'DUPLICATE' | 'EXISTING' = 'VALID';

      // Required validation: Team Name & Lead Name & Lead Email
      if (!row.teamName) {
        errors.push('Missing required field: team_name');
        missingFieldsCount++;
        status = 'INVALID';
      }
      if (!row.leadName) {
        errors.push('Missing required field: lead_name');
        missingFieldsCount++;
        status = 'INVALID';
      }
      if (!row.leadEmail) {
        errors.push('Missing required field: lead_email');
        missingFieldsCount++;
        status = 'INVALID';
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailsToCheck: { label: string; email: string }[] = [];
      if (row.leadEmail) emailsToCheck.push({ label: 'lead_email', email: row.leadEmail });
      if (row.member2Email) emailsToCheck.push({ label: 'member2_email', email: row.member2Email });
      if (row.member3Email) emailsToCheck.push({ label: 'member3_email', email: row.member3Email });
      if (row.member4Email) emailsToCheck.push({ label: 'member4_email', email: row.member4Email });
      if (row.member5Email) emailsToCheck.push({ label: 'member5_email', email: row.member5Email });

      emailsToCheck.forEach(item => {
        if (!emailRegex.test(item.email)) {
          errors.push(`Invalid email format in ${item.label}: "${item.email}"`);
          status = 'INVALID';
        }
      });

      // Mobile format & length validation
      const phonesToCheck: { label: string; phone: string }[] = [];
      if (row.leadMobile) phonesToCheck.push({ label: 'lead_mobile', phone: row.leadMobile });
      if (row.member2Mobile) phonesToCheck.push({ label: 'member2_mobile', phone: row.member2Mobile });
      if (row.member3Mobile) phonesToCheck.push({ label: 'member3_mobile', phone: row.member3Mobile });
      if (row.member4Mobile) phonesToCheck.push({ label: 'member4_mobile', phone: row.member4Mobile });
      if (row.member5Mobile) phonesToCheck.push({ label: 'member5_mobile', phone: row.member5Mobile });

      phonesToCheck.forEach(item => {
        const digits = item.phone.replace(/[^0-9]/g, '');
        if (digits.length < 7 || digits.length > 15 || !phoneRegex.test(item.phone)) {
          errors.push(`Invalid phone format in ${item.label}: "${item.phone}"`);
          invalidMobilesCount++;
          status = 'INVALID';
        }
      });

      // Payment status validation
      if (row.rawPaymentInput && !VALID_PAYMENT_STATUSES.includes(row.rawPaymentInput.toUpperCase())) {
        errors.push(`Invalid payment status: "${row.rawPaymentInput}". Allowed: PENDING, PAID, FAILED, REFUNDED.`);
        invalidPaymentStatusCount++;
        status = 'INVALID';
      }

      // Check Registration ID uniqueness if provided
      if (row.registrationId) {
        const lowerReg = row.registrationId.toLowerCase();
        if (existingRegIds.has(lowerReg)) {
          status = 'EXISTING';
          duplicateRegIdsCount++;
          errors.push(`Duplicate Registration ID "${row.registrationId}" already exists in database.`);
        } else if (fileRegIds.has(lowerReg)) {
          status = 'DUPLICATE';
          duplicateRegIdsCount++;
          errors.push(`Duplicate Registration ID "${row.registrationId}" found in uploaded file.`);
        }
        fileRegIds.add(lowerReg);
      }

      // Check Team Name Duplicates
      if (row.teamName) {
        const lowerTeam = row.teamName.toLowerCase();
        if (existingTeamNames.has(lowerTeam)) {
          status = 'EXISTING';
          existingTeamsCount++;
          errors.push(`Team Name "${row.teamName}" already exists in database.`);
        } else if (fileTeamNames.has(lowerTeam)) {
          status = 'DUPLICATE';
          errors.push(`Duplicate Team Name "${row.teamName}" found in uploaded file.`);
        }
        fileTeamNames.add(lowerTeam);
      }

      // Check Email Duplicates
      emailsToCheck.forEach(item => {
        const lower = item.email.toLowerCase();
        if (existingEmails.has(lower)) {
          status = 'EXISTING';
          duplicateEmailsCount++;
          errors.push(`Email "${item.email}" already registered in database.`);
        } else if (fileEmails.has(lower)) {
          status = 'DUPLICATE';
          duplicateEmailsCount++;
          errors.push(`Duplicate email "${item.email}" found in uploaded file.`);
        }
        fileEmails.add(lower);
      });

      // Track Theme
      const domainOrTrack = row.domain || row.trackName || activeHackathon.tracks[0]?.name || 'Open Innovation';
      tracksDetected.add(domainOrTrack);

      // Count participants
      let participantCount = 0;
      if (row.leadName) participantCount++;
      if (row.member2Name) participantCount++;
      if (row.member3Name) participantCount++;
      if (row.member4Name) participantCount++;
      if (row.member5Name) participantCount++;
      totalParticipants += participantCount;

      return {
        rowNumber: index + 1,
        data: row,
        status,
        errors,
      };
    });

    const isAllValid = validationResults.every(r => r.status === 'VALID');

    return res.json({
      summary: {
        totalTeams: rawRows.length,
        totalParticipants,
        tracksDetected: Array.from(tracksDetected),
        duplicateEmails: duplicateEmailsCount,
        duplicateRegIds: duplicateRegIdsCount,
        missingFields: missingFieldsCount,
        invalidTracks: invalidTracksCount,
        invalidMobiles: invalidMobilesCount,
        invalidPaymentStatus: invalidPaymentStatusCount,
        existingTeams: existingTeamsCount,
        isAllValid,
      },
      results: validationResults,
    });
  } catch (error) {
    console.error('Validate import error:', error);
    return res.status(500).json({ error: 'Failed to validate uploaded file data' });
  }
});

// 5. POST /api/registration/confirm-import
router.post('/confirm-import', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.userId;
    const { rows } = req.body;

    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Rows array is required' });
    }

    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
      include: { tracks: true },
    });

    if (!activeHackathon) {
      return res.status(400).json({ error: 'No active hackathon found to import into.' });
    }

    const trackMap = new Map<string, string>();
    activeHackathon.tracks.forEach(t => trackMap.set(t.name.toLowerCase(), t.id));
    const fallbackTrackId = activeHackathon.tracks[0]?.id;

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('student123', salt);
    const roleStudent = 'STUDENT';

    let importedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const rawRow of rows) {
        const row = normalizeRowData(rawRow);
        const domainName = row.domain || row.trackName || 'Open Innovation';
        let trackId = trackMap.get(domainName.toLowerCase()) || fallbackTrackId;

        if (!trackId && activeHackathon.tracks.length > 0) {
          trackId = activeHackathon.tracks[0].id;
        }

        const regId = row.registrationId || `REG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const teamCode = await generateTeamCode(trackId!, domainName, tx);

        // 1. Create Team
        const team = await tx.team.create({
          data: {
            registrationId: regId,
            name: row.teamName,
            trackId: trackId!,
            teamCode,
            qrCode: teamCode,
            college: row.collegeName || null,
            collegeName: row.collegeName || null,
            domain: domainName,
            selectedPsId: row.selectedPsId || null,
            mentorName1: row.mentorName1 || null,
            hackathonId: activeHackathon.id,
            checkedIn: false,
            
            leadName: row.leadName || null,
            leadEmail: row.leadEmail || null,
            leadMobile: row.leadMobile || null,
            leadUsn: row.leadUsn || null,

            member2Name: row.member2Name || null,
            member2Email: row.member2Email || null,
            member2Mobile: row.member2Mobile || null,
            member2Usn: row.member2Usn || null,

            member3Name: row.member3Name || null,
            member3Email: row.member3Email || null,
            member3Mobile: row.member3Mobile || null,
            member3Usn: row.member3Usn || null,

            member4Name: row.member4Name || null,
            member4Email: row.member4Email || null,
            member4Mobile: row.member4Mobile || null,
            member4Usn: row.member4Usn || null,

            member5Name: row.member5Name || null,
            member5Email: row.member5Email || null,
            member5Mobile: row.member5Mobile || null,
            member5Usn: row.member5Usn || null,

            paymentStatusFinal: row.paymentStatusFinal || 'PENDING',
          },
        });

        // Create Leader Account & TeamMember
        if (row.leadEmail && row.leadName) {
          const leaderUser = await tx.user.create({
            data: {
              email: row.leadEmail,
              name: row.leadName,
              phone: row.leadMobile || null,
              passwordHash,
              roleId: roleStudent,
            },
          });
          await tx.teamMember.create({
            data: {
              teamId: team.id,
              userId: leaderUser.id,
              name: row.leadName,
              email: row.leadEmail,
              phone: row.leadMobile || null,
              role: 'LEADER',
            },
          });
        }

        // Create Member 2 User & TeamMember
        if (row.member2Name && row.member2Email) {
          const m2User = await tx.user.create({
            data: {
              email: row.member2Email,
              name: row.member2Name,
              phone: row.member2Mobile || null,
              passwordHash,
              roleId: roleStudent,
            },
          });
          await tx.teamMember.create({
            data: {
              teamId: team.id,
              userId: m2User.id,
              name: row.member2Name,
              email: row.member2Email,
              phone: row.member2Mobile || null,
              role: 'MEMBER',
            },
          });
        }

        // Create Member 3 User & TeamMember
        if (row.member3Name && row.member3Email) {
          const m3User = await tx.user.create({
            data: {
              email: row.member3Email,
              name: row.member3Name,
              phone: row.member3Mobile || null,
              passwordHash,
              roleId: roleStudent,
            },
          });
          await tx.teamMember.create({
            data: {
              teamId: team.id,
              userId: m3User.id,
              name: row.member3Name,
              email: row.member3Email,
              phone: row.member3Mobile || null,
              role: 'MEMBER',
            },
          });
        }

        // Create Member 4 User & TeamMember
        if (row.member4Name && row.member4Email) {
          const m4User = await tx.user.create({
            data: {
              email: row.member4Email,
              name: row.member4Name,
              phone: row.member4Mobile || null,
              passwordHash,
              roleId: roleStudent,
            },
          });
          await tx.teamMember.create({
            data: {
              teamId: team.id,
              userId: m4User.id,
              name: row.member4Name,
              email: row.member4Email,
              phone: row.member4Mobile || null,
              role: 'MEMBER',
            },
          });
        }

        // Create Member 5 User & TeamMember
        if (row.member5Name && row.member5Email) {
          const m5User = await tx.user.create({
            data: {
              email: row.member5Email,
              name: row.member5Name,
              phone: row.member5Mobile || null,
              passwordHash,
              roleId: roleStudent,
            },
          });
          await tx.teamMember.create({
            data: {
              teamId: team.id,
              userId: m5User.id,
              name: row.member5Name,
              email: row.member5Email,
              phone: row.member5Mobile || null,
              role: 'MEMBER',
            },
          });
        }

        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: 'TEAM_IMPORT',
            details: `Imported Team "${team.name}" (Registration ID: ${regId}).`,
          },
        });

        importedCount++;
      }
    });

    return res.json({ success: true, message: `Successfully imported ${importedCount} teams with registration details.` });
  } catch (error: any) {
    console.error('Confirm import error:', error);
    return res.status(500).json({ error: error.message || 'Failed to confirm database import transaction' });
  }
});

// 6. GET /api/registration/export-csv (Export CSV with exact 27 column order requested)
router.get('/export-csv', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.status(400).json({ error: 'No active hackathon found' });
    }

    const teams = await prisma.team.findMany({
      where: { hackathonId: activeHackathon.id },
      include: {
        track: { select: { name: true } },
        members: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const headers = [
      'registration_id',
      'team_name',
      'college_name',
      'domain',
      'selected_ps_id',
      'mentor_name_1',
      'lead_name',
      'lead_email',
      'lead_mobile',
      'lead_usn',
      'member2_name',
      'member2_email',
      'member2_mobile',
      'member2_usn',
      'member3_name',
      'member3_email',
      'member3_mobile',
      'member3_usn',
      'member4_name',
      'member4_email',
      'member4_mobile',
      'member4_usn',
      'member5_name',
      'member5_email',
      'member5_mobile',
      'member5_usn',
      'payment_status_final',
    ];

    const rows = teams.map((t) => {
      const leader = t.members.find((m) => m.role === 'LEADER') || t.members[0];
      const m2 = t.members[1];
      const m3 = t.members[2];
      const m4 = t.members[3];
      const m5 = t.members[4];

      return [
        t.registrationId || t.id.substring(0, 8).toUpperCase(),
        t.name,
        t.collegeName || t.college || '',
        t.domain || t.track.name,
        t.selectedPsId || t.problemStatement || '',
        t.mentorName1 || '',

        t.leadName || leader?.name || '',
        t.leadEmail || leader?.email || '',
        t.leadMobile || leader?.phone || '',
        t.leadUsn || '',

        t.member2Name || m2?.name || '',
        t.member2Email || m2?.email || '',
        t.member2Mobile || m2?.phone || '',
        t.member2Usn || '',

        t.member3Name || m3?.name || '',
        t.member3Email || m3?.email || '',
        t.member3Mobile || m3?.phone || '',
        t.member3Usn || '',

        t.member4Name || m4?.name || '',
        t.member4Email || m4?.email || '',
        t.member4Mobile || m4?.phone || '',
        t.member4Usn || '',

        t.member5Name || m5?.name || '',
        t.member5Email || m5?.email || '',
        t.member5Mobile || m5?.phone || '',
        t.member5Usn || '',

        t.paymentStatusFinal || 'PENDING',
      ];
    });

    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=smarthorizon_teams_registration.csv');
    return res.send('\uFEFF' + csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    return res.status(500).json({ error: 'Failed to export teams CSV' });
  }
});

// 7. POST /api/registration/teams/:id/regenerate-qr
router.post('/teams/:id/regenerate-qr', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, confirmed } = req.body;
    const userRole = req.user?.role;
    const userId = req.user?.userId;

    if (userRole !== 'ADMINISTRATOR') {
      return res.status(403).json({ error: 'Access denied: Administrator role required to regenerate venue QR codes.' });
    }

    if (!confirmed) {
      return res.status(400).json({ error: 'Confirmation required to invalidate existing QR badge.' });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: { track: true }
    });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const now = new Date();
    const newCode = await generateTeamCode(team.trackId, team.track.name);

    const updated = await prisma.team.update({
      where: { id },
      data: {
        teamCode: newCode,
        qrCode: newCode,
        qrGeneratedAt: now,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_QR_REGENERATE',
        details: `Explicitly regenerated QR Code for Team "${team.name}" (Old Code: ${team.teamCode || 'None'}, New Code: ${newCode}). Reason: ${reason || 'Admin manual override'}`,
      }
    });

    return res.json({
      success: true,
      message: `QR Badge regenerated successfully for ${team.name}.`,
      teamCode: newCode,
      qrCode: newCode,
      qrGeneratedAt: now,
    });
  } catch (error) {
    console.error('Regenerate QR error:', error);
    return res.status(500).json({ error: 'Failed to regenerate QR code' });
  }
});

// 8. GET /api/registration/teams/export-zip
router.get('/teams/export-zip', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        teamCode: { not: null }
      },
      include: { track: true }
    });
    
    const zip = new AdmZip();
    
    for (const team of teams) {
      if (!team.teamCode) continue;
      const qrBuffer = await QRCode.toBuffer(team.teamCode, { type: 'png', margin: 2, width: 300 });
      const fileName = `${team.track.name.replace(/\s+/g, '_')}/${team.teamCode}_${team.name.replace(/\s+/g, '_')}.png`;
      zip.addFile(fileName, qrBuffer);
    }
    
    const zipBuffer = zip.toBuffer();
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=smarthorizon_team_qrs.zip');
    return res.send(zipBuffer);
  } catch (error) {
    console.error('Export ZIP error:', error);
    return res.status(500).json({ error: 'Failed to generate ZIP export' });
  }
});

// 9. POST /api/registration/member-checkin - Individual Member Check-In
router.post('/member-checkin', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teamId, memberId, status } = req.body;
    const adminUser = req.user;

    if (!adminUser) return res.status(401).json({ error: 'Unauthorized' });
    if (!teamId || !memberId) return res.status(400).json({ error: 'teamId and memberId are required' });

    const newStatus = status === 'ABSENT' ? 'ABSENT' : 'PRESENT';

    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.team.findFirst({
        where: {
          OR: [
            { id: teamId },
            { registrationId: teamId },
            { teamCode: teamId }
          ]
        },
        include: { members: true, track: true }
      });
      if (!team) throw new Error('TEAM_NOT_FOUND');

      const member = team.members.find(m => m.id === memberId);
      if (!member) throw new Error('MEMBER_NOT_FOUND');

      // Update or create member attendance
      const existingAttendance = await tx.attendance.findFirst({
        where: { teamId: team.id, memberId }
      });

      if (existingAttendance) {
        await tx.attendance.update({
          where: { id: existingAttendance.id },
          data: { status: newStatus, checkedInBy: adminUser.userId }
        });
      } else {
        await tx.attendance.create({
          data: {
            teamId: team.id,
            memberId,
            status: newStatus,
            checkedInBy: adminUser.userId
          }
        });
      }

      // Re-calculate team check-in status
      const allAttendance = await tx.attendance.findMany({
        where: { teamId: team.id }
      });

      const presentMemberIds = new Set(
        allAttendance.filter(a => a.memberId && a.status === 'PRESENT').map(a => a.memberId!)
      );

      const totalMembers = team.members.length;
      const presentCount = presentMemberIds.size;

      let checkInStatus = 'PENDING';
      let isCheckedIn = false;

      if (presentCount === 0) {
        checkInStatus = 'PENDING';
        isCheckedIn = false;
      } else if (presentCount < totalMembers) {
        checkInStatus = 'PARTIALLY_CHECKED_IN';
        isCheckedIn = true;
      } else {
        checkInStatus = 'FULLY_CHECKED_IN';
        isCheckedIn = true;
      }

      // Generate team code if missing and team is checked in
      let teamCode = team.teamCode;
      if (isCheckedIn && !teamCode) {
        teamCode = await generateTeamCode(team.trackId, team.track.name, tx);
      }

      const updatedTeam = await tx.team.update({
        where: { id: team.id },
        data: {
          checkedIn: isCheckedIn,
          checkInStatus,
          checkInTime: isCheckedIn ? (team.checkInTime || new Date()) : null,
          checkedInBy: isCheckedIn ? (team.checkedInBy || adminUser.email) : null,
          teamCode: teamCode || team.teamCode,
          qrCode: teamCode || team.qrCode,
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUser.userId,
          actorRole: 'ADMINISTRATOR',
          action: 'MEMBER_CHECKIN_UPDATE',
          details: `Updated attendance for ${member.name} (Team "${team.name}") to ${newStatus}. Team state: ${checkInStatus}.`,
          resource: 'TeamMember',
          resourceId: memberId,
        }
      });

      return { team: updatedTeam, memberName: member.name, memberStatus: newStatus, checkInStatus };
    });

    return res.json({
      success: true,
      message: `Member ${result.memberName} marked as ${result.memberStatus}. Team status is now ${result.checkInStatus}.`,
      team: result.team,
    });
  } catch (error: any) {
    if (error.message === 'TEAM_NOT_FOUND') return res.status(404).json({ error: 'Team not found' });
    if (error.message === 'MEMBER_NOT_FOUND') return res.status(404).json({ error: 'Team member not found' });
    console.error('Member check-in error:', error);
    return res.status(500).json({ error: 'Failed to update member attendance' });
  }
});

// 10. GET /api/registration/export-attendance - Export Professional Operations Attendance Report
router.get('/export-attendance', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const format = (req.query.format as string || 'xlsx').toLowerCase();

    const activeHackathon = await prisma.hackathon.findFirst({
      where: { active: true },
    });

    if (!activeHackathon) {
      return res.status(400).json({ error: 'No active hackathon found' });
    }

    const teams = await prisma.team.findMany({
      where: { hackathonId: activeHackathon.id },
      include: {
        track: { select: { name: true } },
        members: true,
        attendance: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate Summary Operational Metrics
    const totalTeams = teams.length;
    let totalParticipants = 0;
    let checkedInParticipants = 0;
    let checkedInTeams = 0;

    const trackSummaryMap: Record<string, { track: string; totalTeams: number; checkedInTeams: number; totalParticipants: number; checkedInParticipants: number }> = {};

    teams.forEach(team => {
      const trackName = team.track?.name || 'General';
      if (!trackSummaryMap[trackName]) {
        trackSummaryMap[trackName] = { track: trackName, totalTeams: 0, checkedInTeams: 0, totalParticipants: 0, checkedInParticipants: 0 };
      }

      const hasPresentMember = team.attendance.some(a => a.status === 'PRESENT');
      const isTeamCheckedIn = team.checkedIn || hasPresentMember;

      trackSummaryMap[trackName].totalTeams += 1;
      if (isTeamCheckedIn) {
        checkedInTeams += 1;
        trackSummaryMap[trackName].checkedInTeams += 1;
      }

      const pCount = team.members.length || 1;
      totalParticipants += pCount;
      trackSummaryMap[trackName].totalParticipants += pCount;

      const attendanceMap = new Map<string, any>();
      team.attendance.forEach(a => { if (a.memberId) attendanceMap.set(a.memberId, a); });

      team.members.forEach(member => {
        const memberAtt = attendanceMap.get(member.id);
        if (memberAtt?.status === 'PRESENT' || (!memberAtt && team.checkedIn)) {
          checkedInParticipants += 1;
          trackSummaryMap[trackName].checkedInParticipants += 1;
        }
      });
    });

    const pendingTeams = totalTeams - checkedInTeams;
    const pendingParticipants = totalParticipants - checkedInParticipants;
    const attendanceRatePct = totalTeams > 0 ? `${Math.round((checkedInTeams / totalTeams) * 100)}%` : '0%';

    // SHEET 1: ATTENDANCE SUMMARY
    const summaryHeaders = ['Track / Domain', 'Total Teams', 'Checked In Teams', 'Pending Teams', 'Total Participants', 'Checked In Participants', 'Check-In Rate %'];
    const summaryRows = Object.values(trackSummaryMap).map(t => [
      t.track,
      t.totalTeams,
      t.checkedInTeams,
      t.totalTeams - t.checkedInTeams,
      t.totalParticipants,
      t.checkedInParticipants,
      t.totalTeams > 0 ? `${Math.round((t.checkedInTeams / t.totalTeams) * 100)}%` : '0%',
    ]);

    // VIEW 1: TEAM ATTENDANCE (With Members Present in X/Y format)
    const teamAttendanceHeaders = [
      'Sl. No.',
      'Team ID',
      'Team Code',
      'Team Name',
      'College',
      'Track / Domain',
      'Members Present',
      'Attendance Status',
      'Check-In Timestamp'
    ];
    const teamAttendanceRows: any[][] = [];

    // VIEW 2: INDIVIDUAL ATTENDANCE (Ordered by Team ID)
    const individualAttendanceHeaders = [
      'Sl. No.',
      'Team ID',
      'Team Code',
      'Team Name',
      'College',
      'Participant Name',
      'Email',
      'Phone',
      'Role',
      'Track / Domain',
      'Attendance Status',
      'Check-In Timestamp'
    ];
    const individualAttendanceRows: any[][] = [];

    // Sort teams deterministically by registrationId / Team ID
    const sortedTeams = [...teams].sort((a, b) => {
      const idA = a.registrationId || a.id;
      const idB = b.registrationId || b.id;
      return idA.localeCompare(idB);
    });

    let teamSlNo = 1;
    let memberSlNo = 1;

    sortedTeams.forEach(team => {
      const attendanceMap = new Map<string, any>();
      team.attendance.forEach(a => { if (a.memberId) attendanceMap.set(a.memberId, a); });

      const totalMembersCount = team.members.length || 1;
      let presentMembersCount = 0;

      team.members.forEach(member => {
        const memberAtt = attendanceMap.get(member.id);
        let status = 'ABSENT';
        let timestamp = 'N/A';

        if (memberAtt) {
          status = memberAtt.status;
          timestamp = memberAtt.createdAt ? formatTimestamp(memberAtt.createdAt) : 'N/A';
        }

        if (status === 'PRESENT') {
          presentMembersCount += 1;
        }

        individualAttendanceRows.push([
          memberSlNo++,
          team.registrationId || team.id.substring(0, 8).toUpperCase(),
          team.teamCode || 'N/A',
          team.name,
          team.collegeName || team.college || 'N/A',
          member.name,
          member.email || 'N/A',
          member.phone || 'N/A',
          member.role || 'MEMBER',
          team.track?.name || 'General',
          status,
          timestamp,
        ]);
      });

      let teamOverallStatus = 'ABSENT';
      if (presentMembersCount === totalMembersCount && totalMembersCount > 0) {
        teamOverallStatus = 'FULLY PRESENT';
      } else if (presentMembersCount > 0) {
        teamOverallStatus = 'PARTIALLY PRESENT';
      }

      teamAttendanceRows.push([
        teamSlNo++,
        team.registrationId || team.id.substring(0, 8).toUpperCase(),
        team.teamCode || 'N/A',
        team.name,
        team.collegeName || team.college || 'N/A',
        team.track?.name || 'General',
        `${presentMembersCount}/${totalMembersCount}`,
        teamOverallStatus,
        team.checkInTime ? formatTimestamp(team.checkInTime) : 'N/A',
      ]);
    });

    if (format === 'xlsx') {
      const sheets: ExportSheetDef[] = [
        {
          sheetName: 'TEAM ATTENDANCE',
          reportTitle: 'Smart Horizon 2026 — Team Attendance Summary (X/Y Present)',
          summaryStats: [
            { label: 'Registered Teams', value: totalTeams },
            { label: 'Registered Participants', value: totalParticipants },
            { label: 'Checked In Teams', value: checkedInTeams },
            { label: 'Pending Teams', value: pendingTeams },
            { label: 'Attendance Rate', value: attendanceRatePct },
          ],
          headers: teamAttendanceHeaders,
          rows: teamAttendanceRows,
        },
        {
          sheetName: 'INDIVIDUAL ATTENDANCE',
          reportTitle: 'Smart Horizon 2026 — Individual Participant Attendance (Ordered by Team ID)',
          headers: individualAttendanceHeaders,
          rows: individualAttendanceRows,
        },
      ];

      const buffer = generateExcelWorkbook(sheets);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Attendance.xlsx"');
      return res.send(buffer);
    } else if (format === 'pdf') {
      return await streamPdfReport(res, 'SmartHorizon2026_Attendance.pdf', {
        reportTitle: 'Smart Horizon 2026 — Team Attendance Roster',
        summaryStats: [
          { label: 'Teams Registered', value: totalTeams },
          { label: 'Checked In', value: checkedInTeams },
          { label: 'Pending', value: pendingTeams },
          { label: 'Check-In Rate', value: attendanceRatePct },
        ],
        headers: teamAttendanceHeaders,
        rows: teamAttendanceRows.map(r => r.map(String)),
        orientation: 'landscape',
      });
    } else {
      const csvStr = generateCsvReport(individualAttendanceHeaders, individualAttendanceRows.map(r => r.map(String)));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="SmartHorizon2026_Attendance.csv"');
      return res.send(csvStr);
    }
  } catch (error) {
    console.error('Export attendance error:', error);
    return res.status(500).json({ error: 'Failed to export attendance report' });
  }
});

// 11. GET /api/registration/teams/export-qr-pdf - Bulk A4 Printable Team QR PDF Generator
router.get('/teams/export-qr-pdf', authenticateToken, requireRole(['ADMINISTRATOR', 'CHECK_IN_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        teamCode: { not: null }
      },
      include: { track: true },
      orderBy: { teamCode: 'asc' }
    });

    if (teams.length === 0) {
      return res.status(400).json({ error: 'No teams with generated QR codes found' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 20 });
    const pdfPromise = new Promise<void>((resolve, reject) => {
      const chunks: any[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('error', err => reject(err));
      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=smarthorizon_bulk_team_qrs.pdf');
        res.send(result);
        resolve();
      });
    });

    const cardWidth = 260;
    const cardHeight = 360;
    const marginX = 25;
    const marginY = 30;

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      if (!team.teamCode) continue;

      const pageIndex = i % 4;
      if (i > 0 && pageIndex === 0) {
        doc.addPage();
      }

      const col = pageIndex % 2;
      const row = Math.floor(pageIndex / 2);
      const x = marginX + col * (cardWidth + 20);
      const y = marginY + row * (cardHeight + 20);

      // Draw Card Border
      doc.rect(x, y, cardWidth, cardHeight).lineWidth(1.5).strokeColor('#3b82f6').stroke();

      // Card Header Branding
      doc.fillColor('#1e3a8a').fontSize(14).font('Helvetica-Bold').text('SMART HORIZON 2026', x, y + 15, { width: cardWidth, align: 'center' });
      doc.fillColor('#475569').fontSize(10).font('Helvetica').text('OPERATIONS BADGE', x, y + 32, { width: cardWidth, align: 'center' });

      // Divider
      doc.moveTo(x + 15, y + 48).lineTo(x + cardWidth - 15, y + 48).lineWidth(0.5).strokeColor('#cbd5e1').stroke();

      // Generate QR Code PNG Buffer
      const qrBuffer = await QRCode.toBuffer(team.teamCode, { type: 'png', margin: 1, width: 220 });
      doc.image(qrBuffer, x + (cardWidth - 180) / 2, y + 60, { width: 180, height: 180 });

      // Team Details
      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text(team.teamCode, x, y + 250, { width: cardWidth, align: 'center' });
      doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text(team.name, x + 10, y + 272, { width: cardWidth - 20, align: 'center' });
      doc.fillColor('#64748b').fontSize(10).font('Helvetica').text(`Track: ${team.track.name}`, x + 10, y + 310, { width: cardWidth - 20, align: 'center' });
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(`Reg ID: ${team.registrationId || team.id.substring(0, 8)}`, x, y + 335, { width: cardWidth, align: 'center' });
    }

    doc.end();
    await pdfPromise;
    return;
  } catch (error) {
    console.error('Export QR PDF error:', error);
    return res.status(500).json({ error: 'Failed to generate bulk QR PDF' });
  }
});

export default router;

