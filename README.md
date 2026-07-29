# Santa Fe Newsletter

Standalone newsletter generator that pulls meeting corpus from [Santa Fe Minutes](https://santafeminutes.space) via the export API — no direct Neon access.

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
| `DATABASE_PATH` | no | default `./data/newsletter.db` |
| `RESEND_API_KEY` / `ADMIN_EMAIL` | optional | Send button |

## Pipeline

1. `GET /api/export/newsletter-corpus` on SFM
2. Extract storylines per meeting (OpenRouter)
3. Synthesize issue + quote/guidance guards
4. Save SQLite draft

Editorial guidance lives in `guidance/editorial.md` (exported from SFM `newsletter_settings`).

## Tests

```sh
npm test
```

## Smoke (production API)

```sh
curl -s -H "Authorization: Bearer $NEWSLETTER_EXPORT_API_KEY" \
  "$SFM_API_BASE_URL/api/export/newsletter-corpus?issueDate=2026-07-29" | jq '.readiness'
```
