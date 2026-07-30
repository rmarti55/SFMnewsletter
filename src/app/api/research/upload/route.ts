import { NextResponse } from 'next/server';
import { isValidResearchCategory } from '@/lib/research-categories';
import { insertResearchDocument } from '@/lib/research-db';

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
    if (!isValidResearchCategory(category)) {
      return NextResponse.json({ error: 'invalid category' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = insertResearchDocument({
      title,
      category,
      sourceFilename: file.name,
      mimeType: file.type || null,
      fileBuffer: buffer,
      digestMarkdown,
    });

    return NextResponse.json({ document: doc });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed' }, { status: 500 });
  }
}
