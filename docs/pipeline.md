# Pipeline

0. **Check readiness** — preview corpus before generating. Use the admin UI (**Preview readiness**) or `npm run smoke:corpus -- YYYY-MM-DD`. Read [Corpus readiness](corpus-readiness.md) to interpret `readiness.summary` and `readiness.sections` — a low ready count is often normal, not a failure. Generate exits early with no draft if both `recent` and `upcoming` are empty.

1. **Fetch** — `fetchNewsletterCorpus()` from SFM export API
2. **Extract** — one OpenRouter call per recent meeting (`newsletter:storylines`). Uses **editorial guidance only** (`loadFullGuidance({ research: null })`) so city research facts do not leak into storyline selection.
3. **Research match** — after storylines are sorted, `getActiveResearchCategories(storylines)` picks categories (water, housing-supply, fee-in-lieu, …). `loadCityResearchForStorylines()` builds corpus from SQLite `research_documents` (digest first, then extracted `.md`/`.txt`) plus legacy markdown under `guidance/research/{category}/`.
4. **Synthesize** — one OpenRouter call for subject + markdown body (`newsletter`) with full guidance including `CITY RESEARCH CORPUS` when matched.

See [OpenRouter integration](openrouter.md) for env, model, and attribution details.

5. **Guard** — fabricated quote check; editorial leak check (transcript-bound); research topic leaks (`findResearchTopicLeaks`); deterministic Sources block
6. **Save** — SQLite `newsletter_editions` row

### Research categories

| Category | Included when storylines mention… |
| --- | --- |
| `water` | water, permits, irrigation, moratorium, water study |
| `housing-supply` | LDC, zoning, density, units, housing |
| `ahtf` | affordable housing trust fund |
| `fee-in-lieu` | SFHP, fee-in-lieu |
| `hdrb` | design review, historic district |
| `general-plan` | Santa Fe Forward, general plan |
| `general` | fallback when storylines exist but no specific category matches |

Admin uploads: **`/admin/research`**. PDFs need a pasted digest in v1. Storage is local SQLite + `data/research/`; on Vercel both are ephemeral under `/tmp` unless you add Blob + Postgres later.

Orchestrator: [`src/lib/generate-draft.ts`](../src/lib/generate-draft.ts).
