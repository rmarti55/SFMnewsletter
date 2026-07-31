import { NextRequest, NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { isGuidanceReadOnly } from '@/lib/storage/config';
import { loadEditorialGuidance, saveEditorialGuidance } from '@/lib/guidance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const guidance = await loadEditorialGuidance();
    return NextResponse.json({
      guidance: guidance ?? '',
      readOnly: isGuidanceReadOnly(),
    });
  } catch (error) {
    console.error('guidance read error:', error);
    return getApiErrorResponse(error, 'Failed to load guidance');
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (isGuidanceReadOnly()) {
      return NextResponse.json(
        {
          error: 'Guidance is read-only in production without Postgres — edit guidance/editorial.md in git and redeploy',
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { guidance?: string };
    if (typeof body.guidance !== 'string') {
      return NextResponse.json({ error: 'guidance string required' }, { status: 400 });
    }
    await saveEditorialGuidance(body.guidance);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('guidance save error:', error);
    return getApiErrorResponse(error, 'Failed to save guidance');
  }
}
