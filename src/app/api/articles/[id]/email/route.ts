import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { buildArticleEmail } from '@/lib/article-email';
import { getApiErrorResponse } from '@/lib/config-errors';
import { getArticleById, markArticleEmailed } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const article = await getArticleById(Number(id));
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.ADMIN_EMAIL;
    if (!apiKey || !to) {
      return NextResponse.json({ error: 'RESEND_API_KEY and ADMIN_EMAIL required for send' }, { status: 503 });
    }

    const from = process.env.EMAIL_FROM?.trim();
    if (process.env.VERCEL && !from) {
      return NextResponse.json({ error: 'EMAIL_FROM is required in production' }, { status: 503 });
    }

    const email = buildArticleEmail(article);
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: from || 'Santa Fe Minutes <onboarding@resend.dev>',
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const updated = await markArticleEmailed(Number(id));
    return NextResponse.json({ ok: true, article: updated });
  } catch (error) {
    console.error('article email error:', error);
    return getApiErrorResponse(error, 'Failed to send article email');
  }
}
