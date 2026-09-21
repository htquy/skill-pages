import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import type { NewsCardViewModel } from "@/src/presentation/view-models/news";
import { getDictionary, trans } from "@/src/lib/i18n";

export async function NewsCard({ article }: { article: NewsCardViewModel }) {
  const dict = await getDictionary();

  return (
    <Link
      href={`/news/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      {article.coverImageUrl ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-zinc-100">
          <Image
            src={article.coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
            {dict.news.eyebrow}
          </p>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {article.categoryName ? (
            <span className="rounded-full bg-violet-50 px-2.5 py-0.5 font-medium text-violet-700">
              {article.categoryName}
            </span>
          ) : null}
          <span>{article.sourceName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedLabel}>{article.publishedLabel}</time>
        </div>

        <h3 className="mt-3 text-base font-semibold leading-snug text-zinc-900 group-hover:text-indigo-700">
          {article.title}
        </h3>
        {article.excerpt ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-600">
            {article.excerpt}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-4">
          {article.tools.length > 0 ? (
            <p className="text-xs text-zinc-500">
              {article.tools.slice(0, 2).join(", ")}
              {article.tools.length > 2 ? ` +${article.tools.length - 2}` : ""}
            </p>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            <Clock className="size-3.5" aria-hidden="true" />
            {trans(dict.news.minRead, { count: article.readingMinutes })}
          </span>
        </div>
      </div>
    </Link>
  );
}