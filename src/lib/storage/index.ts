import { assertStorageConfigured, usePostgres } from './config';
import * as postgres from './postgres';
import {
  deleteDraft as sqliteDeleteDraft,
  getDraftById as sqliteGetDraftById,
  insertDraft as sqliteInsertDraft,
  listDrafts as sqliteListDrafts,
  markSent as sqliteMarkSent,
  updateDraft as sqliteUpdateDraft,
} from '../db';
import {
  deleteResearchDocument as sqliteDeleteResearchDocument,
  documentCorpusStatus,
  documentCorpusText,
  getResearchDocument as sqliteGetResearchDocument,
  initResearchSchema as sqliteInitResearchSchema,
  insertResearchDocument as sqliteInsertResearchDocument,
  isPdfFilename,
  listResearchDocuments as sqliteListResearchDocuments,
  readResearchFile as sqliteReadResearchFile,
  updateResearchDocument as sqliteUpdateResearchDocument,
  type DocumentCorpusStatus,
  type ResearchDocument,
} from '../research-db';
import {
  deleteArticle as sqliteDeleteArticle,
  getArticleById as sqliteGetArticleById,
  getArticleBySlug as sqliteGetArticleBySlug,
  insertArticle as sqliteInsertArticle,
  listArticles as sqliteListArticles,
  markArticleEmailed as sqliteMarkArticleEmailed,
  updateArticle as sqliteUpdateArticle,
} from '../articles-db';
import {
  listGuidanceVersionsFromDb,
  loadEditorialGuidanceFromDb,
  readArticleImage as postgresReadArticleImage,
  saveArticleImageForId as postgresSaveArticleImageForId,
  saveEditorialGuidance as postgresSaveGuidance,
} from './postgres';
import { listGuidanceVersions, saveEditorialGuidance as sqliteSaveGuidance } from '../guidance-store';
import {
  assertArticleImageType,
  readArticleImageContent,
  saveArticleImage,
} from '../article-files';
import { getArticleImageUrl, guessImageMimeType } from '../article-image-url';
import type { Article } from '../types';

export type { ResearchDocument, DocumentCorpusStatus };

function ensureConfigured(): void {
  assertStorageConfigured();
}

export async function insertDraft(input: {
  issueDate: string;
  subject: string;
  bodyMarkdown: string;
  sourceEventIds: number[];
  model: string;
}) {
  ensureConfigured();
  if (usePostgres()) return postgres.insertDraft(input);
  return sqliteInsertDraft(input);
}

export async function listDrafts() {
  ensureConfigured();
  if (usePostgres()) return postgres.listDrafts();
  return sqliteListDrafts();
}

export async function getDraftById(id: number) {
  ensureConfigured();
  if (usePostgres()) return postgres.getDraftById(id);
  return sqliteGetDraftById(id);
}

export async function updateDraft(id: number, patch: { subject?: string; bodyMarkdown?: string }) {
  ensureConfigured();
  if (usePostgres()) return postgres.updateDraft(id, patch);
  return sqliteUpdateDraft(id, patch);
}

export async function deleteDraft(id: number) {
  ensureConfigured();
  if (usePostgres()) return postgres.deleteDraft(id);
  return sqliteDeleteDraft(id);
}

export async function markSent(id: number) {
  ensureConfigured();
  if (usePostgres()) return postgres.markSent(id);
  return sqliteMarkSent(id);
}

export async function initResearchSchema() {
  ensureConfigured();
  if (usePostgres()) return postgres.initResearchSchema();
  sqliteInitResearchSchema();
}

export async function listResearchDocuments() {
  ensureConfigured();
  if (usePostgres()) return postgres.listResearchDocuments();
  return sqliteListResearchDocuments();
}

export async function getResearchDocument(id: number) {
  ensureConfigured();
  if (usePostgres()) return postgres.getResearchDocument(id);
  return sqliteGetResearchDocument(id);
}

