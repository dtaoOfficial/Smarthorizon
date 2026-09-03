import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { syncParticipantCredentialsFile } from './utils/credentialsSync';

const prisma = new PrismaClient();

const excelPath = path.resolve(__dirname, '../../Complete Registration-118 updated on 19-Aug-26 (2).xlsx');

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

async function runStrictImport() {
  console.log('=== STARTING STRICT IMPORT FROM EXCEL (118 TEAMS) ===');
  console.log('Reading Excel file:', excelPath);

  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found at path:', excelPath);
    process.exit(1);
  }

  const wb = xlsx.readFile(excelPath);
  const sheetName = wb.SheetNames[0]; // 'registration-118'
  const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);

  console.log(`Found ${rows.length} team rows in Excel sheet "${sheetName}".`);

  // 1. Clean existing team & student user data
  console.log('Cleaning old team & student data...');
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

  // 2. Ensure Hackathon exists
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

  // 3. Ensure Tracks exist
  const defaultTrackNames = ['FinTech', 'Healthcare', 'Smart City', 'SpaceTech', 'Agriculture', 'AI & ML', 'Cybersecurity', 'Open Innovation'];
  const tracks: Record<string, any> = {};

  for (const tName of defaultTrackNames) {
    let t = await prisma.track.findFirst({ where: { name: tName, hackathonId: hackathon.id } });
    if (!t) {
      t = await prisma.track.create({ data: { name: tName, hackathonId: hackathon.id } });
    }
    tracks[tName] = t;
  }

  const studentPasswordHash = await bcrypt.hash('student123', 10);
  let createdTeamCount = 0;
  let createdLeaderCount = 0;

  const usedTeamCodes = new Set<string>();

  // 4. Process each of the 118 teams
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const regIdStr = String(row['Team ID'] || row['Registration ID'] || `SHIH26-TID-${String(i + 1).padStart(3, '0')}`).trim();
    let rawTeamCode = row['Team Code'] ? String(row['Team Code']).trim() : regIdStr;
    if (!rawTeamCode || rawTeamCode === 'null' || rawTeamCode === 'undefined') {
      rawTeamCode = regIdStr;
    }

    let teamCodeStr = rawTeamCode;
    if (usedTeamCodes.has(teamCodeStr)) {
      teamCodeStr = `${rawTeamCode}-${regIdStr}`;
    }
    usedTeamCodes.add(teamCodeStr);

    const teamName = String(row['team_name'] || row['Team Name'] || `Team ${i + 1}`).trim();
    const collegeName = String(row['college_name'] || row['College Name'] || 'Unspecified Institution').trim();
    
    const domainRaw = String(row['domain'] || row['Domain / Track'] || '').trim();
    const domainLower = domainRaw.toLowerCase();
    const trackName = domainMap[domainLower] || (defaultTrackNames.includes(domainRaw) ? domainRaw : 'Open Innovation');
    let track = tracks[trackName];

    if (!track) {
      track = await prisma.track.create({ data: { name: trackName, hackathonId: hackathon.id } });
      tracks[trackName] = track;
    }

    const selectedPsId = (row['selected_ps_id'] || row['Problem Statement ID']) ? String(row['selected_ps_id'] || row['Problem Statement ID']).trim() : null;

    const leadName = (row['lead_name'] || row['Team Leader Name']) ? String(row['lead_name'] || row['Team Leader Name']).trim() : null;
    const leadEmail = (row['lead_email'] || row['Team Leader Email']) ? String(row['lead_email'] || row['Team Leader Email']).trim().toLowerCase() : null;
    const leadMobile = (row['lead_mobile'] || row['Team Leader Mobile']) ? String(row['lead_mobile'] || row['Team Leader Mobile']).trim() : null;
    const leadUsn = (row['lead_usn'] || row['Team Leader USN']) ? String(row['lead_usn'] || row['Team Leader USN']).trim() : null;

    const m2Name = (row['member2_name'] || row['Member 2 Name']) ? String(row['member2_name'] || row['Member 2 Name']).trim() : null;
    const m2Email = (row['member2_email'] || row['Member 2 Email']) ? String(row['member2_email'] || row['Member 2 Email']).trim().toLowerCase() : null;
    const m2Mobile = (row['member2_mobile'] || row['Member 2 Mobile']) ? String(row['member2_mobile'] || row['Member 2 Mobile']).trim() : null;

    const m3Name = (row['member3_name'] || row['Member 3 Name']) ? String(row['member3_name'] || row['Member 3 Name']).trim() : null;
    const m3Email = (row['member3_email'] || row['Member 3 Email']) ? String(row['member3_email'] || row['Member 3 Email']).trim().toLowerCase() : null;
    const m3Mobile = (row['member3_mobile'] || row['Member 3 Mobile']) ? String(row['member3_mobile'] || row['Member 3 Mobile']).trim() : null;

    const m4Name = (row['member4_name'] || row['Member 4 Name']) ? String(row['member4_name'] || row['Member 4 Name']).trim() : null;
    const m4Email = (row['member4_email'] || row['Member 4 Email']) ? String(row['member4_email'] || row['Member 4 Email']).trim().toLowerCase() : null;
    const m4Mobile = (row['member4_mobile'] || row['Member 4 Mobile']) ? String(row['member4_mobile'] || row['Member 4 Mobile']).trim() : null;

    const m5Name = (row['member5_name'] || row['Member 5 Name']) ? String(row['member5_name'] || row['Member 5 Name']).trim() : null;
    const m5Email = (row['member5_email'] || row['Member 5 Email']) ? String(row['member5_email'] || row['Member 5 Email']).trim().toLowerCase() : null;
    const m5Mobile = (row['member5_mobile'] || row['Member 5 Mobile']) ? String(row['member5_mobile'] || row['Member 5 Mobile']).trim() : null;

    const projTitle = row['Project Title'] ? String(row['Project Title']).trim() : `${teamName} Innovation Project`;
    const emergencyContact = leadMobile;

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
        emergencyContact,
        projectTitle: projTitle,
        problemStatement: selectedPsId ? `Problem statement ${selectedPsId}` : 'Open Challenge',
        projectDesc: `Hackathon entry for ${trackName}.`,
        techStack: 'React, TypeScript, Node.js, Prisma',
        status: 'Registered',
        paymentStatusFinal: row['Payment Status'] ? String(row['Payment Status']).toUpperCase().trim() : 'PAID',
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

    // Create Leader User Account
    if (leadEmail && leadName) {
      let leaderUser = await prisma.user.findUnique({ where: { email: leadEmail } });
      if (!leaderUser) {
        leaderUser = await prisma.user.create({
          data: {
            email: leadEmail,
            passwordHash: studentPasswordHash,
            name: leadName,
            phone: leadMobile,
            roleId: 'STUDENT',
            mustChangePassword: true,
          },
        });
      } else {
        leaderUser = await prisma.user.update({
          where: { id: leaderUser.id },
          data: {
            passwordHash: studentPasswordHash,
            mustChangePassword: true,
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

    // Process non-leader members (TeamMember records ONLY, NO User accounts)
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

  console.log(`Successfully imported ${createdTeamCount} teams and ${createdLeaderCount} team leader accounts.`);

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
      // Assign 2 judges per team
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

  console.log('=== STRICT IMPORT FINISHED SUCCESSFULLY ===');
}

runStrictImport()
  .catch((e) => {
    console.error('Strict import failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
