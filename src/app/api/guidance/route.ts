import { NextRequest, NextResponse } from 'next/server';
import { loadEditorialGuidance, saveEditorialGuidance } from '@/lib/guidance';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ guidance: loadEditorialGuidance() ?? '' });
}

export async function PUT(request: NextRequest) {
  const body = (await request.json()) as { guidance?: string };
  if (typeof body.guidance !== 'string') {
    return NextResponse.json({ error: 'guidance string required' }, { status: 400 });
  }
  saveEditorialGuidance(body.guidance);
  return NextResponse.json({ ok: true });
}
