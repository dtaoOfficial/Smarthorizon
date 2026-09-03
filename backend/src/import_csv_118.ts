import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { syncParticipantCredentialsFile } from './utils/credentialsSync';

const prisma = new PrismaClient();

const csvPath = path.resolve(__dirname, '../../registration-september-11th-118.csv');

const domainMap: Record<string, string> = {
  healthtech: 'Healthcare',
  fintech: 'FinTech',
  smartcity: 'Smart City',
  spacetech: 'SpaceTech',
  agriculture: 'Agriculture',
  ai: 'AI & ML',
  cybersecurity: 'Cybersecurity',
  openinnovation: 'Open Innovation',
};

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') {
        i++;
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) return [];

  function parseRow(rowStr: string): string[] {
    const fields: string[] = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < rowStr.length; i++) {
      const c = rowStr[i];
      if (c === '"') {
        if (inQ && rowStr[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === ',' && !inQ) {
        fields.push(field.trim());
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  }

  const headers = parseRow(lines[0]);
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    if (values.length < 3) continue;
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });
    result.push(rowObj);
  }

  return result;
}

async function runCsvImport() {
  console.log('=== STARTING CSV DATABASE IMPORT (118 TEAMS) ===');
  console.log('Reading CSV file:', csvPath);

  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at path:', csvPath);
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvText);

  console.log(`Parsed ${rows.length} participant team rows from CSV.`);

  // 1. Clean old student & team data
  console.log('Cleaning old participant team & student records...');
  await prisma.attendance.deleteMany({});
  await prisma.studentFeedback.deleteMany({});
  await prisma.eventFeedback.deleteMany({ where: { userRole: 'STUDENT' } });
  await prisma.teamSubmission.deleteMany({});
  await prisma.evaluationClaim.deleteMany({});
  await prisma.reviewScore.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.judgeAssignment.deleteMany({});
  await prisma.questionReply.deleteMany({ where: { user: { roleId: 'STUDENT' } } });
  await prisma.question.deleteMany({ where: { user: { roleId: 'STUDENT' } } });
  await prisma.announcementReceipt.deleteMany({ where: { user: { roleId: 'STUDENT' } } });
  await prisma.notification.deleteMany({ where: { user: { roleId: 'STUDENT' } } });
  await prisma.auditLog.deleteMany({ where: { user: { roleId: 'STUDENT' } } });
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.user.deleteMany({ where: { roleId: 'STUDENT' } });

  console.log('Cleaned old student and team data.');

  // 2. Ensure Active Hackathon
  let hackathon = await prisma.hackathon.findFirst({ where: { active: true } });
  if (!hackathon) {
    hackathon = await prisma.hackathon.create({
      data: {
        name: 'SmartHorizon Hackathon 2026',
        description: 'The annual flagship university hackathon.',
        startDate: new Date('2026-10-15T09:00:00Z'),
        endDate: new Date('2026-10-17T17:00:00Z'),
        active: true,
      },
    });
  }

  // 3. Ensure Tracks
  const defaultTrackNames = ['FinTech', 'Healthcare', 'Smart City', 'SpaceTech', 'Agriculture', 'AI & ML', 'Cybersecurity', 'Open Innovation'];
  const tracks: Record<string, any> = {};

  for (const tName of defaultTrackNames) {
    let t = await prisma.track.findFirst({ where: { name: tName, hackathonId: hackathon.id } });
    if (!t) {
      t = await prisma.track.create({ data: { name: tName, hackathonId: hackathon.id } });
    }
    tracks[tName] = t;
  }

  let createdTeamCount = 0;
  let createdLeaderCount = 0;

  // 4. Process each team row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawRegId = (row['registration_id'] || '').trim();
    if (!rawRegId) continue;

    const regIdStr = `SHIH26-TID-${String(rawRegId).padStart(3, '0')}`;
    const teamCodeStr = regIdStr;

    const teamName = (row['team_name'] || `Team ${rawRegId}`).trim();
    const collegeName = (row['college_name'] || 'Unspecified Institution').trim();

    const domainRaw = (row['domain'] || '').trim();
    const domainLower = domainRaw.toLowerCase();
    const trackName = domainMap[domainLower] || (defaultTrackNames.includes(domainRaw) ? domainRaw : 'Open Innovation');
    let track = tracks[trackName];

    if (!track) {
      track = await prisma.track.create({ data: { name: trackName, hackathonId: hackathon.id } });
      tracks[trackName] = track;
    }

    const selectedPsId = (row['selected_ps_id'] || '').trim() || null;
    const mentorName = (row['mentor_name_1'] || row['mentor_name'] || '').trim() || null;

    const leadName = (row['lead_name'] || '').trim() || null;
    const leadEmail = (row['lead_email'] || '').trim().toLowerCase() || null;
    const leadMobile = (row['lead_mobile'] || '').trim() || null;
    const leadUsn = (row['lead_usn'] || '').trim() || null;

    const m2Name = (row['member2_name'] || '').trim() || null;
    const m2Email = (row['member2_email'] || '').trim().toLowerCase() || null;
    const m2Mobile = (row['member2_mobile'] || '').trim() || null;

    const m3Name = (row['member3_name'] || '').trim() || null;
    const m3Email = (row['member3_email'] || '').trim().toLowerCase() || null;
    const m3Mobile = (row['member3_mobile'] || '').trim() || null;

    const m4Name = (row['member4_name'] || '').trim() || null;
    const m4Email = (row['member4_email'] || '').trim().toLowerCase() || null;
    const m4Mobile = (row['member4_mobile'] || '').trim() || null;

    const m5Name = (row['member5_name'] || '').trim() || null;
    const m5Email = (row['member5_email'] || '').trim().toLowerCase() || null;
    const m5Mobile = (row['member5_mobile'] || '').trim() || null;

    const paymentStatus = (row['payment_status_final'] || row['payment_status'] || 'PAID').toUpperCase().trim();

    // Create Team
    const team = await prisma.team.create({
      data: {
        registrationId: regIdStr,
        teamCode: teamCodeStr,
        qrCode: teamCodeStr,
        qrGeneratedAt: new Date(),
        name: teamName,
        college: collegeName,
        collegeName: collegeName,
        domain: trackName,
        selectedPsId,
        mentorName1: mentorName,
        emergencyContact: leadMobile,
        projectTitle: `${teamName} Project`,
        problemStatement: selectedPsId ? `Problem statement ${selectedPsId}` : 'Open Challenge',
        projectDesc: `Hackathon entry for ${trackName}.`,
        techStack: 'React, TypeScript, Node.js, Prisma',
        status: 'Registered',
        paymentStatusFinal: paymentStatus,
        trackId: track.id,
        hackathonId: hackathon.id,

        leadName,
        leadEmail,
        leadMobile,
        leadUsn,

        member2Name: m2Name,
        member2Email: m2Email,
        member2Mobile: m2Mobile,

        member3Name: m3Name,
        member3Email: m3Email,
        member3Mobile: m3Mobile,

        member4Name: m4Name,
        member4Email: m4Email,
        member4Mobile: m4Mobile,

        member5Name: m5Name,
        member5Email: m5Email,
        member5Mobile: m5Mobile,
      },
    });

    createdTeamCount++;

    // Create Leader User Account with Phone Password
    if (leadEmail && leadName && leadMobile) {
      const phonePasswordHash = await bcrypt.hash(leadMobile, 10);

      let leaderUser = await prisma.user.findUnique({ where: { email: leadEmail } });
      if (!leaderUser) {
        leaderUser = await prisma.user.create({
          data: {
            email: leadEmail,
            passwordHash: phonePasswordHash,
            name: leadName,
            phone: leadMobile,
            roleId: 'STUDENT',
            mustChangePassword: false,
          },
        });
      } else {
        leaderUser = await prisma.user.update({
          where: { id: leaderUser.id },
          data: {
            passwordHash: phonePasswordHash,
            phone: leadMobile,
            name: leadName,
            mustChangePassword: false,
          },
        });
      }
      createdLeaderCount++;

      // Create Leader TeamMember record
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: leaderUser.id,
          name: leadName,
          email: leadEmail,
          phone: leadMobile,
          role: 'LEADER',
        },
      });
    }

    // Process Non-Leader Team Members
    const membersList = [
      { name: m2Name, email: m2Email, phone: m2Mobile },
      { name: m3Name, email: m3Email, phone: m3Mobile },
      { name: m4Name, email: m4Email, phone: m4Mobile },
      { name: m5Name, email: m5Email, phone: m5Mobile },
    ];

    for (const m of membersList) {
      if (m.name && m.name.trim()) {
        const cleanName = m.name.trim();
        const cleanEmail = m.email ? m.email.trim() : `member_${regIdStr.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(7)}@smarthorizon.com`;
        const cleanPhone = m.phone ? m.phone.trim() : null;

        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            userId: null,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            role: 'MEMBER',
          },
        });
      }
    }
  }

  console.log(`Successfully imported ${createdTeamCount} participant teams and ${createdLeaderCount} team leader accounts.`);

  // 5. Re-assign judges evenly across the 118 teams
  console.log('Re-assigning judges across teams...');
  const judges = await prisma.user.findMany({
    where: { roleId: 'JUDGE' },
    orderBy: { email: 'asc' },
  });

  const allTeams = await prisma.team.findMany({
    orderBy: { registrationId: 'asc' },
  });

  if (judges.length > 0 && allTeams.length > 0) {
    let judgeIndex = 0;
    for (let tIdx = 0; tIdx < allTeams.length; tIdx++) {
      const currentTeam = allTeams[tIdx];
      for (let j = 0; j < 2; j++) {
        const assignedJudge = judges[judgeIndex % judges.length];
        const existingAssign = await prisma.judgeAssignment.findUnique({
          where: {
            judgeId_teamId: {
              judgeId: assignedJudge.id,
              teamId: currentTeam.id,
            },
          },
        });
        if (!existingAssign) {
          await prisma.judgeAssignment.create({
            data: {
              judgeId: assignedJudge.id,
              teamId: currentTeam.id,
              trackId: currentTeam.trackId,
              order: j + 1,
            },
          });
        }
        judgeIndex++;
      }
    }
    console.log(`Assigned ${judges.length} judges across ${allTeams.length} teams.`);
  }

  // 6. Sync Participant Credentials Markdown
  console.log('Syncing participant credentials file...');
  await syncParticipantCredentialsFile();

  console.log('=== CSV DATABASE IMPORT FINISHED SUCCESSFULLY ===');
}

runCsvImport()
  .catch((e) => {
    console.error('CSV import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
