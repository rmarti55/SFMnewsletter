#!/usr/bin/env tsx
/** Fetch corpus only — no LLM. Usage: npx tsx scripts/smoke-corpus.ts [issueDate] */
import path from 'path';
import { config } from 'dotenv';
config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const { fetchNewsletterCorpus } = await import('../src/lib/sfm-client');
  const issueDate = process.argv[2] || '2026-07-29';
  const corpus = await fetchNewsletterCorpus({ issueDate });
  console.log(JSON.stringify({
    issueDate: corpus.issueDate,
    readiness: corpus.readiness,
    recent: corpus.recent.length,
    upcoming: corpus.upcoming.length,
    eventIds: corpus.recent.map((r) => r.eventId),
  }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
