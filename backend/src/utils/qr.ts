import prisma from '../db';

export function getTrackAbbreviation(trackName: string): string {
  const name = trackName.toLowerCase();
  if (name.includes('fintech')) return 'FT';
  if (name.includes('health')) return 'HC';
  if (name.includes('ai') || name.includes('machine') || name.includes('ml')) return 'AI';
  if (name.includes('cyber') || name.includes('security')) return 'CS';
  if (name.includes('open') || name.includes('innov')) return 'OI';
  
  const words = trackName.toUpperCase().split(/\s+/);
  if (words.length > 1) {
    return words.map(w => w[0]).join('').substring(0, 3);
  }
  return trackName.substring(0, 2).toUpperCase();
}

export async function generateTeamCode(trackId: string, trackName: string, tx: any = prisma): Promise<string> {
  const trackAbbr = getTrackAbbreviation(trackName);
  
  const trackTeams = await tx.team.findMany({
    where: {
      trackId: trackId,
      teamCode: { not: null }
    },
    select: { teamCode: true }
  });
  
  let seq = trackTeams.length + 1;
  let teamCode = `SH26-${trackAbbr}-${String(seq).padStart(3, '0')}`;
  
  let exists = await tx.team.findUnique({ where: { teamCode } });
  while (exists) {
    seq++;
    teamCode = `SH26-${trackAbbr}-${String(seq).padStart(3, '0')}`;
    exists = await tx.team.findUnique({ where: { teamCode } });
  }
  
  return teamCode;
}

export async function backfillTeams() {
  // QR codes are generated strictly upon venue check-in activation.
  return;
}