export async function insertResearchDocument(input: {
  title: string;
  category: string;
  sourceFilename: string;
  mimeType: string | null;
  fileBuffer: Buffer;
  digestMarkdown?: string | null;
}) {
  ensureConfigured();
  if (usePostgres()) return postgres.insertResearchDocument(input);
  return sqliteInsertResearchDocument(input);
}

export async function updateResearchDocument(
  id: number,
  patch: { title?: string; category?: string; digestMarkdown?: string | null },
) {
  ensureConfigured();
  if (usePostgres()) return postgres.updateResearchDocument(id, patch);
  return sqliteUpdateResearchDocument(id, patch);
}

export async function deleteResearchDocument(id: number) {
  ensureConfigured();
  if (usePostgres()) return postgres.deleteResearchDocument(id);
  return sqliteDeleteResearchDocument(id);
}

export async function readResearchFile(doc: ResearchDocument) {
  ensureConfigured();
  if (usePostgres()) return postgres.readResearchFile(doc);
  return sqliteReadResearchFile(doc);
}

export async function saveEditorialGuidance(markdown: string) {
  ensureConfigured();
  if (usePostgres()) return postgresSaveGuidance(markdown);
  sqliteSaveGuidance(markdown);
}

export async function loadEditorialGuidanceFromStorage(): Promise<string | null> {
  if (usePostgres()) return loadEditorialGuidanceFromDb();
  return null;
}

export async function listGuidanceVersionsFromStorage() {
  if (usePostgres()) return listGuidanceVersionsFromDb();
  return listGuidanceVersions();
}

export { documentCorpusText, documentCorpusStatus, isPdfFilename };
export { getArticleImageUrl, guessImageMimeType } from '../article-image-url';

export async function listArticles(options?: { listedOnly?: boolean }) {
  ensureConfigured();
  if (usePostgres()) return postgres.listArticles(options);
  return sqliteListArticles(options);
}

export async function getArticleById(id: number) {
  ensureConfigured();
  if (usePostgres()) return postgres.getArticleById(id);
  return sqliteGetArticleById(id);
}

export async function getArticleBySlug(slug: string) {
  ensureConfigured();
  if (usePostgres()) return postgres.getArticleBySlug(slug);
  return sqliteGetArticleBySlug(slug);
}

export async function insertArticle(input: {
  headline: string;
  dek?: string | null;
  bodyMarkdown: string;
  status?: 'draft' | 'listed';
}) {
  ensureConfigured();
  if (usePostgres()) return postgres.insertArticle(input);
  return sqliteInsertArticle(input);
}

export async function updateArticle(
  id: number,
  patch: {
    headline?: string;
    dek?: string | null;
    bodyMarkdown?: string;
    imagePath?: string | null;
    status?: 'draft' | 'listed';
  },
) {
  ensureConfigured();
  if (usePostgres()) return postgres.updateArticle(id, patch);
  return sqliteUpdateArticle(id, patch);
}

export async function deleteArticle(id: number) {
  ensureConfigured();
  if (usePostgres()) return postgres.deleteArticle(id);
  return sqliteDeleteArticle(id);
}

export async function markArticleEmailed(id: number) {
  ensureConfigured();
  if (usePostgres()) return postgres.markArticleEmailed(id);
  return sqliteMarkArticleEmailed(id);
}

export async function saveArticleImageForId(articleId: number, filename: string, buffer: Buffer) {
  ensureConfigured();
  assertArticleImageType(null, filename);
  if (usePostgres()) return postgresSaveArticleImageForId(articleId, filename, buffer);
  const existing = sqliteGetArticleById(articleId);
  if (!existing) return null;
  const { deleteArticleImage } = await import('../article-files');
  if (existing.imagePath) await deleteArticleImage(existing.imagePath);
  const imagePath = await saveArticleImage(articleId, filename, buffer);
  return sqliteUpdateArticle(articleId, { imagePath });
}

export async function readArticleImage(article: Article) {
  ensureConfigured();
  if (usePostgres()) return postgresReadArticleImage(article);
  if (!article.imagePath) return null;
  return readArticleImageContent(article.imagePath);
}
