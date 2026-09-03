import prisma from './db';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

interface JuryRawData {
  slNo: number;
  name: string;
  email: string;
  details: string;
  phone: string | null;
}

// Updated 20 Jury Evaluators roster
const juryDataRaw: JuryRawData[] = [
  { slNo: 1, name: 'Mr. Punay Mehra', email: 'punay.mehra@gmail.com', details: 'Technical Lead, AI - Incedo Inc.', phone: '9899397505' },
  { slNo: 2, name: 'Mr. Manikanth Thakur', email: 'manikant.thakur@visionet.com', details: 'Technical Lead - Visionet', phone: '9019042797' },
  { slNo: 3, name: 'Mr. Dhanush DB', email: 'dhanushdb123@gmail.com', details: 'Founder and Innovator - Lakshya Space', phone: '7019561885' },
  { slNo: 4, name: 'Ms. Priyanka K', email: 'priyanka.kanupuru@gmail.com', details: 'Visa Pvt Limited', phone: '8095029066' },
  { slNo: 5, name: 'Mr. Raghu Prasad Konduru', email: 'raghuprasadkonandur@kaushalya.tech', details: 'Founder / CEO, Kaushalya Technologies', phone: '9845547471' },
  { slNo: 6, name: 'Mr. Sunil Hosur', email: 'drsunil.ece@gmail.com', details: 'Director - Trispark Solutions Pvt Ltd', phone: '9986754377' },
  { slNo: 7, name: 'Mr. Nilesh', email: 'nilesh.rajule@unplex.tech', details: 'Managing Partner - Unplex', phone: '9604128928' },
  { slNo: 8, name: 'Ms. Priyanka Desai', email: 'priyanka.desai612@gmail.com', details: 'Systems and Hardware Enabling Engineer - Intel', phone: '9164423641' },
  { slNo: 9, name: 'Dr. R. Jayashree', email: 'jayavet@gmail.com', details: 'Dept of Animal Genetics & Breeding - Veterinary College, Hebbal', phone: '9448627916' },
  { slNo: 10, name: 'Dr. Devendra Singh Basera', email: 'dr.devendrabasera@gmail.com', details: 'Asst. Professor & Consultant Neuro-Psychiatrist - AIIMS Bhopal', phone: '9680963009' },
  { slNo: 11, name: 'Mr. Mithun TV', email: 'mithvinu@gmail.com', details: 'Chief Operating Officer - VBIG Engineers & Technology', phone: '9742707237' },
  { slNo: 12, name: 'Mr. Kantha Rao', email: 'kantha.4pi@csir.res.in', details: 'Senior Principal Scientist - CSIR 4PI, Bengaluru', phone: '9731669130' },
  { slNo: 13, name: 'Mr. Sai Kiran', email: 'sai.kiran@conneqtiongroup.com', details: 'Associate Software Engineer - Conneqtion Group Pvt Ltd', phone: '6360074795' },
  { slNo: 14, name: 'Mr. Pradeep Rao', email: 'pradeep.rao@kyndryl.com', details: 'Director - Kyndryl', phone: '9900199366' },
  { slNo: 15, name: 'Mr. Darshan', email: 'dharshan@conneqtiongroup.com', details: 'Associate Software Engineer - Conneqtion Group Pvt Ltd', phone: '9483937849' },
  { slNo: 16, name: 'Dr Timothy', email: 'timothy@nunnarilabs.com', details: 'Chief Operating Officer - Nunnari Labs Private Limited', phone: '9791383414' },
  { slNo: 17, name: 'Mr. Laxmana Lenka', email: 'laxmana_lenka@waters.com', details: 'Technical Lead - Waters Technology & Solutions', phone: '8971983983' },
  { slNo: 18, name: 'Mr. Sivaraman Rao', email: 'sivaraman_rao@waters.com', details: 'Technical Lead - Waters Technology & Solutions', phone: '8971466775' },
  { slNo: 19, name: 'Mr. Sridhar R', email: 'sridhar.ramasamy@cdw.com', details: 'Technical Lead - CDW', phone: '7868856291' },
  { slNo: 20, name: 'Mr. Ilancheran', email: 'ilancheran.muthumari@cdw.com', details: 'Technical Lead - CDW', phone: '9047515542' },
];

async function seedJuryAccounts() {
  console.log('=== SYNCING JURY LOGIN ACCOUNTS (20 EVALUATORS) ===');

  // Remove Santosh (santoshgulwadi@gmail.com) if present
  const removedSantosh = await prisma.user.findFirst({
    where: { email: 'santoshgulwadi@gmail.com' },
  });
  if (removedSantosh) {
    // Delete any dependent records if necessary before deleting user
    await prisma.judgeAssignment.deleteMany({ where: { judgeId: removedSantosh.id } });
    await prisma.user.delete({ where: { id: removedSantosh.id } });
    console.log('Removed evaluator: Mr. Santhosh (santoshgulwadi@gmail.com)');
  }

  const summaryList: { slNo: number; name: string; username: string; password: string; phone: string; details: string }[] = [];

  for (const j of juryDataRaw) {
    const username = j.email.trim().toLowerCase();
    const password = j.phone ? String(j.phone).trim() : 'judge@123';
    const phoneStr = j.phone ? String(j.phone).trim() : 'N/A';

    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await prisma.user.findFirst({
      where: { email: username },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: j.name,
          phone: j.phone,
          passwordHash,
          roleId: 'JUDGE',
          judgeStatus: 'Available',
        },
      });
      console.log(`Updated Judge account: ${j.name} (${username})`);
    } else {
      await prisma.user.create({
        data: {
          email: username,
          name: j.name,
          phone: j.phone,
          passwordHash,
          roleId: 'JUDGE',
          judgeStatus: 'Available',
        },
      });
      console.log(`Created Judge account: ${j.name} (${username})`);
    }

    summaryList.push({
      slNo: j.slNo,
      name: j.name,
      username,
      password,
      phone: phoneStr,
      details: j.details,
    });
  }

  // Write markdown file 'Login_credentials_judges.md' directly in root directory
  const rootMdPath = path.join(__dirname, '../../Login_credentials_judges.md');
  let mdContent = `# ⚖️ SmartHorizon 2026 - Official Jury Login Credentials\n\n`;
  mdContent += `Total Jury Evaluators Configured: **${summaryList.length}**\n\n`;
  mdContent += `> [!NOTE]\n`;
  mdContent += `> Evaluators can sign in at \`http://localhost:8080/login\` using their Email ID as Username and Phone Number as Password (or \`judge@123\` if phone number is unavailable).\n\n`;
  mdContent += `| Sl | Evaluator Name | Username (Email) | Password | Mobile Number | Organization & Details |\n`;
  mdContent += `|:---|:---|:---|:---|:---|:---|\n`;

  summaryList.forEach((item) => {
    mdContent += `| ${item.slNo} | **${item.name}** | \`${item.username}\` | \`${item.password}\` | ${item.phone} | ${item.details.replace(/\n/g, ' ')} |\n`;
  });

  mdContent += `\n---\n*Last synced with SQLite database on: ${new Date().toLocaleString()}*\n`;

  fs.writeFileSync(rootMdPath, mdContent, 'utf-8');
  console.log(`Saved markdown file to: ${rootMdPath}`);

  console.log('=== JURY SYNC COMPLETED SUCCESSFULLY ===');
}

seedJuryAccounts()
  .catch((err) => console.error('Jury sync failed:', err))
  .finally(() => prisma.$disconnect());
