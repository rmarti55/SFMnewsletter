import { NextResponse } from 'next/server';
import { assertArticleImageType } from '@/lib/article-files';
import { guessImageMimeType } from '@/lib/article-image-url';
import { getApiErrorResponse } from '@/lib/config-errors';
import { getArticleById, readArticleImage, saveArticleImageForId } from '@/lib/storage';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

    const article = await getArticleById(id);
    if (!article?.imagePath) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const buffer = await readArticleImage(article);
    if (!buffer) return NextResponse.json({ error: 'file not found' }, { status: 404 });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': guessImageMimeType(article.imagePath),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('article image get error:', error);
    return getApiErrorResponse(error, 'Failed to load article image');
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

    const article = await getArticleById(id);
    if (!article) return NextResponse.json({ error: 'not found' }, { status: 404 });

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 4MB)' }, { status: 413 });
    }

    try {
      assertArticleImageType(file.type || null, file.name);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Invalid image type' },
        { status: 400 },
      );
    }

    const updated = await saveArticleImageForId(id, file.name, buffer);
    if (!updated) return NextResponse.json({ error: 'not found' }, { status: 404 });

    return NextResponse.json({ article: updated });
  } catch (error) {
    console.error('article image upload error:', error);
    if (error instanceof Error && error.message.includes('File too large')) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    return getApiErrorResponse(error, 'Failed to upload article image');
  }
}
