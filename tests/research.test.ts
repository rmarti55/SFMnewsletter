import { describe, it, expect, beforeEach } from 'vitest';
import { getActiveResearchCategories, isValidResearchCategory } from '../src/lib/research-categories';
import {
  insertResearchDocument,
  listResearchDocuments,
  deleteResearchDocument,
  documentCorpusText,
  initResearchSchema,
} from '../src/lib/research-db';
import { buildResearchCorpus, loadCityResearchForStorylines } from '../src/lib/research-corpus';
import { resetDbForTests } from '../src/lib/db';

describe('research categories', () => {
  it('validates category ids', () => {
    expect(isValidResearchCategory('water')).toBe(true);
    expect(isValidResearchCategory('nope')).toBe(false);
  });

  it('matches water storylines', () => {
    const cats = getActiveResearchCategories([
      { headline: 'LDC phase 2', whatHappened: 'Land development code update.', whyItMatters: 'Permits.' },
    ]);
    expect(cats).toContain('housing-supply');
  });
});

describe('research db + corpus', () => {
  beforeEach(() => {
    resetDbForTests();
    initResearchSchema();
  });

  it('stores upload and builds corpus by category', () => {
    insertResearchDocument({
      title: 'Water Study 2024',
      category: 'water',
      sourceFilename: 'water.md',
      mimeType: 'text/markdown',
      fileBuffer: Buffer.from('# Facts\nOutdoor irrigation dominates demand.'),
      digestMarkdown: '- Outdoor irrigation is the main water lever.',
    });
    insertResearchDocument({
      title: 'Plaza vibes',
      category: 'general',
      sourceFilename: 'plaza.txt',
      mimeType: 'text/plain',
      fileBuffer: Buffer.from('ignore'),
      digestMarkdown: 'Not relevant',
    });

    const waterOnly = buildResearchCorpus(['water']);
    expect(waterOnly).toContain('Outdoor irrigation is the main water lever');
    expect(waterOnly).not.toContain('Plaza vibes');

    const forLdc = loadCityResearchForStorylines([
      {
        headline: 'Code overhaul',
        whatHappened: 'LDC phase 2 presented.',
        whyItMatters: 'Housing supply.',
      },
    ]);
    expect(forLdc).toBeTruthy();
  });

  it('prefers digest over extracted text', () => {
    const doc = insertResearchDocument({
      title: 'Test',
      category: 'water',
      sourceFilename: 'a.md',
      mimeType: 'text/markdown',
      fileBuffer: Buffer.from('raw extracted'),
      digestMarkdown: 'curated digest',
    });
    expect(documentCorpusText(doc).).toBe('curated digest');
    deleteResearchDocument(doc.id);
    expect(listResearchDocuments()).toHaveLength(0);
  });
});
