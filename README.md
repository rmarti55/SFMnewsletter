# Santa Fe Newsletter

Standalone newsletter generator that pulls meeting corpus from [Santa Fe Minutes](https://santafeminutes.space) via the export API — no direct Neon access.

**Repo:** [github.com/rmarti55/SFMnewsletter](https://github.com/rmarti55/SFMnewsletter)

## Setup

```sh
cp .env.example .env.local
# Fill in NEWSLETTER_EXPORT_API_KEY, OPENROUTER_API_KEY
npm install
```

## CLI

```sh
npm run generate -- --issue-date 2026-07-29
npm run generate -- --issue-date 2026-07-29 --json
```

## Admin UI

```sh
npm run dev
# http://localhost:3000/admin
```

Pages: Generate (readiness preview + draft), Drafts list/editor, Guidance editor.

## Env

| Variable | Required | Notes |
| --- | --- | --- |
| `NEWSLETTER_EXPORT_API_KEY` | yes | SFM export API bearer token |
| `SFM_API_BASE_URL` | no | default `https://santafeminutes.space` |
| `OPENROUTER_API_KEY` | yes | LLM extract + synthesize |
| `LLM_SMART_MODEL` | no | default `google/gemini-2.5-flash` |
| `NEXT_PUBLIC_APP_URL` | no | OpenRouter `HTTP-Referer`; default `http://localhost:3000` |
| `DATABASE_PATH` | no | default `./data/newsletter.db` |
| `RESEND_API_KEY` / `ADMIN_EMAIL` | optional | Send button |

## Pipeline

1. `GET /api/export/newsletter-corpus` on SFM
2. Extract storylines per meeting (OpenRouter)
3. Synthesize issue + quote/guidance guards
4. Save SQLite draft

Editorial guidance lives in `guidance/editorial.md` (exported from SFM `newsletter_settings`).

## Docs

- [Pipeline](docs/pipeline.md) — extract → synthesize steps
- [OpenRouter integration](docs/openrouter.md) — env, model, attribution, local smoke check
- [Corpus readiness](docs/corpus-readiness.md) — why some meetings lack transcripts; how to read `readiness.summary` and `sections`
- [API contract](docs/api-contract.md) — SFM export endpoint field reference

## Tests

```sh
npm test
```

## Smoke (production API)

```sh
npm run smoke:corpus -- 2026-07-29
npm run smoke:openrouter
npm run generate -- --issue-date 2026-07-29 --json
```
