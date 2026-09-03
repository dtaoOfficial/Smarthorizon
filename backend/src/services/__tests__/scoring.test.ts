import {
  ROUND_MAX_MARKS,
  OVERALL_MAX_MARKS,
  validateCriterionScore,
  calculateSingleReviewScore,
  calculateRoundScore,
  calculateTeamScoresFromRounds,
  ReviewInput,
} from '../scoring';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function assertThrows(fn: () => void, message: string) {
  try {
    fn();
    throw new Error(`TEST FAILED (Expected throw): ${message}`);
  } catch (err: any) {
    if (err.message.startsWith('TEST FAILED')) throw err;
  }
}

export function runScoringUnitTests() {
  const dummyRounds = [
    { id: 'round-1-uuid', sequence: 1 },
    { id: 'round-2-uuid', sequence: 2 },
    { id: 'round-3-uuid', sequence: 3 },
  ];

  // 1. Invariants Tests
  assertThrows(() => validateCriterionScore(25, 20, 'Problem Understanding'), 'Score 25 > maxMarks 20 must throw');
  assertThrows(() => validateCriterionScore(-5, 20, 'Feasibility'), 'Negative score -5 must throw');
  assertThrows(() => validateCriterionScore(15.5, 20, 'Code Quality'), 'Non-integer score 15.5 must throw');
  validateCriterionScore(20, 20, 'Perfect Score');

  // 2. Single Judge Review Score
  const singleReview: ReviewInput = {
    roundId: 'round-1-uuid',
    status: 'SUBMITTED',
    scores: [
      { score: 20, criterionMaxMarks: 20 },
      { score: 15, criterionMaxMarks: 15 },
      { score: 10, criterionMaxMarks: 10 },
      { score: 15, criterionMaxMarks: 15 },
      { score: 15, criterionMaxMarks: 15 },
      { score: 10, criterionMaxMarks: 10 },
      { score: 5, criterionMaxMarks: 5 },
      { score: 10, criterionMaxMarks: 10 },
    ],
  };
  const rev1Score = calculateSingleReviewScore(singleReview.scores);
  assert(rev1Score === 100, `Single review sum should be 100, got ${rev1Score}`);

  const roundScore = calculateRoundScore([singleReview]);
  assert(roundScore.averageScore === 100, `Round score should be 100`);
  assert(roundScore.judgeCount === 1, `Judge count should be 1`);

  // 3. Multiple Judges Evaluation (Averaged, not summed)
  const judgeA: ReviewInput = {
    roundId: 'round-1-uuid',
    status: 'SUBMITTED',
    scores: [{ score: 80, criterionMaxMarks: 100 }],
  };
  const judgeB: ReviewInput = {
    roundId: 'round-1-uuid',
    status: 'SUBMITTED',
    scores: [{ score: 70, criterionMaxMarks: 100 }],
  };
  const judgeC: ReviewInput = {
    roundId: 'round-1-uuid',
    status: 'SUBMITTED',
    scores: [{ score: 90, criterionMaxMarks: 100 }],
  };

  const roundResult = calculateRoundScore([judgeA, judgeB, judgeC]);
  assert(roundResult.averageScore === 80, `Multiple judges average should be 80, got ${roundResult.averageScore}`);
  assert(roundResult.averageScore <= ROUND_MAX_MARKS, `Round average must be <= ${ROUND_MAX_MARKS}`);
  assert(roundResult.judgeCount === 3, `Judge count should be 3`);

  // 4. Partially Completed Rounds
  const summaryPartial = calculateTeamScoresFromRounds(dummyRounds, [judgeA]);
  assert(summaryPartial.r1Avg === 80, `R1 avg should be 80`);
  assert(summaryPartial.r2Avg === 0, `R2 avg should be 0`);
  assert(summaryPartial.r3Avg === 0, `R3 avg should be 0`);
  assert(summaryPartial.totalScore === 80, `Total score should be 80, got ${summaryPartial.totalScore}`);
  assert(summaryPartial.r1Formatted === '80 / 100', `R1 formatted should be 80 / 100`);
  assert(summaryPartial.totalFormatted === '80 / 300', `Formatted total should be "80 / 300"`);
  assert(summaryPartial.status === 'In Progress (1/3)', `Status should be "In Progress (1/3)"`);

  // 5. All 3 Rounds Completed
  const reviews: ReviewInput[] = [
    { roundId: 'round-1-uuid', status: 'SUBMITTED', scores: [{ score: 90, criterionMaxMarks: 100 }] },
    { roundId: 'round-2-uuid', status: 'SUBMITTED', scores: [{ score: 85, criterionMaxMarks: 100 }] },
    { roundId: 'round-3-uuid', status: 'SUBMITTED', scores: [{ score: 95, criterionMaxMarks: 100 }] },
  ];

  const summaryAll = calculateTeamScoresFromRounds(dummyRounds, reviews);
  assert(summaryAll.r1Avg === 90, `R1 should be 90`);
  assert(summaryAll.r2Avg === 85, `R2 should be 85`);
  assert(summaryAll.r3Avg === 95, `R3 should be 95`);
  assert(summaryAll.totalScore === 270, `270 total score expected, got ${summaryAll.totalScore}`);
  assert(summaryAll.totalFormatted === '270 / 300', `Formatted total should be 270 / 300`);
  assert(summaryAll.status === 'Completed (3/3)', `Status should be Completed (3/3)`);

  // 6. Maximum Possible Marks
  const maxReviews: ReviewInput[] = [
    { roundId: 'round-1-uuid', status: 'SUBMITTED', scores: [{ score: 100, criterionMaxMarks: 100 }] },
    { roundId: 'round-2-uuid', status: 'SUBMITTED', scores: [{ score: 100, criterionMaxMarks: 100 }] },
    { roundId: 'round-3-uuid', status: 'SUBMITTED', scores: [{ score: 100, criterionMaxMarks: 100 }] },
  ];

  const summaryMax = calculateTeamScoresFromRounds(dummyRounds, maxReviews);
  assert(summaryMax.totalScore === 300, `Max score should be 300`);
  assert(summaryMax.totalScore <= OVERALL_MAX_MARKS, `Max score must be <= OVERALL_MAX_MARKS`);
  assert(summaryMax.totalFormatted === '300 / 300', `Formatted total should be 300 / 300`);

  // 7. Zero Marks
  const zeroReviews: ReviewInput[] = [
    { roundId: 'round-1-uuid', status: 'SUBMITTED', scores: [{ score: 0, criterionMaxMarks: 100 }] },
    { roundId: 'round-2-uuid', status: 'SUBMITTED', scores: [{ score: 0, criterionMaxMarks: 100 }] },
    { roundId: 'round-3-uuid', status: 'SUBMITTED', scores: [{ score: 0, criterionMaxMarks: 100 }] },
  ];

  const summaryZero = calculateTeamScoresFromRounds(dummyRounds, zeroReviews);
  assert(summaryZero.totalScore === 0, `Zero score should be 0`);
  assert(summaryZero.totalFormatted === '0 / 300', `Formatted total should be 0 / 300`);

  // 8. Draft Reviews Ignored
  const draftReview: ReviewInput = {
    roundId: 'round-1-uuid',
    status: 'DRAFT',
    scores: [{ score: 99, criterionMaxMarks: 100 }],
  };
  const roundWithDraft = calculateRoundScore([draftReview, judgeA]);
  assert(roundWithDraft.averageScore === 80, `Draft review should be ignored`);
}
