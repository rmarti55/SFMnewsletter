#!/usr/bin/env tsx
/** Create Postgres tables for Neon. Usage: DATABASE_URL=... npx tsx scripts/migrate-postgres.ts */
import path from 'path';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const { ensurePostgresSchema } = await import('../src/lib/storage/postgres');
  await ensurePostgresSchema();
  console.log('Postgres schema ready.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
