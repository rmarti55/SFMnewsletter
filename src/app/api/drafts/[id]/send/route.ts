import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getDraftById, markSent } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const edition = getDraftById(Number(id));
  if (!edition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (edition.status !== 'draft') return NextResponse.json({ error: 'Already sent' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  if (!apiKey || !to) {
    return NextResponse.json({ error: 'RESEND_API_KEY and ADMIN_EMAIL required for send' }, { status: 503 });
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Santa Fe Newsletter <onboarding@resend.dev>',
    to,
    subject: edition.subject || `Newsletter ${edition.issueDate}`,
    text: edition.bodyMarkdown || '',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sent = markSent(Number(id));
  return NextResponse.json({ ok: true, edition: sent });
}
