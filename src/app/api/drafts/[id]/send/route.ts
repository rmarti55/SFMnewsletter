import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getApiErrorResponse } from '@/lib/config-errors';
import { getDraftById, markSent } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const edition = await getDraftById(Number(id));
    if (!edition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (edition.status !== 'draft') return NextResponse.json({ error: 'Already sent' }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.ADMIN_EMAIL;
    if (!apiKey || !to) {
      return NextResponse.json({ error: 'RESEND_API_KEY and ADMIN_EMAIL required for send' }, { status: 503 });
    }

    const from = process.env.EMAIL_FROM?.trim();
    if (process.env.VERCEL && !from) {
      return NextResponse.json({ error: 'EMAIL_FROM is required in production' }, { status: 503 });
    }

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: from || 'Santa Fe Newsletter <onboarding@resend.dev>',
      to,
      subject: edition.subject || `Newsletter ${edition.issueDate}`,
      text: edition.bodyMarkdown || '',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const sent = await markSent(Number(id));
    return NextResponse.json({ ok: true, edition: sent });
  } catch (error) {
    console.error('draft send error:', error);
    return getApiErrorResponse(error, 'Failed to send draft');
  }
}
