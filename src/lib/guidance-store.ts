import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

const GUIDANCE_DIR = path.join(process.cwd(), 'guidance');
const EDITORIAL_PATH = path.join(GUIDANCE_DIR, 'editorial.md');
const VERSIONS_PATH = path.join(GUIDANCE_DIR, 'versions.json');

interface GuidanceVersion {
  savedAt: string;
  markdown: string;
}

export function saveEditorialGuidance(markdown: string): void {
  mkdirSync(GUIDANCE_DIR, { recursive: true });
  const prior = existsSync(EDITORIAL_PATH) ? readFileSync(EDITORIAL_PATH, 'utf8') : '';
  if (prior.trim()) {
    const versions: GuidanceVersion[] = existsSync(VERSIONS_PATH)
      ? (JSON.parse(readFileSync(VERSIONS_PATH, 'utf8')) as GuidanceVersion[])
      : [];
    versions.unshift({ savedAt: new Date().toISOString(), markdown: prior });
    writeFileSync(VERSIONS_PATH, JSON.stringify(versions.slice(0, 20), null, 2));
  }
  writeFileSync(EDITORIAL_PATH, markdown, 'utf8');
}

export function listGuidanceVersions(): GuidanceVersion[] {
  if (!existsSync(VERSIONS_PATH)) return [];
  return JSON.parse(readFileSync(VERSIONS_PATH, 'utf8')) as GuidanceVersion[];
}
