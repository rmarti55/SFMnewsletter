import { NextResponse } from 'next/server';
import { getApiErrorResponse } from '@/lib/config-errors';
import { listDrafts } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ drafts: await listDrafts() });
  } catch (error) {
    console.error('drafts list error:', error);
    return getApiErrorResponse(error, 'Failed to list drafts');
  }
}
