import { NextRequest, NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { deleteDraft, getDraftById, updateDraft } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const edition = await getDraftById(Number(id));
    if (!edition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ edition });
  } catch (error) {
    console.error('draft get error:', error);
    return getApiErrorResponse(error, 'Failed to load draft');
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as { subject?: string; bodyMarkdown?: string };
    const edition = await updateDraft(Number(id), body);
    if (!edition) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 });
    return NextResponse.json({ edition });
  } catch (error) {
    console.error('draft update error:', error);
    return getApiErrorResponse(error, 'Failed to update draft');
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const ok = await deleteDraft(Number(id));
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('draft delete error:', error);
    return getApiErrorResponse(error, 'Failed to delete draft');
  }
}
