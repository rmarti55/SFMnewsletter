import { neon } from '@neondatabase/serverless';
import type { NewsletterEdition } from '../types';
import { deleteResearchFile, readResearchFileContent, saveResearchFile } from '../research-files';
import { isValidResearchCategory } from '../research-categories';

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

export interface GuidanceVersion {
  savedAt: string;
  markdown: string;
}

function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

let schemaReady = false;

export async function ensurePostgresSchema(): Promise<void> {
  if (schemaReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS newsletter_editions (
      id SERIAL PRIMARY KEY,
      issue_date TEXT NOT NULL,
      subject TEXT,
      body_markdown TEXT,
      source_event_ids TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      model TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS research_documents (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      source_filename TEXT NOT NULL,
      mime_type TEXT,
      storage_path TEXT NOT NULL DEFAULT '',
      extracted_text TEXT,
      digest_markdown TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_research_documents_category ON research_documents(category)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS guidance_versions (
      id SERIAL PRIMARY KEY,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      markdown TEXT NOT NULL
    )
  `;
  schemaReady = true;
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
    createdAt: String(row.created_at),
    sentAt: row.sent_at ? String(row.sent_at) : null,
  };
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
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function extractTextFromBuffer(filename: string, buffer: Buffer): string | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.txt') || lower.endsWith('.markdown')) {
    return buffer.toString('utf8').trim() || null;
  }
  return null;
}

export function isPdfFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

export async function insertDraft(input: {
  issueDate: string;
  subject: string;
  bodyMarkdown: string;
  sourceEventIds: number[];
  model: string;
}): Promise<NewsletterEdition> {
  await ensurePostgresSchema();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO newsletter_editions (issue_date, subject, body_markdown, source_event_ids, status, model)
    VALUES (${input.issueDate}, ${input.subject}, ${input.bodyMarkdown}, ${JSON.stringify(input.sourceEventIds)}, 'draft', ${input.model})
    RETURNING *
  `;
  return rowToEdition(rows[0] as Record<string, unknown>);
}

export async function listDrafts(): Promise<NewsletterEdition[]> {
  await ensurePostgresSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM newsletter_editions ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(rowToEdition);
}

export async function getDraftById(id: number): Promise<NewsletterEdition | null> {
  await ensurePostgresSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM newsletter_editions WHERE id = ${id}`;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? rowToEdition(row) : null;
}

export async function updateDraft(
  id: number,
  patch: { subject?: string; bodyMarkdown?: string },
): Promise<NewsletterEdition | null> {
  const existing = await getDraftById(id);
  if (!existing || existing.status !== 'draft') return null;
  await ensurePostgresSchema();
  const sql = getSql();
  const rows = await sql`
    UPDATE newsletter_editions
    SET subject = ${patch.subject ?? existing.subject}, body_markdown = ${patch.bodyMarkdown ?? existing.bodyMarkdown}
    WHERE id = ${id}
    RETURNING *
  `;
  return rowToEdition(rows[0] as Record<string, unknown>);
}

export async function deleteDraft(id: number): Promise<boolean> {
  await ensurePostgresSchema();
  const sql = getSql();
  const rows = await sql`DELETE FROM newsletter_editions WHERE id = ${id} AND status = 'draft' RETURNING id`;
  return rows.length > 0;
}

export async function markSent(id: number): Promise<NewsletterEdition | null> {
  await ensurePostgresSchema();
  const sql = getSql();
  await sql`UPDATE newsletter_editions SET status = 'sent', sent_at = NOW() WHERE id = ${id}`;
  return getDraftById(id);
}

export async function listResearchDocuments(): Promise<ResearchDocument[]> {
  await ensurePostgresSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM research_documents ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(rowToDoc);
}

export async function getResearchDocument(id: number): Promise<ResearchDocument | null> {
  await ensurePostgresSchema();
  const sql = getSql();
  const rows = await sql`SELECT * FROM research_documents WHERE id = ${id}`;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? rowToDoc(row) : null;
}

export async function insertResearchDocument(input: {
  title: string;
  category: string;
  sourceFilename: string;
  mimeType: string | null;
  fileBuffer: Buffer;
  digestMarkdown?: string | null;
}): Promise<ResearchDocument> {
  await ensurePostgresSchema();
  if (!isValidResearchCategory(input.category)) {
    throw new Error(`Invalid category: ${input.category}`);
  }
  if (isPdfFilename(input.sourceFilename) && !input.digestMarkdown?.trim()) {
    throw new Error('PDF uploads require a digest with citable facts');
  }

  const extractedText = extractTextFromBuffer(input.sourceFilename, input.fileBuffer);
  const digest = input.digestMarkdown?.trim() || null;
  const sql = getSql();

  const rows = await sql`
    INSERT INTO research_documents (title, category, source_filename, mime_type, storage_path, extracted_text, digest_markdown)
    VALUES (${input.title.trim()}, ${input.category}, ${input.sourceFilename}, ${input.mimeType}, '', ${extractedText}, ${digest})
    RETURNING *
  `;
  const id = (rows[0] as Record<string, unknown>).id as number;
  const storagePath = await saveResearchFile(id, input.sourceFilename, input.fileBuffer);

  const updated = await sql`
    UPDATE research_documents SET storage_path = ${storagePath}, updated_at = NOW() WHERE id = ${id}
    RETURNING *
  `;
  return rowToDoc(updated[0] as Record<string, unknown>);
}

export async function updateResearchDocument(
  id: number,
  patch: { title?: string; category?: string; digestMarkdown?: string | null },
): Promise<ResearchDocument | null> {
  const existing = await getResearchDocument(id);
  if (!existing) return null;
  if (patch.category != null && !isValidResearchCategory(patch.category)) {
    throw new Error(`Invalid category: ${patch.category}`);
  }
  await ensurePostgresSchema();
  const sql = getSql();
  const rows = await sql`
    UPDATE research_documents SET
      title = ${patch.title?.trim() ?? existing.title},
      category = ${patch.category ?? existing.category},
      digest_markdown = ${patch.digestMarkdown !== undefined ? patch.digestMarkdown : existing.digestMarkdown},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rowToDoc(rows[0] as Record<string, unknown>);
}

export async function deleteResearchDocument(id: number): Promise<boolean> {
  const existing = await getResearchDocument(id);
  if (!existing) return false;
  if (existing.storagePath) await deleteResearchFile(existing.storagePath);
  await ensurePostgresSchema();
  const sql = getSql();
  const rows = await sql`DELETE FROM research_documents WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export function documentCorpusText(doc: ResearchDocument): string | null {
  const digest = doc.digestMarkdown?.trim();
  if (digest) return digest;
  const extracted = doc.extractedText?.trim();
  if (extracted) return extracted.slice(0, 12_000);
  return null;
}

export type DocumentCorpusStatus = 'digest' | 'extracted' | 'needs_digest';

export function documentCorpusStatus(doc: ResearchDocument): DocumentCorpusStatus {
  if (doc.digestMarkdown?.trim()) return 'digest';
  if (doc.extractedText?.trim()) return 'extracted';
  return 'needs_digest';
}

export async function readResearchFile(doc: ResearchDocument): Promise<Buffer | null> {
  return readResearchFileContent(doc.storagePath);
}

export async function saveEditorialGuidance(markdown: string): Promise<void> {
  await ensurePostgresSchema();
  const sql = getSql();
  await sql`INSERT INTO guidance_versions (markdown) VALUES (${markdown})`;
}

export async function loadEditorialGuidanceFromDb(): Promise<string | null> {
  await ensurePostgresSchema();
  const sql = getSql();
  const rows = await sql`SELECT markdown FROM guidance_versions ORDER BY saved_at DESC LIMIT 1`;
  const row = rows[0] as { markdown: string } | undefined;
  return row?.markdown?.trim() || null;
}

export async function listGuidanceVersionsFromDb(): Promise<GuidanceVersion[]> {
  await ensurePostgresSchema();
  const sql = getSql();
  const rows = await sql`SELECT saved_at, markdown FROM guidance_versions ORDER BY saved_at DESC LIMIT 20`;
  return (rows as { saved_at: string; markdown: string }[]).map((r) => ({
    savedAt: String(r.saved_at),
    markdown: r.markdown,
  }));
}

export async function initResearchSchema(): Promise<void> {
  await ensurePostgresSchema();
}
