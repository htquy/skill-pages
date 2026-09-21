import type { TaxonomyOption } from "@/src/domain/taxonomy/entities";
import type { SkillAccessType } from "@/src/domain/skill";
import { getDictionary, trans } from "@/src/lib/i18n";

export interface SkillFiltersValues {
  q: string;
  industry?: string;
  category?: string;
  useCase?: string;
  tool?: string;
  access?: SkillAccessType;
}

function Select({
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
  options: TaxonomyOption[];
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
          <option key={option.slug} value={option.slug}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export async function SkillFilters({
  values,
  industries,
  categories,
  tools,
}: {
  values: SkillFiltersValues;
  industries: TaxonomyOption[];
  categories: TaxonomyOption[];
  tools: TaxonomyOption[];
}) {
  const dict = await getDictionary();
  const allLabel = dict.common.all;

  return (
    <form method="get" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
          <label htmlFor="skill-q" className="text-xs font-medium text-zinc-500">
            {dict.common.search}
          </label>
          <input
            id="skill-q"
            name="q"
            type="search"
            defaultValue={values.q}
            placeholder={dict.filters.searchPlaceholder}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <Select
          id="skill-industry"
          label={dict.filters.industry}
          name="industry"
          defaultValue={values.industry}
          options={industries}
          allLabel={allLabel}
        />
        <Select
          id="skill-category"
          label={dict.filters.category}
          name="category"
          defaultValue={values.category}
          options={categories}
          allLabel={allLabel}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="skill-tool" className="text-xs font-medium text-zinc-500">
            {dict.filters.tool}
          </label>
          <select
            id="skill-tool"
            name="tool"
            defaultValue={values.tool}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">{allLabel}</option>
            {tools.map((tool) => (
              <option key={tool.slug} value={tool.slug}>
                {tool.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="skill-access" className="text-xs font-medium text-zinc-500">
            {dict.filters.access}
          </label>
          <select
            id="skill-access"
            name="access"
            defaultValue={values.access}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">{allLabel}</option>
            <option value="FREE">{dict.filters.free}</option>
            <option value="PAID">{dict.filters.pro}</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
        >
          {trans(dict.filters.apply)}
        </button>
      </div>
    </form>
  );
}