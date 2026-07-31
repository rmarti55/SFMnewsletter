import { NextRequest, NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { insertArticle, listArticles } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const articles = await listArticles();
    return NextResponse.json({ articles });
  } catch (error) {
    console.error('articles list error:', error);
    return getApiErrorResponse(error, 'Failed to list articles');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      headline?: string;
      dek?: string | null;
      bodyMarkdown?: string;
      status?: 'draft' | 'listed';
    };

    const headline = body.headline?.trim() ?? '';
    const bodyMarkdown = body.bodyMarkdown?.trim() ?? '';
    if (!headline) {
      return NextResponse.json({ error: 'headline is required' }, { status: 400 });
    }
    if (!bodyMarkdown) {
      return NextResponse.json({ error: 'bodyMarkdown is required' }, { status: 400 });
    }

    const article = await insertArticle({
      headline,
      dek: body.dek,
      bodyMarkdown,
      status: body.status,
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    console.error('article create error:', error);
    return getApiErrorResponse(error, 'Failed to create article');
  }
}
