import Link from 'next/link';
import { listArticles } from '@/lib/storage';
import { getArticleImageUrl } from '@/lib/article-image-url';

export const dynamic = 'force-dynamic';

function formatDateLine() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function MinutesFrontPage() {
  const articles = await listArticles({ listedOnly: true });

  return (
    <div className="min-h-screen bg-[#f7f3eb] text-[#1a1612]">
      <header className="border-b-4 border-double border-[#1a1612] px-6 py-10 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-[#5c5348]">
          Civic coverage · Santa Fe, New Mexico
        </p>
        <h1 className="mt-3 font-heading text-5xl font-bold tracking-tight md:text-7xl">
          Santa Fe Minutes
        </h1>
        <p className="mt-4 text-sm uppercase tracking-[0.2em] text-[#5c5348]">{formatDateLine()}</p>
        <div className="mx-auto mt-6 h-px max-w-4xl bg-[#1a1612]" />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {articles.length === 0 ? (
          <div className="border border-[#c8bfb0] bg-[#fffdf7] px-8 py-16 text-center">
            <p className="font-heading text-2xl">No stories yet</p>
            <p className="mt-3 text-sm leading-relaxed text-[#5c5348]">
              Articles marked &ldquo;listed&rdquo; in{' '}
              <Link href="/admin/articles" className="underline underline-offset-2">
                Articles
              </Link>{' '}
              will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {articles.map((article, index) => {
              const imageUrl = getArticleImageUrl(article.id, article.imagePath);
              return (
                <article
                  key={article.id}
                  className={index > 0 ? 'border-t border-[#1a1612] pt-10 mt-10' : ''}
                >
                  <Link href={`/minutes/${article.slug}`} className="group block">
                    {imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt=""
                        className="mb-6 aspect-[16/9] w-full object-cover"
                      />
                    )}
                    <h2 className="font-heading text-3xl font-bold leading-tight transition-colors group-hover:text-[#8b3a2f] md:text-4xl">
                      {article.headline}
                    </h2>
                    {article.dek && (
                      <p className="mt-3 text-lg leading-relaxed text-[#4a4038]">{article.dek}</p>
                    )}
                    <p className="mt-4 text-xs uppercase tracking-[0.15em] text-[#8b3a2f]">
                      Read the full story →
                    </p>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-[#c8bfb0] px-6 py-8 text-center text-xs uppercase tracking-[0.12em] text-[#7a6f64]">
        Santa Fe Minutes · Draft preview · Admin only
      </footer>
    </div>
  );
}
