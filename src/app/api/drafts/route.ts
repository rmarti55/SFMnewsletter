import { NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { listDrafts } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ drafts: listDrafts() });
  } catch (error) {
    console.error('drafts list error:', error);
    return getApiErrorResponse(error, 'Failed to list drafts');
  }
}
