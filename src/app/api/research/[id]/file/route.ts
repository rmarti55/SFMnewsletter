import { NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { getResearchDocument, readResearchFile } from '@/lib/storage';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

    const doc = await getResearchDocument(id);
    if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const buffer = await readResearchFile(doc);
    if (!buffer) return NextResponse.json({ error: 'file not found' }, { status: 404 });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${doc.sourceFilename.replace(/"/g, '')}"`,
      },
    });
  } catch (error) {
    console.error('research file error:', error);
    return getApiErrorResponse(error, 'Failed to load research file');
  }
}
