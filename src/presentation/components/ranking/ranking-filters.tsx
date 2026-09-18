import type { TaxonomyOption } from "@/src/domain/taxonomy/entities";
import type { RankingPeriodType } from "@/src/domain/ranking/entities";

const periodOptions: { value: RankingPeriodType; label: string }[] = [
  { value: "WEEK", label: "This week" },
  { value: "MONTH", label: "This month" },
  { value: "QUARTER", label: "This quarter" },
  { value: "ALL_TIME", label: "All time" },
];

export interface RankingFiltersValues {
  industry?: string;
  category?: string;
  period?: RankingPeriodType;
}

function Field({
  id,
  label,
  name,
  defaultValue,
  options,
}: {
  id: string;
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-zinc-500">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function RankingFilters({
  values,
  industries,
  categories,
}: {
  values: RankingFiltersValues;
  industries: TaxonomyOption[];
  categories: TaxonomyOption[];
}) {
  return (
    <form method="get" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field id="ranking-industry" label="Industry" name="industry" defaultValue={values.industry} options={industries.map((i) => ({ value: i.slug, label: i.name }))} />
        <Field id="ranking-category" label="Category" name="category" defaultValue={values.category} options={categories.map((c) => ({ value: c.slug, label: c.name }))} />
        <Field id="ranking-period" label="Period" name="period" defaultValue={values.period} options={periodOptions} />
      </div>
      <div className="mt-3 flex items-center justify-end">
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
        >
          Apply
        </button>
      </div>
    </form>
  );
}