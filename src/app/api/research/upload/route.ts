import { NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { insertResearchDocument, isPdfFilename } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const title = String(form.get('title') ?? '').trim();
    const category = String(form.get('category') ?? '').trim();
    const digestMarkdown = String(form.get('digestMarkdown') ?? '').trim() || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 4MB)' }, { status: 413 });
    }
    if (isPdfFilename(file.name) && !digestMarkdown) {
      return NextResponse.json({ error: 'PDF uploads require a digest with citable facts' }, { status: 400 });
    }

    const doc = await insertResearchDocument({
      title,
      category,
      sourceFilename: file.name,
      mimeType: file.type || null,
      fileBuffer: buffer,
      digestMarkdown,
    });

    return NextResponse.json({ document: doc });
  } catch (e) {
    console.error('research upload error:', e);
    if (e instanceof Error && e.message.includes('File too large')) {
      return NextResponse.json({ error: e.message }, { status: 413 });
    }
    if (e instanceof Error && e.message.includes('Invalid category')) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes('digest')) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return getApiErrorResponse(e, 'Upload failed');
  }
}
