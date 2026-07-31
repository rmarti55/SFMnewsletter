import { NextResponse } from 'next/server';
import { SfmApiError } from './sfm-client';
import { OpenRouterError } from './openrouter';

const CONFIG_ERRORS = new Set([
  'NEWSLETTER_EXPORT_API_KEY is not set',
  'OPENROUTER_API_KEY is not set',
  'DATABASE_URL is required on Vercel — configure Neon Postgres',
  'DATABASE_URL is not set',
]);

function isReadOnlyFsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'EROFS' || code === 'EACCES' || msg.includes('read-only file system');
}

export function getConfigErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof Error) {
    if (CONFIG_ERRORS.has(error.message)) {
      return NextResponse.json(
        { error: 'Server misconfigured', detail: error.message },
        { status: 503 },
      );
    }
    if (isReadOnlyFsError(error)) {
      return NextResponse.json(
        { error: 'Server misconfigured', detail: 'Database path is not writable' },
        { status: 503 },
      );
    }
  }
  return null;
}

export function getUpstreamErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof SfmApiError) {
    return NextResponse.json(
      { error: 'Failed to fetch corpus from Santa Fe Minutes', detail: error.message.slice(0, 200) },
      { status: 502 },
    );
  }
  if (error instanceof OpenRouterError) {
    return NextResponse.json(
      { error: 'LLM request failed', detail: error.message.slice(0, 200) },
      { status: 502 },
    );
  }
  return null;
}

export function getApiErrorResponse(error: unknown, fallback: string): NextResponse {
  return (
    getConfigErrorResponse(error) ??
    getUpstreamErrorResponse(error) ??
    NextResponse.json({ error: fallback }, { status: 500 })
  );
}
