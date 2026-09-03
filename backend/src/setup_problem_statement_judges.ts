import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function setupJudgesPerProblemStatement() {
  console.log('Setting up 1 dedicated judge for each Problem Statement...');

  const salt = await bcrypt.genSalt(10);
  const judgePasswordHash = await bcrypt.hash('judge123', salt);

  // Fetch all teams with their tracks
  const teams = await prisma.team.findMany({
    include: {
      track: true,
    },
  });

  // Group teams by Problem Statement
  const psMap: Record<string, { psId: string; psTitle: string; trackId: string; trackName: string; teams: typeof teams }> = {};

  teams.forEach((t) => {
    const psKey = t.selectedPsId || t.domain || t.track.name || 'PS-GENERAL';
    if (!psMap[psKey]) {
      psMap[psKey] = {
        psId: psKey,
        psTitle: t.problemStatement || `Problem Statement ${psKey} Solution Domain`,
        trackId: t.trackId,
        trackName: t.track.name,
        teams: [],
      };
    }
    psMap[psKey].teams.push(t);
  });

  const psList = Object.values(psMap).sort((a, b) => a.psId.localeCompare(b.psId));

  console.log(`Found ${psList.length} distinct Problem Statements.`);

  const judgeNames = [
    'Dr. Aris Thorne',
    'Prof. Elena Rostova',
    'Dr. Marcus Vance',
    'Dr. Sophia Lin',
    'Prof. Rajesh Kulkarni',
    'Dr. Hannah Schmidt',
    'Dr. Carlos Mendez',
    'Prof. Amara Okafor',
    'Dr. Kenji Takahashi',
    'Dr. Claire Dubois',
    'Prof. Vikramaditya Sen',
    'Dr. Fiona Gallagher',
    'Dr. Nathan Prescott',
    'Prof. Priya Nair',
    'Dr. Gabriel Silva',
  ];

  const createdJudges: {
    sNo: number;
    judgeName: string;
    psId: string;
    psTitle: string;
    trackName: string;
    assignedTeamsCount: number;
    email: string;
    password: string;
  }[] = [];

  for (let i = 0; i < psList.length; i++) {
    const ps = psList[i];
    const judgeName = judgeNames[i % judgeNames.length];
    const cleanPsId = ps.psId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const judgeEmail = `judge.${cleanPsId}@smarthorizon.com`;

    // Create or update Judge User account
    let judgeUser = await prisma.user.findUnique({ where: { email: judgeEmail } });
    if (!judgeUser) {
      judgeUser = await prisma.user.create({
        data: {
          email: judgeEmail,
          passwordHash: judgePasswordHash,
          name: `${judgeName} (Lead Evaluator ${ps.psId})`,
          phone: `+1 (555) 019-${2000 + i + 1}`,
          judgeStatus: 'Available',
          avgReviewTime: 5.0,
          roleId: 'JUDGE',
          assignedTracks: { connect: [{ id: ps.trackId }] },
        },
      });
    } else {
      await prisma.user.update({
        where: { id: judgeUser.id },
        data: {
          name: `${judgeName} (Lead Evaluator ${ps.psId})`,
          passwordHash: judgePasswordHash,
          assignedTracks: { connect: [{ id: ps.trackId }] },
        },
      });
    }

    // Assign this judge to all teams in this Problem Statement
    for (let tIdx = 0; tIdx < ps.teams.length; tIdx++) {
      const team = ps.teams[tIdx];
      const existingAssign = await prisma.judgeAssignment.findFirst({
        where: { judgeId: judgeUser.id, teamId: team.id },
      });

      if (!existingAssign) {
        await prisma.judgeAssignment.create({
          data: {
            judgeId: judgeUser.id,
            teamId: team.id,
            trackId: ps.trackId,
            order: tIdx + 1,
          },
        });
      }
    }

    createdJudges.push({
      sNo: i + 1,
      judgeName: `${judgeName}`,
      psId: ps.psId,
      psTitle: ps.psTitle,
      trackName: ps.trackName,
      assignedTeamsCount: ps.teams.length,
      email: judgeEmail,
      password: 'judge123',
    });
  }

  // Format Markdown file
  let mdContent = `# SmartHorizon Hackathon 2026 - Judge Login Credentials

> **Notice:** Exactly 1 dedicated expert judge is assigned to evaluate each Problem Statement. Judges can log into the SmartHorizon Hackathon Operations Portal using their assigned email address as the username and the password specified below.

---

### **Overview & Summary**
- **Total Dedicated Judges:** \`${createdJudges.length}\` (1 Judge per Problem Statement)
- **Default Judge Password:** \`judge123\`
- **Portal Login URL:** [http://localhost:5173/login](http://localhost:5173/login)

---

### **Judge Credentials Roster (1 Judge per Problem Statement)**

| S.No | Judge Name | Assigned Problem Statement ID | Domain / Track | Teams to Evaluate | Login Username (Email) | Password |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

  createdJudges.forEach((j) => {
    mdContent += `| ${j.sNo} | **${j.judgeName}** | \`${j.psId}\` | ${j.trackName} | ${j.assignedTeamsCount} Teams | \`${j.email}\` | \`${j.password}\` |\n`;
  });

  mdContent += `\n---\n*Generated by SmartHorizon Hackathon Operations Desk on ${new Date().toLocaleString()}*\n`;

  const outputPath1 = path.join(__dirname, '../../Login credentials_judges.md');
  const outputPath2 = path.join(__dirname, '../../Login credintials_judges.md');

  fs.writeFileSync(outputPath1, mdContent, 'utf8');
  fs.writeFileSync(outputPath2, mdContent, 'utf8');

  console.log(`Successfully assigned ${createdJudges.length} judges to their problem statements and generated credentials at ${outputPath1}`);
}

setupJudgesPerProblemStatement()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
