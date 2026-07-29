# Pipeline

0. **Check readiness** — preview corpus before generating. Use the admin UI (**Preview readiness**) or `npm run smoke:corpus -- YYYY-MM-DD`. Read [Corpus readiness](corpus-readiness.md) to interpret `readiness.summary` and `readiness.sections` — a low ready count is often normal, not a failure. Generate exits early with no draft if both `recent` and `upcoming` are empty.

1. **Fetch** — `fetchNewsletterCorpus()` from SFM export API
2. **Extract** — one OpenRouter call per recent meeting (`newsletter:storylines`)
3. **Synthesize** — one OpenRouter call for subject + markdown body (`newsletter`)

See [OpenRouter integration](openrouter.md) for env, model, and attribution details.

4. **Guard** — fabricated quote check + guidance leak check; deterministic Sources block
5. **Save** — SQLite `newsletter_editions` row

Orchestrator: [`src/lib/generate-draft.ts`](../src/lib/generate-draft.ts).
