import Database from 'better-sqlite3';
import os from 'os';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { NewsletterEdition } from './types';

const TEST_DB_DIR_MARKER = 'santa-fe-newsletter-test';

/** Refuse destructive test helpers unless storage paths are isolated under os.tmpdir(). */
export function assertTestOnlyStorage(): void {
  if (process.env.NEWSLETTER_TEST_MODE !== '1') {
    throw new Error(
      'resetDbForTests() refused: NEWSLETTER_TEST_MODE is not set. Run tests via `npm test` only.',
    );
  }

  const dbPath = path.resolve(getDbPath());
  const tmpRoot = path.resolve(os.tmpdir());
  if (!dbPath.startsWith(tmpRoot + path.sep)) {
    throw new Error(
      `resetDbForTests() refused: DATABASE_PATH "${dbPath}" is not under the system temp directory.`,
    );
  }
  if (!dbPath.includes(TEST_DB_DIR_MARKER)) {
    throw new Error(
      `resetDbForTests() refused: DATABASE_PATH must live under a "${TEST_DB_DIR_MARKER}-*" directory.`,
    );
  }

  const researchDir = process.env.RESEARCH_STORAGE_PATH;
  if (researchDir) {
    const researchPath = path.resolve(researchDir);
    if (!researchPath.startsWith(tmpRoot + path.sep)) {
      throw new Error(
        `resetDbForTests() refused: RESEARCH_STORAGE_PATH "${researchPath}" is not under the system temp directory.`,
      );
    }
    if (!researchPath.includes(TEST_DB_DIR_MARKER)) {
      throw new Error(
        `resetDbForTests() refused: RESEARCH_STORAGE_PATH must live under a "${TEST_DB_DIR_MARKER}-*" directory.`,
      );
    }
  }
}

let db: Database.Database | null = null;

function getDbPath(): string {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  if (process.env.VERCEL) return '/tmp/newsletter.db';
  return path.join(process.cwd(), 'data', 'newsletter.db');
}

export function getDb(): Database.Database {
  if (db) return db;
  const dbPath = getDbPath();
  mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS newsletter_editions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_date TEXT NOT NULL,
      subject TEXT,
      body_markdown TEXT,
      source_event_ids TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      model TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      sent_at TEXT
    );
  `);
  return db;
}

function rowToEdition(row: Record<string, unknown>): NewsletterEdition {
  return {
    id: row.id as number,
    issueDate: row.issue_date as string,
    subject: (row.subject as string) ?? null,
    bodyMarkdown: (row.body_markdown as string) ?? null,
    sourceEventIds: (row.source_event_ids as string) ?? null,
    status: row.status as 'draft' | 'sent',
    model: (row.model as string) ?? null,
    createdAt: row.created_at as string,
    sentAt: (row.sent_at as string) ?? null,
  };
}

export function insertDraft(input: {
  issueDate: string;
  subject: string;
  bodyMarkdown: string;
  sourceEventIds: number[];
  model: string;
}): NewsletterEdition {
  const d = getDb();
  const result = d
    .prepare(
      `INSERT INTO newsletter_editions (issue_date, subject, body_markdown, source_event_ids, status, model)
       VALUES (?, ?, ?, ?, 'draft', ?)`,
    )
    .run(
      input.issueDate,
      input.subject,
      input.bodyMarkdown,
      JSON.stringify(input.sourceEventIds),
      input.model,
    );
  return getDraftById(Number(result.lastInsertRowid))!;
}

export function listDrafts(): NewsletterEdition[] {
  const rows = getDb()
    .prepare(`SELECT * FROM newsletter_editions ORDER BY created_at DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(rowToEdition);
}

export function getDraftById(id: number): NewsletterEdition | null {
  const row = getDb().prepare(`SELECT * FROM newsletter_editions WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToEdition(row) : null;
}

export function updateDraft(
  id: number,
  patch: { subject?: string; bodyMarkdown?: string },
): NewsletterEdition | null {
  const existing = getDraftById(id);
  if (!existing || existing.status !== 'draft') return null;
  getDb()
    .prepare(`UPDATE newsletter_editions SET subject = ?, body_markdown = ? WHERE id = ?`)
    .run(patch.subject ?? existing.subject, patch.bodyMarkdown ?? existing.bodyMarkdown, id);
  return getDraftById(id);
}

export function deleteDraft(id: number): boolean {
  const result = getDb().prepare(`DELETE FROM newsletter_editions WHERE id = ? AND status = 'draft'`).run(id);
  return result.changes > 0;
}

export function markSent(id: number): NewsletterEdition | null {
  getDb()
    .prepare(`UPDATE newsletter_editions SET status = 'sent', sent_at = datetime('now') WHERE id = ?`)
    .run(id);
  return getDraftById(id);
}

export function resetDbForTests(): void {
  assertTestOnlyStorage();

  if (db) {
    db.close();
    db = null;
  }
  const dbPath = getDbPath();
  const { unlinkSync, rmSync, existsSync: exists } = require('fs') as typeof import('fs');
  for (const suffix of ['', '-wal', '-shm']) {
    const p = dbPath + suffix;
    if (exists(p)) unlinkSync(p);
  }
  const researchDir = process.env.RESEARCH_STORAGE_PATH;
  if (researchDir && exists(researchDir)) {
    rmSync(researchDir, { recursive: true, force: true });
  }
}
