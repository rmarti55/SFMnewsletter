import { NextRequest, NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { deleteArticle, getArticleById, updateArticle } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const article = await getArticleById(Number(id));
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ article });
  } catch (error) {
    console.error('article get error:', error);
    return getApiErrorResponse(error, 'Failed to load article');
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as {
      headline?: string;
      dek?: string | null;
      bodyMarkdown?: string;
      status?: 'draft' | 'listed';
    };

    if (body.headline !== undefined && !body.headline.trim()) {
      return NextResponse.json({ error: 'headline cannot be empty' }, { status: 400 });
    }
    if (body.bodyMarkdown !== undefined && !body.bodyMarkdown.trim()) {
      return NextResponse.json({ error: 'bodyMarkdown cannot be empty' }, { status: 400 });
    }

    const article = await updateArticle(Number(id), body);
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ article });
  } catch (error) {
    console.error('article update error:', error);
    return getApiErrorResponse(error, 'Failed to update article');
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const ok = await deleteArticle(Number(id));
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('article delete error:', error);
    return getApiErrorResponse(error, 'Failed to delete article');
  }
}
