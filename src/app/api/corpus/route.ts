import { NextRequest, NextResponse } from 'next/server';
import { fetchNewsletterCorpus } from '@/lib/sfm-client';
import { getTodayInDenver } from '@/lib/datetime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const issueDate = request.nextUrl.searchParams.get('issueDate')?.trim() || getTodayInDenver();
    const corpus = await fetchNewsletterCorpus({ issueDate });
    return NextResponse.json(corpus);
  } catch (error) {
    console.error('corpus preview error:', error);
    return NextResponse.json({ error: 'Failed to fetch corpus' }, { status: 500 });
  }
}
