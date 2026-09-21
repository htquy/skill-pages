import { createRankingAction, updateRankingAction } from "@/src/presentation/actions/admin-actions";
import type { RankingAdminDetail } from "@/src/domain/ranking/admin";
import type { Dict } from "@/src/lib/i18n/config";
import { Field, Select, TextInput } from "@/src/presentation/components/admin/form-field";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function RankingForm({
  ranking,
  industries,
  categories,
  dict,
}: {
  ranking?: RankingAdminDetail;
  industries: { id: string; slug: string; name: string }[];
  categories: { id: string; slug: string; name: string }[];
  dict: Dict;
}) {
  const action = ranking ? updateRankingAction.bind(null, ranking.id) : createRankingAction;

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.name} required>
          <TextInput name="name" required defaultValue={ranking?.name ?? ""} maxLength={220} />
        </Field>
        <Field label={dict.admin.forms.slugFromName} hint="Leave empty to generate from the name.">
          <TextInput name="slug" defaultValue={ranking?.slug ?? ""} maxLength={220} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.periodType} required>
          <Select name="periodType" defaultValue={ranking?.periodType ?? "MONTH"}>
            <option value="WEEK">{dict.admin.forms.week}</option>
            <option value="MONTH">{dict.admin.forms.month}</option>
            <option value="QUARTER">{dict.admin.forms.quarter}</option>
            <option value="ALL_TIME">{dict.admin.forms.allTime}</option>
          </Select>
        </Field>
        <div className="hidden sm:block" aria-hidden="true" />
        <Field label={dict.admin.forms.industry}>
          <Select name="industryId" defaultValue={ranking?.industryId ?? ""}>
            <option value="">{dict.admin.forms.noIndustry}</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.admin.forms.categoryLabel}>
          <Select name="categoryId" defaultValue={ranking?.categoryId ?? ""}>
            <option value="">{dict.admin.forms.noCategoryFilter}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.periodStart} hint={dict.admin.forms.periodStartHint}>
          <TextInput name="periodStart" type="date" defaultValue={toDateInputValue(ranking?.periodStart ?? null)} />
        </Field>
        <Field label={dict.admin.forms.periodEnd}>
          <TextInput name="periodEnd" type="date" defaultValue={toDateInputValue(ranking?.periodEnd ?? null)} />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-6">
        <a
          href={ranking ? `/admin/rankings/${ranking.id}` : "/admin/rankings"}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          {dict.admin.forms.cancel}
        </a>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          {ranking ? dict.admin.forms.saveChanges : dict.admin.forms.createRanking}
        </button>
      </div>
    </form>
  );
}