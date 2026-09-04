// One-off backfill: Team.college / Team.collegeName are null for all 118 teams
// in the database, even though registration-september-11th-118.csv has correct
// per-team college_name values. None of the current import scripts
// (import_csv_118.ts, import_strict_118.ts) produce this - whatever actually
// populated this database's Team rows skipped college entirely. This backfills
// both fields from the CSV, matched by registrationId.
const prisma = require('./dist/db').default;
const XLSX = require('xlsx');
const CSV_PATH = './registration-september-11th-118.csv';

(async () => {
  const wb = XLSX.readFile(CSV_PATH);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });

  let updated = 0;
  let alreadySet = 0;
  const notFound = [];
  const noCollegeInSource = [];

  for (const row of rows) {
    const bareId = String(row.registration_id || '').trim();
    if (!bareId) continue;
    const registrationId = `SHIH26-TID-${bareId.padStart(3, '0')}`;
    const collegeName = row.college_name ? String(row.college_name).trim() : null;

    const team = await prisma.team.findUnique({ where: { registrationId } });
    if (!team) {
      notFound.push(registrationId);
      continue;
    }
    if (!collegeName) {
      noCollegeInSource.push(registrationId);
      continue;
    }
    if (team.college === collegeName && team.collegeName === collegeName) {
      alreadySet++;
      continue;
    }

    await prisma.team.update({
      where: { id: team.id },
      data: { college: collegeName, collegeName: collegeName },
    });
    updated++;
  }

  console.log(`Updated: ${updated}, already set: ${alreadySet}, not found: ${notFound.length}, no college in source: ${noCollegeInSource.length}`);
  if (notFound.length) console.log('Not found:', notFound);
  if (noCollegeInSource.length) console.log('No college in source:', noCollegeInSource);

  const remaining = await prisma.team.count({ where: { AND: [{ OR: [{ college: null }, { college: '' }] }, { OR: [{ collegeName: null }, { collegeName: '' }] }] } });
  console.log('Teams still missing college after backfill:', remaining);

  await prisma.$disconnect();
})().catch(async (err) => {
  console.error('Failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
