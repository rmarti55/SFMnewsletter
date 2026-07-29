#!/usr/bin/env tsx
/** Minimal OpenRouter call — no corpus or full generate. Usage: npm run smoke:openrouter */
import path from 'path';
import { config } from 'dotenv';
config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const { chatCompletion } = await import('../src/lib/openrouter');
  const { content, model } = await chatCompletion(
    [{ role: 'user', content: 'Reply with exactly: ok' }],
    { maxTokens: 10 },
  );
  console.log(JSON.stringify({ ok: true, model, content: content.trim() }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
