import type { Article } from './types';
import { getDb } from './db';
import { deleteArticleImage } from './article-files';
import { resolveUniqueSlug, slugifyHeadline } from './article-slug';

function rowToArticle(row: Record<string, unknown>): Article {
  return {
    id: row.id as number,
    slug: row.slug as string,
    headline: row.headline as string,
    dek: (row.dek as string) ?? null,
    bodyMarkdown: row.body_markdown as string,
    imagePath: (row.image_path as string) ?? null,
    status: row.status as 'draft' | 'listed',
    emailedAt: (row.emailed_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function initArticlesSchema(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      headline TEXT NOT NULL,
      dek TEXT,
      body_markdown TEXT NOT NULL,
      image_path TEXT,
      status TEXT NOT NULL DEFAULT 'listed',
      emailed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
    CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
  `);
}

function slugExists(slug: string, excludeId?: number): boolean {
  initArticlesSchema();
  const row = excludeId
    ? getDb().prepare(`SELECT id FROM articles WHERE slug = ? AND id != ?`).get(slug, excludeId)
    : getDb().prepare(`SELECT id FROM articles WHERE slug = ?`).get(slug);
  return Boolean(row);
}

function allocateSlug(headline: string, excludeId?: number): string {
  const base = slugifyHeadline(headline);
  return resolveUniqueSlug(base, (slug) => slugExists(slug, excludeId));
}

export function listArticles(options?: { listedOnly?: boolean }): Article[] {
  initArticlesSchema();
  const query = options?.listedOnly
    ? `SELECT * FROM articles WHERE status = 'listed' ORDER BY created_at DESC`
    : `SELECT * FROM articles ORDER BY created_at DESC`;
  const rows = getDb().prepare(query).all() as Record<string, unknown>[];
  return rows.map(rowToArticle);
}

export function getArticleById(id: number): Article | null {
  initArticlesSchema();
  const row = getDb().prepare(`SELECT * FROM articles WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToArticle(row) : null;
}

export function getArticleBySlug(slug: string): Article | null {
  initArticlesSchema();
  const row = getDb().prepare(`SELECT * FROM articles WHERE slug = ?`).get(slug) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToArticle(row) : null;
}

export function insertArticle(input: {
  headline: string;
  dek?: string | null;
  bodyMarkdown: string;
  status?: 'draft' | 'listed';
}): Article {
  initArticlesSchema();
  const headline = input.headline.trim();
  const bodyMarkdown = input.bodyMarkdown.trim();
  const slug = allocateSlug(headline);
  const dek = input.dek?.trim() || null;
  const status = input.status ?? 'listed';

  const result = getDb()
    .prepare(
      `INSERT INTO articles (slug, headline, dek, body_markdown, status)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(slug, headline, dek, bodyMarkdown, status);

  return getArticleById(Number(result.lastInsertRowid))!;
}

export function updateArticle(
  id: number,
  patch: {
    headline?: string;
    dek?: string | null;
    bodyMarkdown?: string;
    imagePath?: string | null;
    status?: 'draft' | 'listed';
  },
): Article | null {
  const existing = getArticleById(id);
  if (!existing) return null;

  const headline = patch.headline?.trim() ?? existing.headline;
  const bodyMarkdown = patch.bodyMarkdown?.trim() ?? existing.bodyMarkdown;
  const dek = patch.dek !== undefined ? patch.dek?.trim() || null : existing.dek;
  const status = patch.status ?? existing.status;
  const imagePath = patch.imagePath !== undefined ? patch.imagePath : existing.imagePath;

  getDb()
    .prepare(
      `UPDATE articles
       SET headline = ?, dek = ?, body_markdown = ?, image_path = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(headline, dek, bodyMarkdown, imagePath, status, id);

  return getArticleById(id);
}

export async function deleteArticle(id: number): Promise<boolean> {
  const existing = getArticleById(id);
  if (!existing) return false;
  if (existing.imagePath) await deleteArticleImage(existing.imagePath);
  initArticlesSchema();
  const result = getDb().prepare(`DELETE FROM articles WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function markArticleEmailed(id: number): Article | null {
  initArticlesSchema();
  getDb()
    .prepare(`UPDATE articles SET emailed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
    .run(id);
  return getArticleById(id);
}
