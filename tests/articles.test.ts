import { describe, expect, it, beforeEach } from 'vitest';
import { slugifyHeadline, resolveUniqueSlug, resolveUniqueSlugAsync } from '@/lib/article-slug';
import { buildArticleEmail } from '@/lib/article-email';
import type { Article } from '@/lib/types';
import {
  deleteArticle,
  getArticleBySlug,
  insertArticle,
  listArticles,
  markArticleEmailed,
  updateArticle,
} from '@/lib/storage';
import { resetDbForTests } from '@/lib/db';

describe('article-slug', () => {
  it('slugifies headlines', () => {
    expect(slugifyHeadline('City Council Blocks Housing')).toBe('city-council-blocks-housing');
    expect(slugifyHeadline('  Water & Permits  ')).toBe('water-permits');
  });

  it('resolves unique slugs', () => {
    const taken = new Set(['city-council-blocks-housing']);
    const slug = resolveUniqueSlug('city-council-blocks-housing', (s) => taken.has(s));
    expect(slug).toBe('city-council-blocks-housing-2');
  });

  it('resolves unique slugs asynchronously', async () => {
    const taken = new Set(['city-council-blocks-housing']);
    const slug = await resolveUniqueSlugAsync('city-council-blocks-housing', async (s) =>
      taken.has(s),
    );
    expect(slug).toBe('city-council-blocks-housing-2');
  });
});

describe('buildArticleEmail', () => {
  const article: Article = {
    id: 1,
    slug: 'test-headline',
    headline: 'Test Headline',
    dek: 'A supporting line.',
    bodyMarkdown: '**Bold lead.** This is the article body with enough text to preview.',
    imagePath: null,
    status: 'listed',
    emailedAt: null,
    createdAt: '2026-07-31T00:00:00.000Z',
    updatedAt: '2026-07-31T00:00:00.000Z',
  };

  it('builds html and text email payloads', () => {
    const email = buildArticleEmail(article);
    expect(email.subject).toBe('Test Headline');
    expect(email.html).toContain('Santa Fe Minutes');
    expect(email.html).toContain('Test Headline');
    expect(email.html).toContain('/minutes/test-headline');
    expect(email.text).toContain('Test Headline');
    expect(email.text).toContain('/minutes/test-headline');
  });
});

describe('articles storage', () => {
  beforeEach(() => {
    resetDbForTests();
  });

  it('creates, lists, updates, and deletes articles', async () => {
    const created = await insertArticle({
      headline: 'Council delays housing',
      dek: 'Another week of process theater.',
      bodyMarkdown: 'The council voted to delay again.',
      status: 'listed',
    });

    expect(created.slug).toBe('council-delays-housing');

    const listed = await listArticles({ listedOnly: true });
    expect(listed).toHaveLength(1);

    await updateArticle(created.id, { status: 'draft' });
    expect(await listArticles({ listedOnly: true })).toHaveLength(0);

    const bySlug = await getArticleBySlug('council-delays-housing');
    expect(bySlug?.headline).toBe('Council delays housing');

    const emailed = await markArticleEmailed(created.id);
    expect(emailed?.emailedAt).toBeTruthy();

    expect(await deleteArticle(created.id)).toBe(true);
    expect(await getArticleBySlug('council-delays-housing')).toBeNull();
  });
});
