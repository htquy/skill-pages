import type { TaxonomyOption } from "@/src/domain/taxonomy/entities";
import type { SkillAccessType } from "@/src/domain/skill";

export interface SkillFiltersValues {
  q: string;
  industry?: string;
  category?: string;
  useCase?: string;
  tool?: string;
  access?: SkillAccessType;
}

const accessOptions: { value: SkillAccessType; label: string }[] = [
  { value: "FREE", label: "Free" },
  { value: "PAID", label: "Pro" },
];

function Select({
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
  options: TaxonomyOption[];
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
          <option key={option.slug} value={option.slug}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SkillFilters({
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
  return (
    <form method="get" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-2">
          <label htmlFor="skill-q" className="text-xs font-medium text-zinc-500">
            Search
          </label>
          <input
            id="skill-q"
            name="q"
            type="search"
            defaultValue={values.q}
            placeholder="Video prompts, writing, coding…"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <Select id="skill-industry" label="Industry" name="industry" defaultValue={values.industry} options={industries} />
        <Select id="skill-category" label="Category" name="category" defaultValue={values.category} options={categories} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="skill-tool" className="text-xs font-medium text-zinc-500">
            AI tool
          </label>
          <select
            id="skill-tool"
            name="tool"
            defaultValue={values.tool}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All</option>
            {tools.map((tool) => (
              <option key={tool.slug} value={tool.slug}>
                {tool.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="skill-access" className="text-xs font-medium text-zinc-500">
            Access
          </label>
          <select
            id="skill-access"
            name="access"
            defaultValue={values.access}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            <option value="">All</option>
            {accessOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-700"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}