#!/usr/bin/env tsx
import path from 'path';
import { config } from 'dotenv';

config({ path: path.join(process.cwd(), '.env.local') });

function parseArgs() {
  const argv = process.argv.slice(2);
  let issueDate: string | undefined;
  let lookback = 7;
  let lookahead = 7;
  let json = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--issue-date' && argv[i + 1]) issueDate = argv[++i];
    else if (a === '--lookback' && argv[i + 1]) lookback = Number(argv[++i]);
    else if (a === '--lookahead' && argv[i + 1]) lookahead = Number(argv[++i]);
    else if (a === '--json') json = true;
    else if (/^\d{4}-\d{2}-\d{2}$/.test(a)) issueDate = a;
  }
  return { issueDate, lookback, lookahead, json };
}

async function main() {
  const { getTodayInDenver } = await import('../lib/datetime');
  const { generateNewsletterDraft } = await import('../lib/generate-draft');

  const args = parseArgs();
  const issueDate = args.issueDate ?? getTodayInDenver();

  const result = await generateNewsletterDraft({
    issueDate,
    lookbackDays: args.lookback,
    lookaheadDays: args.lookahead,
  });

  const output = {
    issueDate,
    reason: result.reason,
    created: result.created,
    readiness: result.readiness,
    draft: result.edition
      ? { id: result.edition.id, subject: result.edition.subject, status: result.edition.status }
      : null,
  };

  if (args.json) console.log(JSON.stringify(output, null, 2));
  else {
    console.log(`Issue date: ${issueDate}`);
    if (result.readiness) console.log('Readiness:', result.readiness);
    if (result.reason === 'empty') console.log('Skipped: empty corpus window');
    else if (result.edition) {
      console.log(`Draft #${result.edition.id}: ${result.edition.subject}`);
    }
  }

  if (result.reason === 'empty') process.exit(0);
  if (!result.created) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
