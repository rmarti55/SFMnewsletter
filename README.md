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

Pages: Generate (readiness preview + draft), Drafts list/editor, Guidance editor, **Research** (`/admin/research` — upload city studies by category for our-take citations).

## City research library

Upload water studies, LDC memos, and other city documents at **`/admin/research`**. Each upload gets a **category** (water, housing-supply, fee-in-lieu, …). During generate, the pipeline loads matching research **after** storyline extraction and injects it into synthesize as `CITY RESEARCH CORPUS` — for **our take** only, not quotes.

- **Digest first:** Paste citable facts (study names, dates, numbers). PDFs require a digest in v1; the generator does not auto-parse PDF text.
- **Legacy path:** Markdown in `guidance/research/{category}/` still merges when categories match.
- **Storage (local):** Metadata + digest in SQLite (`research_documents`); files under `data/research/`. Override with `RESEARCH_STORAGE_PATH`.

## Env

| Variable | Required | Notes |
| --- | --- | --- |
| `NEWSLETTER_EXPORT_API_KEY` | yes | SFM export API bearer token |
| `SFM_API_BASE_URL` | no | default `https://santafeminutes.space` |
| `OPENROUTER_API_KEY` | yes | LLM extract + synthesize |
| `LLM_SMART_MODEL` | no | default `google/gemini-2.5-flash` |
| `NEXT_PUBLIC_APP_URL` | no | OpenRouter `HTTP-Referer`; default `http://localhost:3000`. On Vercel set to your production URL. |
| `DATABASE_PATH` | no | Local default `./data/newsletter.db` (ignored when `DATABASE_URL` is set) |
| `RESEARCH_STORAGE_PATH` | no | Local default `./data/research` (ignored when using Blob on Vercel) |
| `DATABASE_URL` | **yes on Vercel** | Neon Postgres — durable drafts, research metadata, guidance |
| `BLOB_READ_WRITE_TOKEN` | **yes on Vercel** | Vercel Blob — durable research file uploads |
| `EMAIL_FROM` | **yes on Vercel** | Verified Resend sender domain |
| `RESEND_API_KEY` | **yes on Vercel** | Magic-link login + draft send |
| `ADMIN_EMAIL` | **yes on Vercel** | Only address allowed to sign in / receive drafts |
| `AUTH_SECRET` | **yes on Vercel** | Signs login links (random string, not typed at login) |

## Vercel deployment

Set these in the **sf-mnewsletter** project (Production environment):

- `NEWSLETTER_EXPORT_API_KEY` — required
- `OPENROUTER_API_KEY` — required for generate
- `NEXT_PUBLIC_APP_URL` — e.g. `https://sf-mnewsletter.vercel.app`
- `DATABASE_URL` — Neon Postgres (Vercel Marketplace)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob store
- `EMAIL_FROM` — verified sender, e.g. `Newsletter <newsletter@yourdomain.com>`
- `RESEND_API_KEY` — Resend API key
- `ADMIN_EMAIL` — your Gmail (only admin who can log in)
- `AUTH_SECRET` — random string for signing login links

Admin login: visit `/admin/login`, enter `ADMIN_EMAIL`, click the link Resend sends you. No password to remember.

After linking Neon, run migrations once:

```sh
npx tsx scripts/migrate-postgres.ts
```

Redeploy after adding env vars. Without `DATABASE_URL`, the app refuses to start on Vercel (no more ephemeral `/tmp` SQLite).

## Pipeline

1. `GET /api/export/newsletter-corpus` on SFM
2. Extract storylines per meeting (OpenRouter) — **editorial guidance only**, no research corpus
3. Match storylines to research categories → build `CITY RESEARCH CORPUS` from SQLite uploads + legacy `guidance/research/`
4. Synthesize issue + quote/guidance/research guards
5. Save draft (SQLite locally, Postgres on Vercel)

Editorial guidance lives in `guidance/editorial.md` (exported from SFM `newsletter_settings`).

## Docs

- [Pipeline](docs/pipeline.md) — extract → synthesize steps
- [OpenRouter integration](docs/openrouter.md) — env, model, attribution, local smoke check
- [Corpus readiness](docs/corpus-readiness.md) — why some meetings lack transcripts; how to read `readiness.summary` and `sections`
- [API contract](docs/api-contract.md) — SFM export endpoint field reference
- [SFNM article fetching](docs/sfnm-fetching.md) — curl-based discovery and full-HTML fetch (soft paywall, rate limits)
- [Database safety](docs/database-safety.md) — 2026-07-30 draft loss postmortem and test isolation safeguards

## Tests

```sh
npm test
```

Tests use isolated temp storage under `os.tmpdir()` — see [Database safety](docs/database-safety.md). Never point `DATABASE_PATH` at `./data/newsletter.db` in test code; `resetDbForTests()` will refuse.

## Smoke (production API)

```sh
npm run smoke:corpus -- 2026-07-29
npm run smoke:openrouter
npm run generate -- --issue-date 2026-07-29 --json
```
