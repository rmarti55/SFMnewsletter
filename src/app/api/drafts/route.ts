import { NextResponse } from 'next/server';
import { listDrafts } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ drafts: listDrafts() });
}
