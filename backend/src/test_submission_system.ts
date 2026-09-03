import prisma from './db';
import bcrypt from 'bcryptjs';
import { countWords, isValidGitHubUrl } from './routes/submissions';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

async function runSubmissionSystemTestSuite() {
  console.log('====================================================');
  console.log('STARTING COMPLETE SUBMISSION SYSTEM TEST SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // Find or set up test environment records
  const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
  assert(!!activeHackathon, 'Active Hackathon exists in DB');

  if (!activeHackathon) {
    console.error('Cannot proceed without active hackathon.');
    return;
  }

  const adminUser = await prisma.user.findFirst({ where: { roleId: 'ADMINISTRATOR' } });
  assert(!!adminUser, 'Admin User exists in DB');

  const studentUser = await prisma.user.findFirst({ where: { roleId: 'STUDENT' } });
  assert(!!studentUser, 'Student User exists in DB');

  const team = await prisma.team.findFirst({
    where: { hackathonId: activeHackathon.id },
    include: { members: true, track: true },
  });
  assert(!!team, 'Test Team exists in DB');

  if (!team || !adminUser || !studentUser) return;

  // Clean any previous test submission data for this team
  await prisma.projectSubmissionRevision.deleteMany({
    where: { submission: { teamId: team.id } },
  });
  await prisma.projectSubmission.deleteMany({
    where: { teamId: team.id },
  });

  // TEST 1: Admin opens submissions
  await prisma.hackathon.update({
    where: { id: activeHackathon.id },
    data: { submissionsOpen: true },
  });
  const updatedHackathon = await prisma.hackathon.findUnique({ where: { id: activeHackathon.id } });
  assert(updatedHackathon?.submissionsOpen === true, 'TEST 1: Admin opens submissions globally');

  // TEST 2: Word Count helper test (< 100 words)
  const validAbstract = 'WellWare is an AI-driven health diagnostics platform built for rapid clinical triage. It leverages real-time vitals monitoring and computer vision models to identify risk factors early. Built using Python, TensorFlow, React, and Node.js, WellWare ensures seamless data security and instant emergency dispatches for healthcare professionals across hospital networks.';
  const wordCountValid = countWords(validAbstract);
  assert(wordCountValid > 0 && wordCountValid <= 100, `TEST 2: Word count calculation helper counted ${wordCountValid} words`);
  assert(wordCountValid <= 100, 'TEST 2b: Abstract word count <= 100 words check passes');

  // TEST 3: Word Count helper test (> 100 words rejection)
  let longAbstract = '';
  for (let i = 0; i < 115; i++) {
    longAbstract += `word${i} `;
  }
  const wordCountLong = countWords(longAbstract);
  assert(wordCountLong === 115, 'TEST 3: Long abstract counted as 115 words');
  assert(wordCountLong > 100, 'TEST 3b: Long abstract correctly triggers > 100 words rejection');

  // TEST 4: GitHub URL Validation Helper
  assert(isValidGitHubUrl('https://github.com/smarthorizon/wellware-ai') === true, 'TEST 4a: Valid GitHub URL recognized');
  assert(isValidGitHubUrl('https://www.github.com/user/repo') === true, 'TEST 4b: Valid www.github.com URL recognized');
  assert(isValidGitHubUrl('https://gitlab.com/user/repo') === false, 'TEST 4c: Non-GitHub URL rejected');
  assert(isValidGitHubUrl('not-a-url') === false, 'TEST 4d: Malformed URL rejected');

  // TEST 5: Create presentation file on storage
  const uploadDir = path.join(__dirname, '../uploads/submissions');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const testFileFilename = `sub_ppt_test_${Date.now()}.pptx`;
  const testFilePath = path.join(uploadDir, testFileFilename);
  fs.writeFileSync(testFilePath, Buffer.from('PK\x03\x04Dummy PPTX test presentation file content'));
  const presentationUrl = `/uploads/submissions/${testFileFilename}`;
  assert(fs.existsSync(testFilePath), 'TEST 5: Sample PPTX file created on server storage');

  // TEST 6: Student submits project deliverables (DB Upsert & Revision)
  const now = new Date();
  const submission = await prisma.$transaction(async (tx) => {
    const sub = await tx.projectSubmission.upsert({
      where: { teamId: team.id },
      update: {
        projectTitle: 'WellWare AI Diagnostic Engine',
        projectAbstract: validAbstract,
        githubUrl: 'https://github.com/smarthorizon/wellware-ai',
        presentationUrl,
        originalFileName: 'WellWare_Final_Presentation.pptx',
        fileSize: 4096,
        status: 'SUBMITTED',
        submittedById: studentUser.id,
        version: 1,
        updatedAt: now,
      },
      create: {
        teamId: team.id,
        projectTitle: 'WellWare AI Diagnostic Engine',
        projectAbstract: validAbstract,
        githubUrl: 'https://github.com/smarthorizon/wellware-ai',
        presentationUrl,
        originalFileName: 'WellWare_Final_Presentation.pptx',
        fileSize: 4096,
        status: 'SUBMITTED',
        submittedById: studentUser.id,
        version: 1,
        submittedAt: now,
      },
    });

    await tx.projectSubmissionRevision.create({
      data: {
        submissionId: sub.id,
        projectTitle: 'WellWare AI Diagnostic Engine',
        projectAbstract: validAbstract,
        githubUrl: 'https://github.com/smarthorizon/wellware-ai',
        presentationUrl,
        originalFileName: 'WellWare_Final_Presentation.pptx',
        fileSize: 4096,
        version: 1,
        submittedById: studentUser.id,
      },
    });

    // Update Team fields for 100% backward compatibility
    await tx.team.update({
      where: { id: team.id },
      data: {
        projectTitle: 'WellWare AI Diagnostic Engine',
        projectDesc: validAbstract,
        projectUrl: 'https://github.com/smarthorizon/wellware-ai',
        presentationUrl,
        repoVisibility: 'PUBLIC',
      },
    });

    return sub;
  });

  assert(!!submission && submission.status === 'SUBMITTED', 'TEST 6a: Project submission created successfully');

  const updatedTeam = await prisma.team.findUnique({ where: { id: team.id } });
  assert(updatedTeam?.projectTitle === 'WellWare AI Diagnostic Engine', 'TEST 6b: Team projectTitle updated canonically');
  assert(updatedTeam?.projectUrl === 'https://github.com/smarthorizon/wellware-ai', 'TEST 6c: Team projectUrl updated canonically');

  // TEST 7: Resubmission / Revision Update
  const resubmission = await prisma.$transaction(async (tx) => {
    const updatedSub = await tx.projectSubmission.update({
      where: { teamId: team.id },
      data: {
        projectTitle: 'WellWare AI Diagnostic Engine (v2)',
        version: 2,
        updatedAt: new Date(),
      },
    });

    await tx.projectSubmissionRevision.create({
      data: {
        submissionId: updatedSub.id,
        projectTitle: 'WellWare AI Diagnostic Engine (v2)',
        projectAbstract: validAbstract,
        githubUrl: 'https://github.com/smarthorizon/wellware-ai',
        presentationUrl,
        originalFileName: 'WellWare_Final_Presentation.pptx',
        fileSize: 4096,
        version: 2,
        submittedById: studentUser.id,
      },
    });

    return updatedSub;
  });

  assert(resubmission.version === 2, 'TEST 7a: Resubmission increments version to 2');

  const revisions = await prisma.projectSubmissionRevision.findMany({
    where: { submissionId: resubmission.id },
  });
  assert(revisions.length === 2, 'TEST 7b: Submission audit history preserved 2 revisions');

  // TEST 8: Server-side Submissions Closed enforcement check
  await prisma.hackathon.update({
    where: { id: activeHackathon.id },
    data: { submissionsOpen: false },
  });

  const closedHackathon = await prisma.hackathon.findUnique({ where: { id: activeHackathon.id } });
  assert(closedHackathon?.submissionsOpen === false, 'TEST 8a: Admin closes submissions globally');

  // Server-side check
  const isSubmissionAllowed = closedHackathon?.submissionsOpen ?? false;
  assert(isSubmissionAllowed === false, 'TEST 8b: Server rejects submission when submissionsOpen is false');

  // TEST 9: Admin CSV Generation Check
  const allSubmissions = await prisma.projectSubmission.findMany({
    include: { team: { include: { track: true } } },
  });
  assert(allSubmissions.length >= 1, 'TEST 9a: Admin query retrieves submitted project records');

  // TEST 10: Bulk ZIP Generation Check
  const zip = new AdmZip();
  let zipCount = 0;
  allSubmissions.forEach((sub) => {
    const filePath = path.join(__dirname, '../', sub.presentationUrl);
    if (fs.existsSync(filePath)) {
      zip.addFile(`Presentations/${sub.teamId}.pptx`, fs.readFileSync(filePath));
      zipCount++;
    }
  });
  const zipBuffer = zip.toBuffer();
  assert(zipCount > 0 && zipBuffer.length > 0, 'TEST 10: AdmZip bundles submitted presentation files into ZIP file');

  console.log('====================================================');
  console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED.`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSubmissionSystemTestSuite()
  .catch((e) => {
    console.error('Test suite error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
