import type { RankingView } from "@/src/domain/ranking/entities";
import { RankingRow } from "@/src/presentation/components/ranking/ranking-row";
import { getDictionary } from "@/src/lib/i18n";

export async function RankingTable({ ranking }: { ranking: RankingView }) {
  const dict = await getDictionary();

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-zinc-900">{ranking.name}</h2>
        <p className="mt-0.5 text-sm text-zinc-500">
          {ranking.industry?.name ?? dict.rankings.allIndustries}
          {ranking.category ? ` · ${ranking.category.name}` : ""} · {ranking.periodLabel}
        </p>
      </div>
      <ul className="divide-y divide-zinc-50">
        {ranking.entries.map((entry) => (
          <RankingRow key={entry.tool.slug} entry={entry} />
        ))}
      </ul>
    </div>
  );
}