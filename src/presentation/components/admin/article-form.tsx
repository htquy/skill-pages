import { createArticleAction, updateArticleAction } from "@/src/presentation/actions/admin-actions";
import type { NewsAdminDetail } from "@/src/domain/news/admin";
import type { Dict } from "@/src/lib/i18n/config";
import {
  CheckboxField,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/src/presentation/components/admin/form-field";

export interface ArticleFormOptions {
  categories: { id: string; slug: string; name: string }[];
  tools: { id: string; slug: string; name: string }[];
}

export function ArticleForm({
  article,
  options,
  dict,
}: {
  article?: NewsAdminDetail;
  options: ArticleFormOptions;
  dict: Dict;
}) {
  const action = article ? updateArticleAction.bind(null, article.id) : createArticleAction;

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.title} required>
          <TextInput name="title" required defaultValue={article?.title ?? ""} maxLength={260} />
        </Field>
        <Field label={dict.admin.forms.slug} hint={dict.admin.forms.slugHint}>
          <TextInput name="slug" defaultValue={article?.slug ?? ""} maxLength={220} />
        </Field>
      </div>

      <Field label={dict.admin.forms.excerpt} hint={dict.admin.forms.excerptHint}>
        <TextArea name="excerpt" defaultValue={article?.excerpt ?? ""} maxLength={600} />
      </Field>

      <Field label={dict.admin.forms.content} required>
        <TextArea name="content" required defaultValue={article?.content ?? ""} className="min-h-48" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.sourceName} required>
          <TextInput name="sourceName" required defaultValue={article?.sourceName ?? ""} maxLength={160} />
        </Field>
        <Field label={dict.admin.forms.sourceUrl}>
          <TextInput name="sourceUrl" type="url" defaultValue={article?.sourceUrl ?? ""} maxLength={2000} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.coverImageUrl}>
          <TextInput name="coverImageUrl" type="url" defaultValue={article?.coverImageUrl ?? ""} maxLength={2000} />
        </Field>
        <Field label={dict.admin.forms.category}>
          <Select name="categorySlug" defaultValue={article?.categorySlug ?? ""}>
            <option value="">{dict.admin.forms.noCategory}</option>
            {options.categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label={dict.admin.forms.aiTools}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {options.tools.map((tool) => (
            <CheckboxField
              key={tool.id}
              name="toolSlug"
              label={tool.name}
              defaultChecked={article?.toolSlugs.includes(tool.slug) ?? false}
            />
          ))}
        </div>
      </Field>

      <CheckboxField
        name="publish"
        label={dict.admin.forms.publishImmediately}
        hint={dict.admin.forms.publishImmediatelyHint}
        defaultChecked={article?.status === "PUBLISHED" || !article}
      />

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-6">
        <a
          href={article ? `/admin/articles/${article.id}` : "/admin/articles"}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          {dict.admin.forms.cancel}
        </a>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          {article ? dict.admin.forms.saveChanges : dict.admin.forms.createArticle}
        </button>
      </div>
    </form>
  );
}