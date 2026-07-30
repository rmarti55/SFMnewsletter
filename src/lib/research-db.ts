import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import { getDb } from './db';
import { isValidResearchCategory } from './research-categories';

export interface ResearchDocument {
  id: number;
  title: string;
  category: string;
  sourceFilename: string;
  mimeType: string | null;
  storagePath: string;
  extractedText: string | null;
  digestMarkdown: string | null;
  createdAt: string;
  updatedAt: string;
}

function getResearchStorageDir(): string {
  if (process.env.RESEARCH_STORAGE_PATH) return process.env.RESEARCH_STORAGE_PATH;
  if (process.env.VERCEL) return path.join('/tmp', 'research');
  return path.join(process.cwd(), 'data', 'research');
}

function rowToDoc(row: Record<string, unknown>): ResearchDocument {
  return {
    id: row.id as number,
    title: row.title as string,
    category: row.category as string,
    sourceFilename: row.source_filename as string,
    mimeType: (row.mime_type as string) ?? null,
    storagePath: row.storage_path as string,
    extractedText: (row.extracted_text as string) ?? null,
    digestMarkdown: (row.digest_markdown as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function initResearchSchema(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS research_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      source_filename TEXT NOT NULL,
      mime_type TEXT,
      storage_path TEXT NOT NULL,
      extracted_text TEXT,
      digest_markdown TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_research_documents_category ON research_documents(category);
  `);
}

export function listResearchDocuments(): ResearchDocument[] {
  initResearchSchema();
  const rows = getDb()
    .prepare(`SELECT * FROM research_documents ORDER BY created_at DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(rowToDoc);
}

export function getResearchDocument(id: number): ResearchDocument | null {
  initResearchSchema();
  const row = getDb().prepare(`SELECT * FROM research_documents WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToDoc(row) : null;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'upload';
}

function extractTextFromBuffer(filename: string, buffer: Buffer): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.markdown')) {
    return buffer.toString('utf8').trim() || null;
  }
  return null;
}

export function insertResearchDocument(input: {
  title: string;
  category: string;
  sourceFilename: string;
  mimeType: string | null;
  fileBuffer: Buffer;
  digestMarkdown?: string | null;
}): ResearchDocument {
  initResearchSchema();
  if (!isValidResearchCategory(input.category)) {
    throw new Error(`Invalid category: ${input.category}`);
  }

  const dir = getResearchStorageDir();
  mkdirSync(dir, { recursive: true });

  const extractedText = extractTextFromBuffer(input.sourceFilename, input.fileBuffer);
  const digest = input.digestMarkdown?.trim() || null;

  const result = getDb()
    .prepare(
      `INSERT INTO research_documents (title, category, source_filename, mime_type, storage_path, extracted_text, digest_markdown)
       VALUES (?, ?, ?, ?, '', ?, ?)`,
    )
    .run(
      input.title.trim(),
      input.category,
      input.sourceFilename,
      input.mimeType,
      extractedText,
      digest,
    );

  const id = Number(result.lastInsertRowid);
  const safeName = `${id}-${sanitizeFilename(input.sourceFilename)}`;
  const storagePath = path.join(dir, safeName);
  writeFileSync(storagePath, input.fileBuffer);

  getDb()
    .prepare(`UPDATE research_documents SET storage_path = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(storagePath, id);

  return getResearchDocument(id)!;
}

export function updateResearchDocument(
  id: number,
  patch: { title?: string; category?: string; digestMarkdown?: string | null },
): ResearchDocument | null {
  initResearchSchema();
  const existing = getResearchDocument(id);
  if (!existing) return null;
  if (patch.category != null && !isValidResearchCategory(patch.category)) {
    throw new Error(`Invalid category: ${patch.category}`);
  }

  getDb()
    .prepare(
      `UPDATE research_documents SET
        title = ?,
        category = ?,
        digest_markdown = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
    )
    .run(
      patch.title?.trim() ?? existing.title,
      patch.category ?? existing.category,
      patch.digestMarkdown !== undefined ? patch.digestMarkdown : existing.digestMarkdown,
      id,
    );

  return getResearchDocument(id);
}

export function deleteResearchDocument(id: number): boolean {
  initResearchSchema();
  const existing = getResearchDocument(id);
  if (!existing) return false;
  if (existing.storagePath && existsSync(existing.storagePath)) {
    try {
      unlinkSync(existing.storagePath);
    } catch {
      /* file may already be gone */
    }
  }
  const result = getDb().prepare(`DELETE FROM research_documents WHERE id = ?`).run(id);
  return result.changes > 0;
}

/** Text the LLM may cite — prefer human digest, fall back to extracted file text. */
export function documentCorpusText(doc: ResearchDocument): string | null {
  const digest = doc.digestMarkdown?.trim();
  if (digest) return digest;
  const extracted = doc.extractedText?.trim();
  if (extracted) return extracted.slice(0, 12_000);
  return `[Document "${doc.title}" — upload a digest with citable facts; PDF binary stored at id ${doc.id}]`;
}

export type DocumentCorpusStatus = 'digest' | 'extracted' | 'needs_digest';

export function documentCorpusStatus(doc: ResearchDocument): DocumentCorpusStatus {
  if (doc.digestMarkdown?.trim()) return 'digest';
  if (doc.extractedText?.trim()) return 'extracted';
  return 'needs_digest';
}

export function isPdfFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

export function readResearchFile(doc: ResearchDocument): Buffer | null {
  if (!doc.storagePath || !existsSync(doc.storagePath)) return null;
  return readFileSync(doc.storagePath);
}
