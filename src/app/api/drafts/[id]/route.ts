import { NextRequest, NextResponse } from 'next/server';
import { deleteDraft, getDraftById, updateDraft } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const edition = getDraftById(Number(id));
  if (!edition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ edition });
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json()) as { subject?: string; bodyMarkdown?: string };
  const edition = updateDraft(Number(id), body);
  if (!edition) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 });
  return NextResponse.json({ edition });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ok = deleteDraft(Number(id));
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
