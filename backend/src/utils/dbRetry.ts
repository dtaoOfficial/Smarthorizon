/**
 * Transaction & Lock Retry Helper for SQLite
 * Gracefully retries transient database lock failures (SQLITE_BUSY / P2034)
 */
export async function withTransactionRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 150
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const isSqliteBusy =
        error?.code === 'P2034' ||
        (error?.message && String(error.message).includes('SQLITE_BUSY')) ||
        (error?.message && String(error.message).includes('database is locked'));

      if (isSqliteBusy && attempt < retries) {
        console.warn(`[SQLite Lock Retry] Attempt ${attempt}/${retries} after ${delayMs * attempt}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      } else {
        throw error;
      }
    }
  }
  return fn();
}
