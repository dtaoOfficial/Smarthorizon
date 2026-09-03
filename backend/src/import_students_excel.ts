import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

const excelPath = 'C:/Claude_projects/SmartHorizon/Filtered_Complete Registration-118 updated on 19-Aug-26.xlsx';

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

async function runImport() {
  console.log('Reading Excel file:', excelPath);
  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found at path:', excelPath);
    process.exit(1);
  }

  const wb = xlsx.readFile(excelPath);
  const sheetName = wb.SheetNames[0];
  const rows: any[] = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);

  console.log(`Found ${rows.length} team rows in sheet "${sheetName}".`);

  // Ensure Hackathon exists
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
  const allParticipantCredentials: any[] = [];
  let userCount = 0;
  let teamCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const teamIdStr = String(row['Team ID'] || `SHIH26-TID-${String(i + 1).padStart(3, '0')}`).trim();
    const domainRaw = String(row['domain'] || '').toLowerCase().trim();
    const trackName = domainMap[domainRaw] || 'Open Innovation';
    let track = tracks[trackName];

    if (!track) {
      track = await prisma.track.create({ data: { name: trackName, hackathonId: hackathon.id } });
      tracks[trackName] = track;
    }

    const teamName = String(row['team_name'] || `Team ${i + 1}`).trim();
    const selectedPsId = row['selected_ps_id'] ? String(row['selected_ps_id']).trim() : null;

    // Check if team already exists
    let team = await prisma.team.findUnique({ where: { registrationId: teamIdStr } });
    if (!team) {
      team = await prisma.team.create({
        data: {
          registrationId: teamIdStr,
          teamCode: teamIdStr,
          qrCode: teamIdStr,
          qrGeneratedAt: new Date(),
          name: teamName,
          domain: trackName,
          selectedPsId,
          emergencyContact: row['lead_mobile'] ? String(row['lead_mobile']) : null,
          projectTitle: `${teamName} Innovation Project`,
          problemStatement: selectedPsId ? `Problem statement ${selectedPsId}` : 'Open Challenge',
          projectDesc: `Hackathon entry for ${trackName}.`,
          techStack: 'React, TypeScript, Node.js, Prisma',
          status: 'Registered',
          paymentStatusFinal: 'PAID',
          trackId: track.id,
          hackathonId: hackathon.id,

          leadName: row['lead_name'] ? String(row['lead_name']).trim() : null,
          leadEmail: row['lead_email'] ? String(row['lead_email']).trim() : null,
          leadMobile: row['lead_mobile'] ? String(row['lead_mobile']).trim() : null,

          member2Name: row['member2_name'] ? String(row['member2_name']).trim() : null,
          member2Email: row['member2_email'] ? String(row['member2_email']).trim() : null,
          member2Mobile: row['member2_mobile'] ? String(row['member2_mobile']).trim() : null,

          member3Name: row['member3_name'] ? String(row['member3_name']).trim() : null,
          member3Email: row['member3_email'] ? String(row['member3_email']).trim() : null,
          member3Mobile: row['member3_mobile'] ? String(row['member3_mobile']).trim() : null,

          member4Name: row['member4_name'] ? String(row['member4_name']).trim() : null,
          member4Email: row['member4_email'] ? String(row['member4_email']).trim() : null,
          member4Mobile: row['member4_mobile'] ? String(row['member4_mobile']).trim() : null,

          member5Name: row['member5_name'] ? String(row['member5_name']).trim() : null,
          member5Email: row['member5_email'] ? String(row['member5_email']).trim() : null,
          member5Mobile: row['member5_mobile'] ? String(row['member5_mobile']).trim() : null,
        },
      });
    }
    teamCount++;

    // Process Leader & Members
    const membersList = [
      { name: row['lead_name'], email: row['lead_email'], phone: row['lead_mobile'], role: 'LEADER', roleLabel: 'Team Leader' },
      { name: row['member2_name'], email: row['member2_email'], phone: row['member2_mobile'], role: 'MEMBER', roleLabel: 'Team Member' },
      { name: row['member3_name'], email: row['member3_email'], phone: row['member3_mobile'], role: 'MEMBER', roleLabel: 'Team Member' },
      { name: row['member4_name'], email: row['member4_email'], phone: row['member4_mobile'], role: 'MEMBER', roleLabel: 'Team Member' },
      { name: row['member5_name'], email: row['member5_email'], phone: row['member5_mobile'], role: 'MEMBER', roleLabel: 'Team Member' },
    ];

    for (const m of membersList) {
      if (m.name && String(m.name).trim()) {
        const cleanName = String(m.name).trim();
        const rawEmail = m.email ? String(m.email).trim().toLowerCase() : '';
        const cleanEmail = rawEmail || `student_${teamIdStr.toLowerCase().replace(/[^a-z0-9]/g, '')}_${m.role.toLowerCase()}@smarthorizon.com`;
        const cleanPhone = m.phone ? String(m.phone).trim() : null;

        let userIdToAttach: string | null = null;

        if (m.role === 'LEADER') {
          let user = await prisma.user.findUnique({ where: { email: cleanEmail } });
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: cleanEmail,
                passwordHash: studentPasswordHash,
                name: cleanName,
                phone: cleanPhone,
                roleId: 'STUDENT',
                mustChangePassword: true,
              },
            });
          } else {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                passwordHash: studentPasswordHash,
                mustChangePassword: true,
              },
            });
          }
          userCount++;
          userIdToAttach = user.id;

          allParticipantCredentials.push({
            slNo: allParticipantCredentials.length + 1,
            name: cleanName,
            teamName: teamName,
            teamId: teamIdStr,
            role: m.roleLabel,
            email: cleanEmail,
            password: 'student123',
          });
        }

        // Ensure TeamMember record exists safely
        const existingEmailTM = await prisma.teamMember.findFirst({
          where: { teamId: team.id, email: cleanEmail },
        });

        if (!existingEmailTM) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              userId: userIdToAttach,
              name: cleanName,
              email: cleanEmail,
              phone: cleanPhone,
              role: m.role,
            },
          });
        } else {
          await prisma.teamMember.update({
            where: { id: existingEmailTM.id },
            data: { userId: userIdToAttach, role: m.role },
          });
        }
      }
    }
  }

  console.log(`Import completed successfully! Total teams: ${teamCount}, Total student user accounts: ${userCount}.`);

  // Write updated Login_credentials_participants.md
  let mdContent = `# SmartHorizon Hackathon 2026 - Participant Login Credentials\n\n`;
  mdContent += `> **Notice:** All student participants log in with their email address as the username and initial temporary password \`student123\`.\n`;
  mdContent += `> **Security Action:** On first login, students will be prompted to update their password. Their new password will be securely hashed and updated in the database.\n\n`;
  mdContent += `--- \n\n`;
  mdContent += `### **Overview & Summary**\n`;
  mdContent += `- **Total Registered Teams:** \`${teamCount}\`\n`;
  mdContent += `- **Total Student Users:** \`${allParticipantCredentials.length}\`\n`;
  mdContent += `- **Default Temporary Password:** \`student123\`\n`;
  mdContent += `- **Portal Login URL:** http://localhost:8080/login\n\n`;
  mdContent += `--- \n\n`;
  mdContent += `### **Participant Credentials Roster**\n\n`;
  mdContent += `| Sl | Participant Name | Team Name | Team ID | Role | Login Username (Email) | Temporary Password |\n`;
  mdContent += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const c of allParticipantCredentials) {
    mdContent += `| ${c.slNo} | **${c.name}** | ${c.teamName} | \`${c.teamId}\` | ${c.role} | \`${c.email}\` | \`${c.password}\` |\n`;
  }

  mdContent += `\n---\n*Updated from Filtered_Complete Registration-118 Excel sheet on ${new Date().toLocaleString()}*\n`;

  const mdPath = 'C:/Claude_projects/SmartHorizon/Login_credentials_participants.md';
  fs.writeFileSync(mdPath, mdContent, 'utf8');
  console.log('Updated credentials markdown file at:', mdPath);
}

runImport()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
