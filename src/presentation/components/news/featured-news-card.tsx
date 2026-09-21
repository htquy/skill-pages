import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock } from "lucide-react";
import type { NewsCardViewModel } from "@/src/presentation/view-models/news";
import { getDictionary, trans } from "@/src/lib/i18n";

export async function FeaturedNewsCard({ article }: { article: NewsCardViewModel }) {
  const dict = await getDictionary();
  const featuredLabel = dict.news.featured;

  return (
    <Link
      href={`/news/${article.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md md:flex-row"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-100 md:aspect-auto md:w-1/2">
        {article.coverImageUrl ? (
          <Image
            src={article.coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500">
            <p className="text-sm font-semibold uppercase tracking-widest text-white/80">
              {featuredLabel}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center p-6 md:p-10">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-semibold uppercase tracking-wide text-indigo-700">
            {featuredLabel}
          </span>
          {article.categoryName ? (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 font-medium text-violet-700">
              {article.categoryName}
            </span>
          ) : null}
        </div>

        <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-zinc-900 group-hover:text-indigo-700 md:text-3xl">
          {article.title}
        </h2>
        {article.excerpt ? (
          <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-600">
            {article.excerpt}
          </p>
        ) : null}

        <div className="mt-6 flex items-center gap-4 text-sm text-zinc-500">
          <span className="font-medium text-zinc-700">{article.sourceName}</span>
          <time dateTime={article.publishedLabel}>{article.publishedLabel}</time>
          <span className="flex items-center gap-1">
            <Clock className="size-4" aria-hidden="true" />
            {trans(dict.news.minRead, { count: article.readingMinutes })}
          </span>
        </div>

        <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 group-hover:gap-2.5 transition-all">
          {dict.news.readArticle}
          <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}