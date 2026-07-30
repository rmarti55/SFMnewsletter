import { readFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';
import { getActiveResearchCategories } from './research-categories';
import { documentCorpusText, listResearchDocuments, type ResearchDocument } from './research-db';

const LEGACY_RESEARCH_DIR = path.join(process.cwd(), 'guidance', 'research');

function collectLegacyMarkdown(dir: string, categoryIds: string[] | null, folderCategory?: string): string[] {
  if (!existsSync(dir)) return [];
  const parts: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      parts.push(...collectLegacyMarkdown(full, categoryIds, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name.toLowerCase() !== 'readme.md') {
      if (categoryIds != null && folderCategory && !categoryIds.includes(folderCategory)) continue;
      const body = readFileSync(full, 'utf8').trim();
      if (body) parts.push(body);
    }
  }
  return parts;
}

function formatDocumentBlock(doc: ResearchDocument): string {
  const body = documentCorpusText(doc);
  if (!body) return '';
  return `## ${doc.title} (${doc.category})\nSource file: ${doc.sourceFilename}\n\n${body}`;
}

export function buildResearchCorpus(categoryIds: string[] | null): string | null {
  const docs = listResearchDocuments();
  const legacy = collectLegacyMarkdown(LEGACY_RESEARCH_DIR, categoryIds);
  const blocks: string[] = [];

  const filtered =
    categoryIds == null
      ? docs
      : docs.filter((d) => categoryIds.includes(d.category) || (categoryIds.includes('general') && d.category === 'general'));

  for (const doc of filtered) {
    const block = formatDocumentBlock(doc);
    if (block) blocks.push(block);
  }
  blocks.push(...legacy);

  if (blocks.length === 0) return null;
  return blocks.join('\n\n---\n\n').trim();
}

export function loadCityResearch(): string | null {
  return buildResearchCorpus(null);
}

export function loadCityResearchForStorylines(
  storylines: Array<{ headline: string; whatHappened: string; whyItMatters: string }>,
): string | null {
  const categories = getActiveResearchCategories(storylines);
  return buildResearchCorpus(categories);
}

export function loadFullGuidance(opts?: { research?: string | null }): string | null {
  const editorialPath = path.join(process.cwd(), 'guidance', 'editorial.md');
  const editorial = existsSync(editorialPath) ? readFileSync(editorialPath, 'utf8').trim() : '';
  const research = opts?.research !== undefined ? opts.research : loadCityResearch();

  if (!editorial && !research) return null;
  const blocks: string[] = [];
  if (editorial) blocks.push(editorial);
  if (research?.trim()) {
    blocks.push(
      `# CITY RESEARCH CORPUS\n\nVerified city facts for our-take rebuttals when this week's OFFICIAL storylines match the document category. Quotes still come only from transcripts.\n\n${research.trim()}`,
    );
  }
  return blocks.join('\n\n---\n\n').trim() || null;
}

export function loadEditorialGuidance(): string | null {
  const editorialPath = path.join(process.cwd(), 'guidance', 'editorial.md');
  if (!existsSync(editorialPath)) return null;
  const g = readFileSync(editorialPath, 'utf8').trim();
  return g || null;
}

// Re-export save/list from guidance file for API compatibility
export { saveEditorialGuidance, listGuidanceVersions } from './guidance-store';
