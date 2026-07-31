import path from 'path';
import os from 'os';
import { describe, it, expect, afterEach } from 'vitest';
import { assertTestOnlyStorage, resetDbForTests } from '../src/lib/db';

describe('db safety guards', () => {
  const saved = {
    testMode: process.env.NEWSLETTER_TEST_MODE,
    dbPath: process.env.DATABASE_PATH,
    researchPath: process.env.RESEARCH_STORAGE_PATH,
  };

  afterEach(() => {
    process.env.NEWSLETTER_TEST_MODE = saved.testMode;
    process.env.DATABASE_PATH = saved.dbPath;
    process.env.RESEARCH_STORAGE_PATH = saved.researchPath;
  });

  it('refuses resetDbForTests when DATABASE_PATH points at production data/', () => {
    delete process.env.NEWSLETTER_TEST_MODE;
    process.env.DATABASE_PATH = path.join(process.cwd(), 'data', 'newsletter.db');
    process.env.RESEARCH_STORAGE_PATH = path.join(process.cwd(), 'data', 'research');

    expect(() => resetDbForTests()).toThrow(/refused/);
  });

  it('refuses resetDbForTests when NEWSLETTER_TEST_MODE is unset even under tmp', () => {
    delete process.env.NEWSLETTER_TEST_MODE;
    const base = path.join(os.tmpdir(), 'santa-fe-newsletter-test-evil');
    process.env.DATABASE_PATH = path.join(base, 'newsletter.db');
    process.env.RESEARCH_STORAGE_PATH = path.join(base, 'research');

    expect(() => resetDbForTests()).toThrow(/NEWSLETTER_TEST_MODE/);
  });

  it('refuses resetDbForTests when path is under tmp but missing the test dir marker', () => {
    process.env.NEWSLETTER_TEST_MODE = '1';
    process.env.DATABASE_PATH = path.join(os.tmpdir(), 'newsletter.db');
    process.env.RESEARCH_STORAGE_PATH = path.join(os.tmpdir(), 'research');

    expect(() => assertTestOnlyStorage()).toThrow(/santa-fe-newsletter-test/);
  });

  it('allows resetDbForTests under isolated vitest temp paths', () => {
    expect(() => resetDbForTests()).not.toThrow();
  });
});
