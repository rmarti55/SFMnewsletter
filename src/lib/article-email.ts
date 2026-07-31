import type { Article } from './types';
import { getArticleImageUrl } from './article-image-url';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripMarkdown(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}…`;
}

function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
}

export function buildArticleEmail(article: Article): {
  subject: string;
  html: string;
  text: string;
} {
  const baseUrl = getAppBaseUrl();
  const articleUrl = `${baseUrl}/minutes/${article.slug}`;
  const preview = truncateText(stripMarkdown(article.bodyMarkdown), 420);
  const imageUrl = getArticleImageUrl(article.id, article.imagePath);
  const headline = escapeHtml(article.headline);
  const dek = article.dek ? escapeHtml(article.dek) : '';
  const previewHtml = escapeHtml(preview).replace(/\n/g, '<br />');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#f4f0e8;font-family:Georgia,'Times New Roman',serif;color:#1f1a17;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f0e8;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffdf8;border:1px solid #d8cfc0;">
          <tr>
            <td style="padding:28px 32px 16px;border-bottom:3px double #1f1a17;text-align:center;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#6b5f54;">Santa Fe Minutes</p>
              <h1 style="margin:0;font-size:28px;line-height:1.25;font-weight:700;color:#1f1a17;">${headline}</h1>
              ${dek ? `<p style="margin:14px 0 0;font-size:16px;line-height:1.5;color:#4a4038;">${dek}</p>` : ''}
            </td>
          </tr>
          ${
            imageUrl
              ? `<tr>
            <td style="padding:0;">
              <img src="${escapeHtml(imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`)}" alt="" width="620" style="display:block;width:100%;max-width:620px;height:auto;" />
            </td>
          </tr>`
              : ''
          }
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0;font-size:17px;line-height:1.7;color:#2b241f;">${previewHtml}</p>
              <p style="margin:28px 0 0;text-align:center;">
                <a href="${articleUrl}" style="display:inline-block;padding:14px 28px;background:#8b3a2f;color:#fffdf8;text-decoration:none;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;font-family:Arial,sans-serif;">Read on Santa Fe Minutes</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e5ddd1;text-align:center;">
              <p style="margin:0;font-size:12px;color:#7a6f64;font-family:Arial,sans-serif;">
                <a href="${articleUrl}" style="color:#8b3a2f;text-decoration:none;">${escapeHtml(articleUrl)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    'Santa Fe Minutes',
    '',
    article.headline,
    article.dek ? article.dek : '',
    '',
    preview,
    '',
    `Read on Santa Fe Minutes: ${articleUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: article.headline,
    html,
    text,
  };
}
