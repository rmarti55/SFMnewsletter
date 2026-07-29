import { NextRequest, NextResponse } from 'next/server';
import { generateNewsletterDraft } from '@/lib/generate-draft';
import { getTodayInDenver } from '@/lib/datetime';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
    if (result.reason === 'empty') {
      return NextResponse.json({ ok: true, skipped: 'empty', readiness: result.readiness });
    }
    return NextResponse.json({ ok: true, edition: result.edition, readiness: result.readiness });
  } catch (error) {
    console.error('generate error:', error);
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 });
  }
}
