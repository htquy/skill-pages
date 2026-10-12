import type { TaxonomyOption } from "@/src/domain/taxonomy/entities";
import type { RankingPeriodType } from "@/src/domain/ranking/entities";
import { getDictionary } from "@/src/lib/i18n";
import type { Dict } from "@/src/lib/i18n/config";
import {
  FilterForm,
  FilterSubmitButton,
} from "@/src/presentation/components/shared/filter-form";

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
  allLabel,
}: {
  id: string;
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  allLabel: string;
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
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function periodOptions(dict: Dict): { value: RankingPeriodType; label: string }[] {
  return [
    { value: "WEEK", label: dict.rankings.thisWeek },
    { value: "MONTH", label: dict.rankings.thisMonth },
    { value: "QUARTER", label: dict.rankings.thisQuarter },
    { value: "ALL_TIME", label: dict.rankings.allTime },
  ];
}

export async function RankingFilters({
  action,
  values,
  industries,
  categories,
  resetKey,
}: {
  action: string;
  values: RankingFiltersValues;
  industries: TaxonomyOption[];
  categories: TaxonomyOption[];
  resetKey?: string;
}) {
  const dict = await getDictionary();
  const allLabel = dict.common.all;

  return (
    <FilterForm
      action={action}
      resetKey={resetKey}
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field
          id="ranking-industry"
          label={dict.filters.industry}
          name="industry"
          defaultValue={values.industry}
          options={industries.map((i) => ({ value: i.slug, label: i.name }))}
          allLabel={allLabel}
        />
        <Field
          id="ranking-category"
          label={dict.filters.category}
          name="category"
          defaultValue={values.category}
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
          allLabel={allLabel}
        />
        <Field
          id="ranking-period"
          label={dict.filters.period}
          name="period"
          defaultValue={values.period}
          options={periodOptions(dict)}
          allLabel={allLabel}
        />
      </div>
      <div className="mt-3 flex items-center justify-end">
        <FilterSubmitButton label={dict.common.apply} />
      </div>
    </FilterForm>
  );
}