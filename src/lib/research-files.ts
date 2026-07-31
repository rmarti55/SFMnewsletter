import { del, put } from '@vercel/blob';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function assertUploadSize(buffer: Buffer): void {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error(`File too large (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB)`);
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'upload';
}

function getLocalResearchDir(): string {
  if (process.env.RESEARCH_STORAGE_PATH) return process.env.RESEARCH_STORAGE_PATH;
  return path.join(process.cwd(), 'data', 'research');
}

export async function saveResearchFile(id: number, filename: string, buffer: Buffer): Promise<string> {
  assertUploadSize(buffer);
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const blob = await put(`research/${id}-${sanitizeFilename(filename)}`, buffer, {
      access: 'public',
      token,
    });
    return blob.url;
  }

  const dir = getLocalResearchDir();
  mkdirSync(dir, { recursive: true });
  const storagePath = path.join(dir, `${id}-${sanitizeFilename(filename)}`);
  writeFileSync(storagePath, buffer);
  return storagePath;
}

export async function readResearchFileContent(storagePath: string): Promise<Buffer | null> {
  if (!storagePath) return null;
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    const res = await fetch(storagePath);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  if (!existsSync(storagePath)) return null;
  return readFileSync(storagePath);
}

export async function deleteResearchFile(storagePath: string): Promise<void> {
  if (!storagePath) return;
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (token) await del(storagePath, { token });
    return;
  }
  if (existsSync(storagePath)) {
    try {
      unlinkSync(storagePath);
    } catch {
      /* file may already be gone */
    }
  }
}
