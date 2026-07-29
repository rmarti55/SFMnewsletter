# Pipeline

1. **Fetch** — `fetchNewsletterCorpus()` from SFM export API
2. **Extract** — one OpenRouter call per recent meeting (`newsletter:storylines`)
3. **Synthesize** — one OpenRouter call for subject + markdown body (`newsletter`)
4. **Guard** — fabricated quote check + guidance leak check; deterministic Sources block
5. **Save** — SQLite `newsletter_editions` row

Orchestrator: [`src/lib/generate-draft.ts`](../src/lib/generate-draft.ts).
