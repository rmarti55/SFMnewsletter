import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { getArticleImageUrl } from '@/lib/article-image-url';
import { getArticleBySlug } from '@/lib/storage';

export const dynamic = 'force-dynamic';

function formatArticleDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function MinutesArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const imageUrl = getArticleImageUrl(article.id, article.imagePath);

  return (
    <div className="min-h-screen bg-[#f7f3eb] text-[#1a1612]">
      <header className="border-b border-[#c8bfb0] px-6 py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link
            href="/minutes"
            className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-[#1a1612] hover:text-[#8b3a2f]"
          >
            ← Santa Fe Minutes
          </Link>
          <span className="text-xs uppercase tracking-[0.12em] text-[#7a6f64]">
            {formatArticleDate(article.createdAt)}
          </span>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12">
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="mb-8 aspect-[16/9] w-full object-cover" />
        )}

        <h1 className="font-heading text-4xl font-bold leading-tight md:text-5xl">{article.headline}</h1>

        {article.dek && (
          <p className="mt-5 border-l-2 border-[#8b3a2f] pl-4 text-xl leading-relaxed text-[#4a4038]">
            {article.dek}
          </p>
        )}

        <div className="prose-newsletter mt-10 max-w-none text-[17px] leading-[1.75]">
          <ReactMarkdown>{article.bodyMarkdown}</ReactMarkdown>
        </div>
      </article>

      <footer className="border-t border-[#c8bfb0] px-6 py-8 text-center">
        <Link
          href="/minutes"
          className="text-xs uppercase tracking-[0.12em] text-[#8b3a2f] hover:underline"
        >
          Back to front page
        </Link>
      </footer>
    </div>
  );
}
