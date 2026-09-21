import { createSkillAction, updateSkillAction } from "@/src/presentation/actions/admin-actions";
import type { SkillAdminDetail } from "@/src/domain/skill";
import type { TaxonomySnapshot } from "@/src/domain/taxonomy/entities";
import type { Dict } from "@/src/lib/i18n/config";
import {
  CheckboxField,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/src/presentation/components/admin/form-field";

export function SkillForm({
  skill,
  taxonomy,
  dict,
}: {
  skill?: SkillAdminDetail;
  taxonomy: TaxonomySnapshot;
  dict: Dict;
}) {
  const action = skill ? updateSkillAction.bind(null, skill.id) : createSkillAction;
  const selected = (slugs: string[]) => new Set(slugs);

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.title} required>
          <TextInput name="title" required defaultValue={skill?.title ?? ""} maxLength={200} />
        </Field>
        <Field label={dict.admin.forms.slug} hint={dict.admin.forms.slugHint}>
          <TextInput name="slug" defaultValue={skill?.slug ?? ""} maxLength={180} />
        </Field>
      </div>

      <Field label={dict.admin.forms.shortDescription} required>
        <TextInput
          name="shortDescription"
          required
          defaultValue={skill?.shortDescription ?? ""}
          maxLength={500}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.accessType} required>
          <Select name="accessType" defaultValue={skill?.accessType ?? "FREE"}>
            <option value="FREE">{dict.admin.forms.free}</option>
            <option value="PAID">{dict.admin.forms.paid}</option>
          </Select>
        </Field>
        <Field label={dict.admin.forms.coverImageUrl} hint={dict.admin.forms.coverImageHint}>
          <TextInput
            name="coverImageUrl"
            type="url"
            defaultValue={skill?.coverImageUrl ?? ""}
            maxLength={2000}
          />
        </Field>
      </div>

      <div className="grid gap-5 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.priceCurrency}>
          <Select name="priceCurrency" defaultValue={skill?.price?.currency ?? "USD"}>
            <option value="USD">USD</option>
            <option value="VND">VND</option>
            <option value="EUR">EUR</option>
          </Select>
        </Field>
        <Field
          label={dict.admin.forms.priceAmount}
          hint={dict.admin.forms.priceAmountHint}
        >
          <TextInput
            name="priceAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={
              skill?.price ? String(skill.price.amount / 100) : ""
            }
            placeholder="0.00"
          />
        </Field>
      </div>

      <Field label={dict.admin.forms.description} required>
        <TextArea name="description" required defaultValue={skill?.description ?? ""} className="min-h-28" />
      </Field>

      <Field label={dict.admin.forms.promptContent} required hint={dict.admin.forms.promptContentHint}>
        <TextArea name="content" required defaultValue={skill?.content ?? ""} className="min-h-48 font-mono" />
      </Field>

      <Field label={dict.admin.forms.howToUse} hint={dict.admin.forms.howToUseHint}>
        <TextArea name="instructions" defaultValue={skill?.instructions ?? ""} className="min-h-24" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.inputFieldsJson} hint={dict.admin.forms.inputFieldsJsonHint}>
          <TextArea
            name="variablesJson"
            defaultValue={skill?.variables ? JSON.stringify(skill.variables, null, 2) : ""}
            className="min-h-24 font-mono"
          />
        </Field>
        <Field label={dict.admin.forms.changelog} hint={dict.admin.forms.changelogHint}>
          <TextArea name="changelog" defaultValue={skill?.changelog ?? ""} />
        </Field>
      </div>

      <TaxonomyField
        legend={dict.admin.forms.industries}
        name="industrySlug"
        options={taxonomy.industries}
        selected={selected(skill?.industrySlugs ?? [])}
        emptyLabel={dict.admin.forms.noOptionsAvailable}
      />
      <TaxonomyField
        legend={dict.admin.forms.categories}
        name="categorySlug"
        options={taxonomy.categories}
        selected={selected(skill?.categorySlugs ?? [])}
        emptyLabel={dict.admin.forms.noOptionsAvailable}
      />
      <TaxonomyField
        legend={dict.admin.forms.useCases}
        name="useCaseSlug"
        options={taxonomy.useCases}
        selected={selected(skill?.useCaseSlugs ?? [])}
        emptyLabel={dict.admin.forms.noOptionsAvailable}
      />
      <TaxonomyField
        legend={dict.admin.forms.aiTools}
        name="toolSlug"
        options={taxonomy.tools}
        selected={selected(skill?.toolSlugs ?? [])}
        emptyLabel={dict.admin.forms.noOptionsAvailable}
      />

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-6">
        <a
          href={skill ? `/admin/skills/${skill.id}` : "/admin/skills"}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          {dict.admin.forms.cancel}
        </a>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          {skill ? dict.admin.forms.saveChanges : dict.admin.forms.createSkill}
        </button>
      </div>
    </form>
  );
}

function TaxonomyField({
  legend,
  name,
  options,
  selected,
  emptyLabel,
}: {
  legend: string;
  name: string;
  options: { id: string; slug: string; name: string }[];
  selected: Set<string>;
  emptyLabel: string;
}) {
  return (
    <fieldset className="rounded-2xl border border-zinc-200 p-5">
      <legend className="px-1 text-sm font-medium text-zinc-700">{legend}</legend>
      {options.length === 0 ? (
        <p className="text-sm text-zinc-400">{emptyLabel}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {options.map((option) => (
            <CheckboxField
              key={option.id}
              name={name}
              label={option.name}
              defaultChecked={selected.has(option.slug)}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}