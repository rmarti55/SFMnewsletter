import { NextRequest, NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { generateNewsletterDraft } from '@/lib/generate-draft';
import { isGenerateSkipReason } from '@/lib/generate-messages';
import { getTodayInDenver } from '@/lib/datetime';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function buildGenerateResponse(result: Awaited<ReturnType<typeof generateNewsletterDraft>>) {
  const payload = {
    ok: true as const,
    issueDate: result.meta.issueDate,
    lookbackDays: result.meta.lookbackDays,
    lookaheadDays: result.meta.lookaheadDays,
    recentCount: result.meta.recentCount,
    upcomingCount: result.meta.upcomingCount,
    storylineCount: result.meta.storylineCount,
    readiness: result.readiness,
    recent: result.recent,
    upcoming: result.upcoming,
  };

  if (isGenerateSkipReason(result.reason)) {
    return NextResponse.json({ ...payload, skipped: result.reason });
  }

  return NextResponse.json({ ...payload, edition: result.edition });
}

export async function POST(request: NextRequest) {
  try {
    let body: { issueDate?: string; lookbackDays?: number; lookaheadDays?: number } = {};
    try {
      body = await request.json();
    } catch {
      // empty ok
    }
    const issueDate = body.issueDate?.trim() || getTodayInDenver();
    const result = await generateNewsletterDraft({
      issueDate,
      lookbackDays: body.lookbackDays,
      lookaheadDays: body.lookaheadDays,
    });
    return buildGenerateResponse(result);
  } catch (error) {
    console.error('generate error:', error);
    return getApiErrorResponse(error, 'Failed to generate');
  }
}
