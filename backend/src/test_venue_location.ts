import prisma from './db';
import { countWords } from './routes/submissions';

async function testVenueLocationFeature() {
  console.log('====================================================');
  console.log('STARTING VENUE LOCATION TICKET FEATURE TEST');
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

  const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
  assert(!!activeHackathon, 'Active Hackathon exists in DB');
  if (!activeHackathon) return;

  const student = await prisma.user.findFirst({ where: { roleId: 'STUDENT' } });
  assert(!!student, 'Student User exists in DB');
  if (!student) return;

  // 1. Create a support ticket with compulsory venue location
  const venueLoc = 'Main Auditorium - Table #42, Block B';
  const question = await prisma.question.create({
    data: {
      hackathonId: activeHackathon.id,
      userId: student.id,
      category: 'TECHNICAL',
      title: 'Power Socket Malfunction at Seating Table',
      content: 'Our team table is experiencing intermittent power cuts on socket #2.',
      venueLocation: venueLoc,
      priority: 'HIGH',
      status: 'Open',
    },
  });

  assert(!!question && question.venueLocation === venueLoc, 'TEST 1: Question created with exact venue location in DB');

  // 2. Query questions and verify venueLocation field is returned
  const fetchedQuestion = await prisma.question.findUnique({
    where: { id: question.id },
  });

  assert(fetchedQuestion?.venueLocation === venueLoc, 'TEST 2: Venue location retrieved accurately from DB query');

  // 3. Clean up test record
  await prisma.question.delete({ where: { id: question.id } });

  console.log('====================================================');
  console.log(`VENUE LOCATION TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED.`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

testVenueLocationFeature()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
