import prisma from '../db';
import fs from 'fs';
import path from 'path';

const rootDir = path.join(__dirname, '../../../');
const participantsMdPath = path.join(rootDir, 'Login_credentials_participants.md');
const judgesMdPath = path.join(rootDir, 'Login_credentials_judges.md');

export async function generateAllCredentialsMarkdown() {
  console.log('=== GENERATING CREDENTIAL MARKDOWN FILES ===');

  // 1. Participant / Student Leader Credentials
  const students = await prisma.user.findMany({
    where: { roleId: 'STUDENT' },
    include: {
      teamMembers: {
        include: {
          team: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const teams = await prisma.team.findMany({
    orderBy: { registrationId: 'asc' },
  });

  let pMd = `# SmartHorizon Hackathon 2026 - Student Leader Login Credentials\n\n`;
  pMd += `> **Notice:** Only Team Leaders have User IDs and login credentials to access the SmartHorizon Hackathon Operations Portal.\n`;
  pMd += `> **Security Status:** Default initial password for Team Leaders is \`student123\`. Once a Team Leader updates their password on first login, their status automatically reflects as \`[UPDATED BY USER]\` below.\n\n`;
  pMd += `--- \n\n`;
  pMd += `### **Overview & Summary**\n`;
  pMd += `- **Total Registered Teams:** \`${teams.length}\`\n`;
  pMd += `- **Total Student Leader Accounts:** \`${students.length}\`\n`;
  pMd += `- **Default Temporary Password:** \`student123\`\n`;
  pMd += `- **Portal Login URL:** http://localhost:8080/login\n\n`;
  pMd += `--- \n\n`;
  pMd += `### **Team Leader Credentials Roster**\n\n`;
  pMd += `| Sl | Team Leader Name | Team Name | Team Code / Reg ID | Login Username (Email) | Default Password | Status |\n`;
  pMd += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  let slNo = 1;
  for (const student of students) {
    const tm = student.teamMembers && student.teamMembers.length > 0 ? student.teamMembers[0] : null;
    const team = tm?.team;

    const teamName = team?.name || 'Unassigned';
    const teamId = team?.registrationId || team?.teamCode || 'N/A';
    const passwordStatus = student.mustChangePassword
      ? '`student123` *(Pending)*'
      : '🟢 **[UPDATED]**';

    pMd += `| ${slNo} | **${student.name}** | ${teamName} | \`${teamId}\` | \`${student.email}\` | \`student123\` | ${passwordStatus} |\n`;
    slNo++;
  }

  pMd += `\n---\n*Generated from SQLite database on: ${new Date().toLocaleString()}*\n`;
  fs.writeFileSync(participantsMdPath, pMd, 'utf8');
  console.log('Created:', participantsMdPath);

  // 2. Jury / Judge Credentials
  const judges = await prisma.user.findMany({
    where: { roleId: 'JUDGE' },
    include: {
      assignedTracks: true,
    },
    orderBy: { email: 'asc' },
  });

  let jMd = `# SmartHorizon Hackathon 2026 - Jury / Judge Login Credentials\n\n`;
  jMd += `> **Notice:** Official credentials for Jury Evaluators to access the SmartHorizon Hackathon Operations Portal.\n`;
  jMd += `> **Default Initial Password:** \`judge123\`\n\n`;
  jMd += `--- \n\n`;
  jMd += `### **Overview & Summary**\n`;
  jMd += `- **Total Jury Evaluator Accounts:** \`${judges.length}\`\n`;
  jMd += `- **Default Temporary Password:** \`judge123\`\n`;
  jMd += `- **Portal Login URL:** http://localhost:8080/login\n\n`;
  jMd += `--- \n\n`;
  jMd += `### **Jury Roster & Credentials**\n\n`;
  jMd += `| Sl | Evaluator Name | Login Email | Default Password | Judge Status | Assigned Tracks |\n`;
  jMd += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  let jSlNo = 1;
  for (const judge of judges) {
    const tracks = judge.assignedTracks.map(t => t.name).join(', ') || 'All Tracks';
    jMd += `| ${jSlNo} | **${judge.name}** | \`${judge.email}\` | \`judge123\` | \`${judge.judgeStatus || 'Available'}\` | ${tracks} |\n`;
    jSlNo++;
  }

  jMd += `\n---\n*Generated from SQLite database on: ${new Date().toLocaleString()}*\n`;
  fs.writeFileSync(judgesMdPath, jMd, 'utf8');
  console.log('Created:', judgesMdPath);

  console.log('=== CREDENTIAL MARKDOWN GENERATION COMPLETE ===');
}

generateAllCredentialsMarkdown()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());
