import { NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { RESEARCH_CATEGORIES } from '@/lib/research-categories';
import { listResearchDocuments } from '@/lib/storage';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({
      categories: RESEARCH_CATEGORIES.map(({ id, label }) => ({ id, label })),
      documents: await listResearchDocuments(),
    });
  } catch (error) {
    console.error('research list error:', error);
    return getApiErrorResponse(error, 'Failed to list research documents');
  }
}
