import Link from "next/link";
import Image from "next/image";
import type { RankingEntryView } from "@/src/domain/ranking/entities";
import { formatNumber } from "@/src/lib/utils";
import { cn } from "@/src/lib/utils";
import { getDictionary, trans } from "@/src/lib/i18n";

const RANK_BADGES: Record<number, string> = {
  1: "bg-amber-100 text-amber-700 border-amber-200",
  2: "bg-zinc-100 text-zinc-700 border-zinc-200",
  3: "bg-orange-100 text-orange-700 border-orange-200",
};

export async function RankingRow({ entry }: { entry: RankingEntryView }) {
  const dict = await getDictionary();
  const badgeClass = RANK_BADGES[entry.rank] ?? "bg-zinc-50 text-zinc-500 border-zinc-200";

  return (
    <li className="flex items-center gap-4 border-b border-zinc-100 px-4 py-4 last:border-b-0 sm:px-6">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
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
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
          {entry.tool.name.slice(0, 2).toUpperCase()}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/search?tool=${encodeURIComponent(entry.tool.slug)}`}
            className="truncate text-sm font-semibold text-zinc-900 hover:text-indigo-700"
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
                className="text-xs text-indigo-600 hover:underline"
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
          <p className="font-semibold text-indigo-700">{entry.score.toFixed(2)}</p>
        </div>
      </div>
    </li>
  );
}