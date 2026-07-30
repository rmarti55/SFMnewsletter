import path from 'path';
import os from 'os';
import { mkdirSync } from 'fs';

const poolId = process.env.VITEST_POOL_ID ?? '0';
const base = path.join(os.tmpdir(), `santa-fe-newsletter-test-${poolId}`);
mkdirSync(base, { recursive: true });
process.env.DATABASE_PATH = path.join(base, 'newsletter.db');
process.env.RESEARCH_STORAGE_PATH = path.join(base, 'research');
