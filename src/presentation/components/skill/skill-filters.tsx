import type { TaxonomyOption } from "@/src/domain/taxonomy/entities";
import type { SkillAccessType } from "@/src/domain/skill";
import { getDictionary, trans } from "@/src/lib/i18n";
import {
  FilterForm,
  FilterSubmitButton,
} from "@/src/presentation/components/shared/filter-form";

export interface SkillFiltersValues {
  q: string;
  industry?: string;
  category?: string;
  useCase?: string;
  tool?: string;
  access?: SkillAccessType;
}

const FIELD =
  "w-full rounded-full border border-zinc-200 bg-surface px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors hover:border-zinc-300 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100";

const LABEL = "pl-3 font-mono text-[0.68rem] font-medium uppercase tracking-wider text-zinc-500";

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
  // Không có skill nào gắn với nhóm này thì không hiện ô lọc rỗng.
  if (options.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 lg:min-w-40 lg:flex-1">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue} className={FIELD}>
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
  action,
  values,
  industries,
  categories,
  useCases = [],
  tools,
  resetKey,
}: {
  action: string;
  values: SkillFiltersValues;
  industries: TaxonomyOption[];
  categories: TaxonomyOption[];
  useCases?: TaxonomyOption[];
  tools: TaxonomyOption[];
  resetKey?: string;
}) {
  const dict = await getDictionary();
  const allLabel = dict.common.all;

  return (
    <FilterForm
      action={action}
      resetKey={resetKey}
      className="rounded-3xl border border-zinc-200 bg-surface/70 p-4 shadow-sm backdrop-blur sm:p-5"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:min-w-64 lg:flex-[2_1_16rem]">
          <label htmlFor="skill-q" className={LABEL}>
            {dict.common.search}
          </label>
          <input
            id="skill-q"
            name="q"
            type="search"
            defaultValue={values.q}
            placeholder={dict.filters.searchPlaceholder}
            className={FIELD}
          />
        </div>

        <Select id="skill-category" label={dict.filters.category} name="category" defaultValue={values.category} options={categories} allLabel={allLabel} />
        <Select id="skill-usecase" label={dict.filters.useCase} name="useCase" defaultValue={values.useCase} options={useCases} allLabel={allLabel} />
        <Select id="skill-industry" label={dict.filters.industry} name="industry" defaultValue={values.industry} options={industries} allLabel={allLabel} />
        <Select id="skill-tool" label={dict.filters.tool} name="tool" defaultValue={values.tool} options={tools} allLabel={allLabel} />

        <div className="flex flex-col gap-1.5 lg:min-w-32 lg:flex-1">
          <label htmlFor="skill-access" className={LABEL}>
            {dict.filters.access}
          </label>
          <select id="skill-access" name="access" defaultValue={values.access} className={FIELD}>
            <option value="">{allLabel}</option>
            <option value="FREE">{dict.filters.free}</option>
            <option value="PAID">{dict.filters.pro}</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <FilterSubmitButton label={trans(dict.filters.apply)} />
      </div>
    </FilterForm>
  );
}
