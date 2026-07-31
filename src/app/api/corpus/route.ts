import { NextRequest, NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { fetchNewsletterCorpus } from '@/lib/sfm-client';
import { getTodayInDenver } from '@/lib/datetime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const issueDate = searchParams.get('issueDate')?.trim() || getTodayInDenver();
    const lookbackParam = searchParams.get('lookbackDays');
    const lookaheadParam = searchParams.get('lookaheadDays');
    const lookbackDays = lookbackParam != null ? Number(lookbackParam) : undefined;
    const lookaheadDays = lookaheadParam != null ? Number(lookaheadParam) : undefined;
    const corpus = await fetchNewsletterCorpus({
      issueDate,
      lookbackDays: Number.isFinite(lookbackDays) ? lookbackDays : undefined,
      lookaheadDays: Number.isFinite(lookaheadDays) ? lookaheadDays : undefined,
    });
    return NextResponse.json(corpus);
  } catch (error) {
    console.error('corpus preview error:', error);
    return getApiErrorResponse(error, 'Failed to fetch corpus');
  }
}
