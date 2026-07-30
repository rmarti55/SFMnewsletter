import { NextResponse } from 'next/server';
import { RESEARCH_CATEGORIES } from '@/lib/research-categories';
import { listResearchDocuments } from '@/lib/research-db';

export async function GET() {
  return NextResponse.json({
    categories: RESEARCH_CATEGORIES.map(({ id, label }) => ({ id, label })),
    documents: listResearchDocuments(),
  });
}
