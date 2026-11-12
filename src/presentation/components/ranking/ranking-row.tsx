import Link from "next/link";
import Image from "next/image";
import type { RankingEntryView } from "@/src/domain/ranking/entities";
import { formatNumber } from "@/src/lib/utils";
import { cn } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";

// Huy chương vàng / bạc / đồng cho top 3.
const RANK_BADGES: Record<number, string> = {
  1: "border-transparent text-white shadow-[0_6px_18px_-6px_rgb(245_123_11/0.7)] bg-spark-300",
  2: "border-transparent text-white shadow-[0_6px_18px_-8px_rgb(82_82_91/0.6)] bg-zinc-200",
  3: "border-transparent text-white shadow-[0_6px_18px_-8px_rgb(234_88_12/0.6)] bg-orange-300",
};

export async function RankingRow({ entry }: { entry: RankingEntryView }) {
  const dict = await getDictionary();
  const badgeClass = RANK_BADGES[entry.rank] ?? "bg-zinc-50 text-zinc-500 border-zinc-200";

  return (
    <li
      className={cn(
        "group flex items-center gap-4 border-b border-zinc-100 px-4 py-4 transition-colors duration-300 last:border-b-0 hover:bg-brand-50/50 sm:px-6",
        entry.rank <= 3 ? "bg-spark-50/60" : null,
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold tabular-nums transition-transform duration-500 ease-out",
          badgeClass,
        )}
        aria-label={trans(dict.rankings.rankingAria, { rank: entry.rank })}
      >
        {entry.rank}
      </span>

      {entry.tool.logoUrl ? (
        <Image
          src={entry.tool.logoUrl}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-lg border border-zinc-100 object-contain"
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600">
          {entry.tool.name.slice(0, 2).toUpperCase()}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/search?tool=${encodeURIComponent(entry.tool.slug)}`}
            className="truncate text-sm font-semibold text-zinc-900 hover:text-brand-700"
          >
            {entry.tool.name}
          </Link>
          {entry.tool.websiteUrl ? (
            <>
              <span aria-hidden="true" className="text-zinc-300">·</span>
              <a
                href={entry.tool.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-600 hover:underline"
              >
                {dict.rankings.visit}
              </a>
            </>
          ) : null}
        </div>
        {entry.tool.description ? (
          <p className="mt-0.5 line-clamp-1 text-sm text-zinc-500">
            {entry.tool.description}
          </p>
        ) : null}
      </div>

      <div className="hidden items-center gap-6 text-right text-sm sm:flex">
        <div>
          <p className="text-xs text-zinc-400">{dict.common.views}</p>
          <p className="font-medium text-zinc-700">{formatNumber(entry.views)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">{dict.common.saves}</p>
          <p className="font-medium text-zinc-700">{formatNumber(entry.favorites)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">{dict.common.score}</p>
          <p className="font-semibold tabular-nums text-brand-700">{entry.score.toFixed(2)}</p>
        </div>
      </div>
    </li>
  );
}