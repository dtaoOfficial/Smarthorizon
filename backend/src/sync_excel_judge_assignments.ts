import * as XLSX from 'xlsx';
import prisma from './db';

const EXCEL_PATH = process.env.JUDGE_MAPPING_XLSX || './judge_mapping.xlsx';

function normalizeName(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, '') // drop "(Delhi)", "(Bangalore)" location suffixes
    .replace(/^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function main() {
  const wb = XLSX.readFile(EXCEL_PATH);

  const mappingRows = XLSX.utils
    .sheet_to_json<Record<string, any>>(wb.Sheets['team_mapping'], { defval: null })
    .filter((r) => r['S.NO'] !== 'S.NO' && r['Team ID']);

  const juryRows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets['Jury_name_list'], {
    defval: null,
  });

  const nameToEmail = new Map<string, string>();
  for (const jr of juryRows) {
    const name = jr['Name of Evaluator'];
    const email = jr['Email'];
    if (name && email) {
      nameToEmail.set(normalizeName(String(name)), String(email).trim().toLowerCase());
    }
  }

  const judges = await prisma.user.findMany({ where: { roleId: 'JUDGE' } });
  const judgesByEmail = new Map(judges.map((j) => [j.email.toLowerCase(), j]));
  const judgesByName = new Map(judges.map((j) => [normalizeName(j.name), j]));

  const teams = await prisma.team.findMany({
    where: { registrationId: { not: null } },
  });
  const teamsByRegId = new Map(teams.map((t) => [t.registrationId!.trim(), t]));

  const perJudgeOrder = new Map<string, number>();
  const unresolvedTeams: string[] = [];
  const unresolvedJudges: string[] = [];

  const assignmentsByJudge = new Map<string, { teamId: string; order: number }[]>();

  for (const row of mappingRows) {
    const teamRegId = String(row['Team ID']).replace(/^[,\s]+/, '').trim();
    const evaluatorRaw = String(row['Evaluator name']).trim();
    const normName = normalizeName(evaluatorRaw);

    const team = teamsByRegId.get(teamRegId);
    if (!team) {
      unresolvedTeams.push(teamRegId);
      continue;
    }

    const email = nameToEmail.get(normName);
    const judge = (email && judgesByEmail.get(email)) || judgesByName.get(normName);
    if (!judge) {
      unresolvedJudges.push(evaluatorRaw);
      continue;
    }

    const nextOrder = (perJudgeOrder.get(judge.id) || 0) + 1;
    perJudgeOrder.set(judge.id, nextOrder);

    await prisma.judgeAssignment.upsert({
      where: { judgeId_teamId: { judgeId: judge.id, teamId: team.id } },
      update: { trackId: team.trackId, order: nextOrder },
      create: { judgeId: judge.id, teamId: team.id, trackId: team.trackId, order: nextOrder },
    });

    if (!assignmentsByJudge.has(judge.id)) assignmentsByJudge.set(judge.id, []);
    assignmentsByJudge.get(judge.id)!.push({ teamId: team.id, order: nextOrder });
  }

  // Sync each judge's assignedTracks (Track.judges / _TrackToUser) to exactly the
  // tracks their current assignments cover, and refresh their queue pointers
  // (currentTeamId/nextTeamId) the same way the /queue reorder endpoint would.
  for (const [judgeId, assignments] of assignmentsByJudge) {
    const judgeRow = judges.find((j) => j.id === judgeId)!;
    const trackIds = [...new Set(teams.filter((t) => assignments.some((a) => a.teamId === t.id)).map((t) => t.trackId))];
    const sorted = [...assignments].sort((a, b) => a.order - b.order);

    await prisma.user.update({
      where: { id: judgeId },
      data: {
        assignedTracks: { set: trackIds.map((id) => ({ id })) },
        currentTeamId: sorted[0]?.teamId || null,
        nextTeamId: sorted[1]?.teamId || null,
      },
    });
    console.log(`  - ${judgeRow.name}: ${assignments.length} teams, ${trackIds.length} track(s)`);
  }

  const totalAssignments = await prisma.judgeAssignment.count();

  console.log('\n===============================================================');
  console.log('  JUDGE ASSIGNMENT SYNC COMPLETE');
  console.log('===============================================================');
  console.log(`Rows processed: ${mappingRows.length}`);
  console.log(`Total JudgeAssignment rows now in DB: ${totalAssignments}`);
  if (unresolvedTeams.length) {
    console.log(`\n⚠️  Unresolved team IDs (${unresolvedTeams.length}):`, unresolvedTeams);
  }
  if (unresolvedJudges.length) {
    console.log(`\n⚠️  Unresolved evaluator names (${unresolvedJudges.length}):`, unresolvedJudges);
  }
}

main()
  .catch((err) => {
    console.error('Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
