# Database safety — incident postmortem

**Date:** 2026-07-31  
**Impact:** All locally stored newsletter drafts were permanently deleted.  
**Status:** Safeguards added; data not recoverable from the repo.

---

## Where drafts live

Newsletter drafts are stored in **SQLite**, not in git.

| Environment | `DATABASE_PATH` | Persists? |
| --- | --- | --- |
| Local dev (default) | `./data/newsletter.db` | Yes — until something deletes the file |
| Local (`.env.local`) | Whatever you set | Yes |
| Vercel | `/tmp/newsletter.db` (auto) | **No** — ephemeral per instance; wiped on cold starts and redeploys |

Research uploads follow the same pattern: metadata in SQLite, files under `RESEARCH_STORAGE_PATH` (default `./data/research` locally, `/tmp/research` on Vercel).

Both paths are gitignored (`data/`, `*.db`). There is no commit history or backup inside this repository.

---

## What happened (2026-07-30)

### Timeline

| When | What |
| --- | --- |
| **2026-07-29** | Multiple newsletter drafts existed in `data/newsletter.db` (including draft #3, which incorrectly led with Jim Heath public-comment content). |
| **2026-07-30 ~12:10** | The local database file was deleted and recreated empty. Orphaned research files (`data/research/1-water.md`, `2-plaza.txt`) were left on disk. |
| **2026-07-30 12:13** | Commit `1cbfcdf` landed: research upload UI, `research_documents` table, and `tests/research.test.ts`. |
| **2026-07-31** | User opened `/admin/drafts` and saw "No drafts yet." Investigation confirmed `newsletter_editions` had 0 rows. |

### Root cause

While building the **city research library** feature, tests were added that call `resetDbForTests()` in a `beforeEach` hook:

```typescript
// tests/research.test.ts
beforeEach(() => {
  resetDbForTests();  // deletes the entire SQLite file + research dir
  initResearchSchema();
});
```

The original `resetDbForTests()` implementation had **no guardrails**. It unconditionally:

1. Closed the open DB connection
2. `unlinkSync`'d `DATABASE_PATH` and its `-wal` / `-shm` sidecars
3. `rmSync`'d `RESEARCH_STORAGE_PATH` recursively

When tests ran **without** isolated paths (e.g. during early development, from an IDE test runner that skipped Vitest setup, or before `tests/setup.ts` was wired correctly), they used the **production paths** from `.env.local`:

```
DATABASE_PATH=./data/newsletter.db
RESEARCH_STORAGE_PATH=./data/research
```

Each test run wiped the real database. Evidence that production paths were hit:

- `data/research/1-water.md` contains the exact fixture text from `research.test.ts` (`"Outdoor irrigation dominates demand."`), which is only inserted by that test's `insertResearchDocument` call.
- The DB file timestamp (Jul 30 12:10) aligns with the research feature commit.
- The DB was an empty 4 KB shell with **no tables** — consistent with `unlinkSync` followed by a fresh `getDb()` creating a new file.

### Why this was a design failure

1. **Destructive helper in production code** — `resetDbForTests()` lived in `src/lib/db.ts` and could target any path.
2. **No path validation** — nothing checked that the target was a throwaway test directory.
3. **No opt-in flag** — tests did not require an explicit "I am in test mode" signal.
4. **Real data in a gitignored file** — once deleted, there was no recovery path in the repo.

This was introduced during agent-assisted development of the research upload feature. The tests were written to reset state between runs, but the isolation layer was not enforced at the function that actually deletes files.

---

## What we did to fix it

Three layers were added so `resetDbForTests()` **cannot** touch production storage again.

### 1. `assertTestOnlyStorage()` — hard refusal

Added to `src/lib/db.ts`. Called at the top of every `resetDbForTests()`. Throws unless **all** of the following are true:

| Check | Requirement |
| --- | --- |
| Test mode flag | `NEWSLETTER_TEST_MODE === '1'` |
| DB path | Resolved `DATABASE_PATH` is under `os.tmpdir()` |
| DB path marker | Path contains `santa-fe-newsletter-test` |
| Research path | Same rules for `RESEARCH_STORAGE_PATH` when set |

If any check fails, the function throws `resetDbForTests() refused: …` and **does not delete anything**.

### 2. Vitest setup sets isolated paths + test mode

`tests/setup.ts` runs before every test file:

```typescript
const base = path.join(os.tmpdir(), `santa-fe-newsletter-test-${poolId}`);
process.env.NEWSLETTER_TEST_MODE = '1';
process.env.DATABASE_PATH = path.join(base, 'newsletter.db');
process.env.RESEARCH_STORAGE_PATH = path.join(base, 'research');
```

Production `./data/` is never referenced during `npm test`.

### 3. Automated regression tests

`tests/db-safety.test.ts` verifies on every CI/local test run:

- Pointing at `./data/newsletter.db` → throws
- Missing `NEWSLETTER_TEST_MODE` → throws
- `/tmp` path without the `santa-fe-newsletter-test` marker → throws
- Proper vitest-isolated paths → allowed

---

## What this does *not* fix

| Risk | Status |
| --- | --- |
| **Vercel ephemeral `/tmp`** | Unchanged. Drafts on Vercel still vanish on redeploy/cold start. Use local dev for durable drafts, or migrate to Postgres/Blob (see README). |
| **Manual `rm data/newsletter.db`** | Unprotected — don't do that. |
| **Lost drafts from 2026-07-30** | Not recoverable from git. Check Resend sent mail if any draft was emailed. |

---

## Rules for future development

1. **Never call `resetDbForTests()` outside `npm test`.** It will throw if you try.
2. **Never add new "delete the whole database" helpers without the same guards.**
3. **Run tests only via `npm test`** (which loads `tests/setup.ts`), not ad-hoc imports in scripts or the IDE without Vitest config.
4. **Treat `data/newsletter.db` as production data** — it is not disposable.
5. **Before adding destructive test utilities**, ask: "What happens if this runs with `.env.local` loaded and no test setup?"

---

## Related files

| File | Role |
| --- | --- |
| `src/lib/db.ts` | `assertTestOnlyStorage()`, `resetDbForTests()`, draft CRUD |
| `tests/setup.ts` | Isolated temp paths + `NEWSLETTER_TEST_MODE` |
| `tests/db-safety.test.ts` | Regression tests for the guards |
| `tests/research.test.ts` | Uses `resetDbForTests()` in `beforeEach` (now safe) |
| `.env.example` | Documents `DATABASE_PATH` / `RESEARCH_STORAGE_PATH` defaults |
