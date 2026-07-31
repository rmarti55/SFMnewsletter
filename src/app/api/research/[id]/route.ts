import { NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { isValidResearchCategory } from '@/lib/research-categories';
import { deleteResearchDocument, getResearchDocument, updateResearchDocument } from '@/lib/storage';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    const doc = await getResearchDocument(id);
    if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error('research get error:', error);
    return getApiErrorResponse(error, 'Failed to load research document');
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
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

    const doc = await updateResearchDocument(id, body);
    if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error('research update error:', error);
    return getApiErrorResponse(error, 'Update failed');
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    const ok = await deleteResearchDocument(id);
    if (!ok) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('research delete error:', error);
    return getApiErrorResponse(error, 'Failed to delete research document');
  }
}
