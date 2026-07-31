import { describe, it, expect, beforeEach } from 'vitest';
import { getActiveResearchCategories, isValidResearchCategory } from '../src/lib/research-categories';
import {
  insertResearchDocument,
  listResearchDocuments,
  deleteResearchDocument,
  documentCorpusText,
  initResearchSchema,
} from '../src/lib/storage';
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
  beforeEach(async () => {
    resetDbForTests();
    await initResearchSchema();
  });

  it('stores upload and builds corpus by category', async () => {
    await insertResearchDocument({
      title: 'Water Study 2024',
      category: 'water',
      sourceFilename: 'water.md',
      mimeType: 'text/markdown',
      fileBuffer: Buffer.from('# Facts\nOutdoor irrigation dominates demand.'),
      digestMarkdown: '- Outdoor irrigation is the main water lever.',
    });
    await insertResearchDocument({
      title: 'Plaza vibes',
      category: 'general',
      sourceFilename: 'plaza.txt',
      mimeType: 'text/plain',
      fileBuffer: Buffer.from('ignore'),
      digestMarkdown: 'Not relevant',
    });

    const waterOnly = await buildResearchCorpus(['water']);
    expect(waterOnly).toContain('Outdoor irrigation is the main water lever');
    expect(waterOnly).not.toContain('Plaza vibes');

    await insertResearchDocument({
      title: 'Housing code notes',
      category: 'housing-supply',
      sourceFilename: 'ldc.md',
      mimeType: 'text/markdown',
      fileBuffer: Buffer.from('# LDC'),
      digestMarkdown: '- Phase 2 LDC targets housing supply.',
    });

    const forLdc = await loadCityResearchForStorylines([
      {
        headline: 'Code overhaul',
        whatHappened: 'LDC phase 2 presented.',
        whyItMatters: 'Housing supply.',
      },
    ]);
    expect(forLdc).toContain('Phase 2 LDC targets housing supply');
  });

  it('prefers digest over extracted text', async () => {
    const doc = await insertResearchDocument({
      title: 'Test',
      category: 'water',
      sourceFilename: 'a.md',
      mimeType: 'text/markdown',
      fileBuffer: Buffer.from('raw extracted'),
      digestMarkdown: 'curated digest',
    });
    expect(documentCorpusText(doc)).toBe('curated digest');
    await deleteResearchDocument(doc.id);
    expect(await listResearchDocuments()).toHaveLength(0);
  });

  it('returns null corpus text when pdf has no digest', async () => {
    await expect(
      insertResearchDocument({
        title: 'Raw PDF',
        category: 'water',
        sourceFilename: 'study.pdf',
        mimeType: 'application/pdf',
        fileBuffer: Buffer.from('%PDF'),
        digestMarkdown: null,
      }),
    ).rejects.toThrow(/digest/i);
  });

  it('pipeline includes category-matched docs only', async () => {
    await insertResearchDocument({
      title: 'Water only',
      category: 'water',
      sourceFilename: 'w.md',
      mimeType: 'text/markdown',
      fileBuffer: Buffer.from('x'),
      digestMarkdown: 'UNIQUE_WATER_FACT_12345',
    });
    await insertResearchDocument({
      title: 'Housing LDC',
      category: 'housing-supply',
      sourceFilename: 'h.md',
      mimeType: 'text/markdown',
      fileBuffer: Buffer.from('x'),
      digestMarkdown: 'UNIQUE_HOUSING_FACT_abcde',
    });
    await insertResearchDocument({
      title: 'Fee study',
      category: 'fee-in-lieu',
      sourceFilename: 'f.md',
      mimeType: 'text/markdown',
      fileBuffer: Buffer.from('x'),
      digestMarkdown: 'UNIQUE_FEE_FACT_67890',
    });

    const ldcCorpus = await loadCityResearchForStorylines([
      {
        headline: 'LDC phase 2',
        whatHappened: 'Land development code update presented.',
        whyItMatters: 'Housing supply and zoning.',
      },
    ]);
    expect(ldcCorpus).toContain('UNIQUE_HOUSING_FACT_abcde');
    expect(ldcCorpus).not.toContain('UNIQUE_FEE_FACT_67890');
    expect(ldcCorpus).not.toContain('UNIQUE_WATER_FACT_12345');

    const waterCorpus = await loadCityResearchForStorylines([
      {
        headline: 'Permit moratorium debate',
        whatHappened: 'Council discussed water supply before permitting.',
        whyItMatters: 'Water study cited on moratorium.',
      },
    ]);
    expect(waterCorpus).toContain('UNIQUE_WATER_FACT_12345');

    const feeCorpus = await loadCityResearchForStorylines([
      {
        headline: 'Fee-in-lieu hike',
        whatHappened: 'Finance committee advanced SFHP bill.',
        whyItMatters: 'Santa Fe Homes Program fee-in-lieu.',
      },
    ]);
    expect(feeCorpus).toContain('UNIQUE_FEE_FACT_67890');
    expect(feeCorpus).not.toContain('UNIQUE_WATER_FACT_12345');
  });

  it('returns null when no storylines (no research leak on empty weeks)', async () => {
    await insertResearchDocument({
      title: 'Water only',
      category: 'water',
      sourceFilename: 'w.md',
      mimeType: 'text/markdown',
      fileBuffer: Buffer.from('x'),
      digestMarkdown: 'SHOULD_NOT_APPEAR_EMPTY_WEEK',
    });
    expect(await loadCityResearchForStorylines([])).toBeNull();
  });
});
