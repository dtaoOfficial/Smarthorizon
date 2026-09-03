import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Configure SQLite for high-concurrency production usage
async function configureDatabase() {
  try {
    await prisma.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`).catch(() => {});
    await prisma.$queryRawUnsafe(`PRAGMA busy_timeout = 30000;`).catch(() => {});
    await prisma.$queryRawUnsafe(`PRAGMA foreign_keys = ON;`).catch(() => {});
    await prisma.$queryRawUnsafe(`PRAGMA synchronous = NORMAL;`).catch(() => {});
    console.log('⚡ SQLite production PRAGMAs configured: WAL mode, busy_timeout=30000ms, foreign_keys=ON');
  } catch (err) {
    console.error('Failed to configure SQLite PRAGMAs:', err);
  }
}

configureDatabase();

// In-memory write mutex to strictly serialize concurrent SQLite write transactions
let writeLock = Promise.resolve<any>(undefined);

export function executeWriteTransaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
  const next = writeLock.then(async () => {
    return await fn(prisma);
  });
  writeLock = next.catch(() => {});
  return next;
}

export default prisma;
export { prisma };


