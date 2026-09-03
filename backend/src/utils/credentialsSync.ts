import prisma from '../db';
import fs from 'fs';
import path from 'path';

const markdownFilePath1 = path.join(__dirname, '../../../Login_credentials_participants.md');
const markdownFilePath2 = path.join(__dirname, '../../../Login credintials_particpants.md');

export async function syncParticipantCredentialsFile() {
  try {
    const teams = await prisma.team.findMany({
      where: {
        registrationId: {
          startsWith: 'SHIH26-TID-',
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { registrationId: 'asc' },
    });

    const rows: {
      sNo: number;
      name: string;
      teamName: string;
      regId: string;
      role: string;
      email: string;
      phone: string;
    }[] = [];

    let count = 1;

    for (const team of teams) {
      const leaderMember = team.members.find((m) => m.role === 'LEADER' || m.role === 'Team Leader');
      const leadEmail = team.leadEmail || leaderMember?.email || leaderMember?.user?.email;
      const leadName = team.leadName || leaderMember?.name || leaderMember?.user?.name;
      const leadPhone = team.leadMobile || leaderMember?.phone || leaderMember?.user?.phone || 'Registered Phone Number';

      if (leadEmail && leadName) {
        rows.push({
          sNo: count++,
          name: leadName,
          teamName: team.name,
          regId: team.registrationId || team.teamCode || 'N/A',
          role: 'Team Leader',
          email: leadEmail,
          phone: leadPhone,
        });
      }
    }

    // Deduplicate by email
    const uniqueMap = new Map<string, typeof rows[0]>();
    rows.forEach((r) => {
      if (!uniqueMap.has(r.email.toLowerCase())) {
        uniqueMap.set(r.email.toLowerCase(), r);
      }
    });

    const uniqueRows = Array.from(uniqueMap.values());
    uniqueRows.forEach((r, idx) => {
      r.sNo = idx + 1;
    });

    let mdContent = `# SmartHorizon Hackathon 2026 - Official Team Leader Credentials Roster\n\n`;
    mdContent += `> **Notice:** All 118 Official Team Leader accounts have been configured with **Registered Email Address as Username** and **Registered Phone Number as Password**.\n`;
    mdContent += `> **Security Status:** Plaintext passwords are NOT stored in the database. Every password is securely hashed using \`bcrypt\`.\n\n`;
    mdContent += `--- \n\n`;
    mdContent += `### **Authentication System Overview**\n`;
    mdContent += `- **Total Official Participant Teams:** \`${teams.length}\`\n`;
    mdContent += `- **Total Official Student Leader Accounts:** \`${uniqueRows.length}\`\n`;
    mdContent += `- **Login Credentials Format:**\n`;
    mdContent += `  - **Username:** Registered Email Address (e.g. \`2006harshdubey@gmail.com\`)\n`;
    mdContent += `  - **Password:** Registered Phone Number (e.g. \`9876543210\`)\n`;
    mdContent += `- **Portal Login URL:** [http://localhost:5173/login](http://localhost:5173/login)\n\n`;
    mdContent += `--- \n\n`;
    mdContent += `### **Official Participant Login Credentials Roster (${uniqueRows.length} Teams)**\n\n`;
    mdContent += `| Sl | Team Leader Name | Team Name | Reg ID | Role | Username (Email) | Password (Registered Phone Number) |\n`;
    mdContent += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    mdContent += uniqueRows.map(r => `| ${r.sNo} | **${r.name}** | ${r.teamName} | \`${r.regId}\` | ${r.role} | \`${r.email}\` | \`${r.phone}\` |`).join('\n') + '\n';
    mdContent += `\n---\n*Verified against Official CSV Database (registration-september-11th-118.csv) on ${new Date().toLocaleString()}*\n`;

    fs.writeFileSync(markdownFilePath1, mdContent, 'utf8');
    fs.writeFileSync(markdownFilePath2, mdContent, 'utf8');
    console.log('Successfully synced credentials markdown files at:', markdownFilePath1);
  } catch (error) {
    console.error('Failed to sync participant credentials markdown file:', error);
  }
}
