import { del, put } from '@vercel/blob';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import { assertUploadSize } from './research-files';
import { getArticleImageUrl, guessImageMimeType } from './article-image-url';

export { getArticleImageUrl, guessImageMimeType };

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function assertArticleImageType(mimeType: string | null, filename: string): void {
  const lower = filename.toLowerCase();
  const byExt =
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp');
  const byMime = mimeType ? ALLOWED_IMAGE_TYPES.has(mimeType) : false;
  if (!byExt && !byMime) {
    throw new Error('Image must be JPEG, PNG, or WebP');
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'image';
}

function getLocalArticlesDir(): string {
  if (process.env.ARTICLES_STORAGE_PATH) return process.env.ARTICLES_STORAGE_PATH;
  return path.join(process.cwd(), 'data', 'articles');
}

export async function saveArticleImage(
  articleId: number,
  filename: string,
  buffer: Buffer,
): Promise<string> {
  assertUploadSize(buffer);
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const blob = await put(`articles/${articleId}-${sanitizeFilename(filename)}`, buffer, {
      access: 'public',
      token,
    });
    return blob.url;
  }

  const dir = getLocalArticlesDir();
  mkdirSync(dir, { recursive: true });
  const storagePath = path.join(dir, `${articleId}-${sanitizeFilename(filename)}`);
  writeFileSync(storagePath, buffer);
  return storagePath;
}

export async function readArticleImageContent(imagePath: string): Promise<Buffer | null> {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    const res = await fetch(imagePath);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  if (!existsSync(imagePath)) return null;
  return readFileSync(imagePath);
}

export async function deleteArticleImage(imagePath: string): Promise<void> {
  if (!imagePath) return;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (token) await del(imagePath, { token });
    return;
  }
  if (existsSync(imagePath)) {
    try {
      unlinkSync(imagePath);
    } catch {
      /* file may already be gone */
    }
  }
}
