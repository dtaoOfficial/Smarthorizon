import { runScoringUnitTests } from './services/__tests__/scoring.test';

console.log('--- EXECUTING CANONICAL SCORING ENGINE SUITE ---');
try {
  runScoringUnitTests();
  console.log('🎉 ALL CANONICAL SCORING INVARIANT TESTS PASSED 100% PERFECTLY!');
} catch (err: any) {
  console.error('❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
}
