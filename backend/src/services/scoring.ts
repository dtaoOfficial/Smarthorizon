/**
 * Canonical Scoring Engine for Smart Horizon 2026
 *
 * Scoring Model Specification:
 * - Evaluation Round 1: Max 100 Marks
 * - Evaluation Round 2: Max 100 Marks
 * - Evaluation Round 3: Max 100 Marks
 * - Overall Raw Total: Max 300 Marks
 *
 * Aggregation Rule:
 * - If multiple judges evaluate a team in the same round, the team's round score
 *   is the AVERAGE of completed judge scores for that round, capped at 100.
 * - Overall score is the sum of completed round averages, capped at 300.
 * - Every criterion score MUST satisfy: 0 <= score <= criterion.maxMarks and be a whole integer.
 */

export const ROUND_MAX_MARKS = 100;
export const OVERALL_MAX_MARKS = 300;
export const NUMBER_OF_ROUNDS = 3;

export interface CriterionScoreInput {
  score: number;
  criterionMaxMarks?: number;
}

export interface ReviewInput {
  id?: string;
  roundId: string;
  judgeId?: string;
  status?: string;
  scores: Array<CriterionScoreInput>;
}

export interface TeamScoringSummary {
  r1Avg: number;
  r2Avg: number;
  r3Avg: number;
  r1Formatted: string; // e.g. "80 / 100" or "N/A"
  r2Formatted: string;
  r3Formatted: string;
  totalScore: number;   // 0 - 300
  totalFormatted: string; // e.g. "240 / 300"
  completedRoundsCount: number;
  status: string;       // "Completed (3/3)", "In Progress (1/3)", etc.
}

/**
 * Validates that an individual criterion score satisfies invariants:
 * 0 <= score <= maxMarks AND score is a whole integer.
 */
export function validateCriterionScore(score: number, maxMarks: number, criterionName?: string): void {
  if (typeof score !== 'number' || isNaN(score)) {
    throw new Error(`Invalid score value: ${score}`);
  }
  if (!Number.isInteger(score)) {
    throw new Error(`Score must be a whole integer. Received: ${score}`);
  }
  if (score < 0) {
    throw new Error(`Score cannot be negative (${score}) for criterion "${criterionName || 'Unknown'}"`);
  }
  if (score > maxMarks) {
    throw new Error(`Score (${score}) exceeds maximum allowed marks (${maxMarks}) for criterion "${criterionName || 'Unknown'}"`);
  }
}

/**
 * Calculates raw sum of scores for a single judge review for a round,
 * strictly capped at 100.
 */
export function calculateSingleReviewScore(scores: CriterionScoreInput[]): number {
  if (!scores || scores.length === 0) return 0;

  let rawSum = 0;
  for (const s of scores) {
    const validScore = Math.max(0, Math.round(s.score || 0));
    if (s.criterionMaxMarks !== undefined && validScore > s.criterionMaxMarks) {
      rawSum += s.criterionMaxMarks;
    } else {
      rawSum += validScore;
    }
  }

  // Strictly enforce 0 <= reviewScore <= 100
  return Math.min(ROUND_MAX_MARKS, Math.max(0, rawSum));
}

/**
 * Calculates canonical round average score from all SUBMITTED reviews for a specific round.
 * Multiple judge scores are AVERAGED. Returns 0 - 100.
 */
export function calculateRoundScore(reviews: ReviewInput[]): { averageScore: number; judgeCount: number } {
  const submittedReviews = (reviews || []).filter(r => !r.status || r.status === 'SUBMITTED' || r.status === 'COMPLETED');

  if (submittedReviews.length === 0) {
    return { averageScore: 0, judgeCount: 0 };
  }

  let totalSum = 0;
  for (const rev of submittedReviews) {
    const revScore = calculateSingleReviewScore(rev.scores);
    totalSum += revScore;
  }

  const rawAvg = totalSum / submittedReviews.length;
  // Format to 1 decimal place, clamped strictly within 0 - 100
  const averageScore = Math.min(ROUND_MAX_MARKS, Math.max(0, Number(rawAvg.toFixed(1))));
  return { averageScore, judgeCount: submittedReviews.length };
}

/**
 * Calculates canonical Team Overall Score across all 3 rounds.
 * Returns team scoring summary enforcing invariants:
 * 0 <= r1 <= 100
 * 0 <= r2 <= 100
 * 0 <= r3 <= 100
 * 0 <= totalScore <= 300
 */
export function calculateTeamScoresFromRounds(
  rounds: Array<{ id: string; sequence: number }>,
  allSubmittedReviews: ReviewInput[]
): TeamScoringSummary {
  const roundMap: Record<number, ReviewInput[]> = { 1: [], 2: [], 3: [] };

  const roundIdToSeq: Record<string, number> = {};
  rounds.forEach((r) => {
    roundIdToSeq[r.id] = r.sequence;
  });

  allSubmittedReviews.forEach((rev) => {
    const seq = roundIdToSeq[rev.roundId] || 1;
    if (roundMap[seq]) {
      roundMap[seq].push(rev);
    }
  });

  const r1 = calculateRoundScore(roundMap[1]);
  const r2 = calculateRoundScore(roundMap[2]);
  const r3 = calculateRoundScore(roundMap[3]);

  const r1Avg = r1.averageScore;
  const r2Avg = r2.averageScore;
  const r3Avg = r3.averageScore;

  const r1HasReviews = r1.judgeCount > 0;
  const r2HasReviews = r2.judgeCount > 0;
  const r3HasReviews = r3.judgeCount > 0;

  const completedRoundsCount = [r1HasReviews, r2HasReviews, r3HasReviews].filter(Boolean).length;

  const rawTotal = Number((r1Avg + r2Avg + r3Avg).toFixed(1));
  const totalScore = Math.min(OVERALL_MAX_MARKS, Math.max(0, rawTotal));

  let status = 'Pending';
  if (completedRoundsCount === 3) status = 'Completed (3/3)';
  else if (completedRoundsCount > 0) status = `In Progress (${completedRoundsCount}/3)`;

  return {
    r1Avg,
    r2Avg,
    r3Avg,
    r1Formatted: r1HasReviews ? `${r1Avg} / 100` : 'N/A',
    r2Formatted: r2HasReviews ? `${r2Avg} / 100` : 'N/A',
    r3Formatted: r3HasReviews ? `${r3Avg} / 100` : 'N/A',
    totalScore,
    totalFormatted: `${totalScore} / 300`,
    completedRoundsCount,
    status,
  };
}
