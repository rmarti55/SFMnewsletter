import { NextResponse } from 'next/server';
import { isValidResearchCategory } from '@/lib/research-categories';
import { deleteResearchDocument, getResearchDocument, updateResearchDocument } from '@/lib/research-db';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const id = Number((await context.params).id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const doc = getResearchDocument(id);
  if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function PUT(request: Request, context: RouteContext) {
  const id = Number((await context.params).id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const body = (await request.json()) as {
    title?: string;
    category?: string;
    digestMarkdown?: string | null;
  };

  if (body.category != null && !isValidResearchCategory(body.category)) {
    return NextResponse.json({ error: 'invalid category' }, { status: 400 });
  }

  try {
    const doc = updateResearchDocument(id, body);
    if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ document: doc });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const id = Number((await context.params).id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const ok = deleteResearchDocument(id);
  if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
