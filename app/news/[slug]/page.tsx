export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, ExternalLink, Clock } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { NewsGrid } from "@/src/presentation/components/news/news-grid";
import { toNewsCardViewModel } from "@/src/presentation/view-models/news";
import { newsQueries } from "@/src/infrastructure/composition";
import { formatDate } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await newsQueries.getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt ?? article.content.slice(0, 150),
    openGraph: {
      title: article.title,
      description: article.excerpt ?? undefined,
      type: "article",
      publishedTime: article.publishedAt?.toISOString(),
    },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await newsQueries.getArticle(slug);
  if (!article) notFound();

  const dict = await getDictionary();

  const content = article.content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <Container className="max-w-3xl py-10 md:py-14">
      <Link
        href="/news"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {dict.news.backAll}
      </Link>

      <article className="mt-8">
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          {article.category ? (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 font-medium text-violet-700">
              {article.category.name}
            </span>
          ) : null}
          <span>{article.sourceName}</span>
          {article.publishedAt ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" aria-hidden="true" />
                {formatDate(article.publishedAt)}
              </span>
            </>
          ) : null}
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {trans(dict.news.minRead, { count: article.readingMinutes })}
          </span>
        </div>

        <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
          {article.title}
        </h1>
        {article.excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-zinc-600">
            {article.excerpt}
          </p>
        ) : null}

        {article.coverImageUrl ? (
          <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-zinc-100">
            <Image
              src={article.coverImageUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="mt-8 space-y-5 text-base leading-relaxed text-zinc-700">
          {content.map((block, index) => (
            <p key={index}>{block}</p>
          ))}
        </div>

        {article.sourceUrl ? (
          <a
            href={article.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50"
          >
            {dict.news.readOriginal}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : null}

        {article.tools.length > 0 ? (
          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {dict.news.toolsMentioned}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {article.tools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/search?${new URLSearchParams({ tool: tool.slug })}`}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {tool.logoUrl ? (
                    <Image
                      src={tool.logoUrl}
                      alt=""
                      width={16}
                      height={16}
                      className="size-4 rounded-sm object-contain"
                    />
                  ) : null}
                  {tool.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </article>

      {article.related.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            {dict.news.related}
          </h2>
          <div className="mt-6">
            <NewsGrid articles={article.related.map(toNewsCardViewModel)} />
          </div>
        </section>
      ) : null}
    </Container>
  );
}