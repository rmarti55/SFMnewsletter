import { NextResponse } from 'next/server';
import { getResearchDocument, readResearchFile } from '@/lib/research-db';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const id = Number((await context.params).id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const doc = getResearchDocument(id);
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const buffer = readResearchFile(doc);
  if (!buffer) return NextResponse.json({ error: 'file not found on disk' }, { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': doc.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${doc.sourceFilename.replace(/"/g, '')}"`,
    },
  });
}
