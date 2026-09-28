import { createToolAction, updateToolAction } from "@/src/presentation/actions/admin-actions";
import type { ToolAdminDetail, ToolPriceInfo } from "@/src/domain/tool";
import type { Dict } from "@/src/lib/i18n/config";
import {
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/src/presentation/components/admin/form-field";
import { RichTextEditor } from "@/src/presentation/components/admin/rich-text-editor";
import { VideoDemoField } from "@/src/presentation/components/upload/video-demo-field";
import { ToolFileField } from "@/src/presentation/components/upload/tool-file-field";
import { toPriceInputValue } from "@/src/presentation/view-models/tool";

const TOOL_TYPES = ["DOWNLOADABLE", "EMBED_WIDGET", "MCP_SERVER", "WEB_APP"] as const;
const BILLING_TYPES = ["FREE", "ONE_TIME", "SUBSCRIPTION"] as const;
const CURRENCIES = ["USD", "VND", "EUR"] as const;

/** Dòng giá mẫu khi tạo mới: 1 tháng, USD — admin sửa trực tiếp trên form. */
const DRAFT_PRICE: ToolPriceInfo = { currency: "USD", amount: 0, durationDays: 30 };

export function ToolForm({ tool, dict }: { tool?: ToolAdminDetail; dict: Dict }) {
  const action = tool ? updateToolAction.bind(null, tool.id) : createToolAction;
  const prices = tool?.prices.length ? tool.prices : [DRAFT_PRICE];

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.title} required>
          <TextInput name="title" required defaultValue={tool?.title ?? ""} maxLength={200} />
        </Field>
        <Field label={dict.admin.forms.slug} hint={dict.admin.forms.slugHint}>
          <TextInput name="slug" defaultValue={tool?.slug ?? ""} maxLength={180} />
        </Field>
      </div>

      <Field label={dict.admin.forms.shortDescription} required>
        <TextInput
          name="shortDescription"
          required
          defaultValue={tool?.shortDescription ?? ""}
          maxLength={500}
        />
      </Field>

      <Field label={dict.admin.forms.description} required hint={dict.admin.forms.descriptionHint}>
        <RichTextEditor
          name="description"
          defaultValue={tool?.description ?? ""}
          placeholder={dict.richText.placeholder}
          dict={dict}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.toolType} required hint={dict.admin.forms.toolTypeHint}>
          <Select name="type" defaultValue={tool?.type ?? "DOWNLOADABLE"}>
            {TOOL_TYPES.map((type) => (
              <option key={type} value={type}>
                {dict.tools.types[type]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={dict.admin.forms.billingType} required>
          <Select name="billingType" defaultValue={tool?.billingType ?? "ONE_TIME"}>
            {BILLING_TYPES.map((billing) => (
              <option key={billing} value={billing}>
                {dict.tools.billingTypes[billing]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={dict.admin.forms.coverImageUrl} hint={dict.admin.forms.coverImageHint}>
          <TextInput
            name="coverImageUrl"
            type="url"
            defaultValue={tool?.coverImageUrl ?? ""}
            maxLength={2000}
          />
        </Field>
        <Field label={dict.admin.forms.appUrl} hint={dict.admin.forms.appUrlHint}>
          <TextInput name="appUrl" type="url" defaultValue={tool?.appUrl ?? ""} maxLength={2000} />
        </Field>
      </div>

      <VideoDemoField
        defaultValue={tool?.videoDemoUrl ?? ""}
        label={dict.upload.fieldLabel}
        hint={dict.upload.fieldHint}
        dict={dict}
      />

      <fieldset className="space-y-5 rounded-2xl border border-zinc-200 p-5">
        <legend className="px-1 text-sm font-medium text-zinc-700">
          {dict.admin.tools.versionTitle}
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={dict.admin.forms.versionCode} required hint={dict.admin.forms.versionCodeHint}>
            <TextInput
              name="versionCode"
              required
              defaultValue={tool?.version?.versionCode ?? ""}
              placeholder="1.0.0"
              maxLength={40}
            />
          </Field>
          <Field label={dict.admin.forms.changelog} hint={dict.admin.forms.changelogHint}>
            <TextArea name="changelog" defaultValue={tool?.version?.changelog ?? ""} />
          </Field>
        </div>

        <Field
          label={dict.admin.forms.toolScriptUrl}
          hint={dict.admin.forms.toolScriptUrlHint}
        >
          <TextInput
            name="scriptUrl"
            type="url"
            defaultValue={tool?.version?.scriptUrl ?? ""}
            maxLength={2000}
          />
        </Field>

        <ToolFileField
          defaultValue={{
            url: tool?.version?.fileUrl ?? "",
            name: tool?.version?.fileName ?? null,
            size: tool?.version?.fileSize ?? null,
          }}
          label={dict.admin.forms.toolFile}
          hint={dict.upload.tool.fieldHint}
          dict={dict}
        />
      </fieldset>

      <fieldset className="rounded-2xl border border-zinc-200 p-5">
        <legend className="px-1 text-sm font-medium text-zinc-700">
          {dict.admin.forms.pricePlans}
        </legend>
        <p className="mb-4 text-xs text-zinc-400">{dict.admin.forms.pricePlansHint}</p>
        <div className="space-y-4">
          {prices.map((price, index) => (
            <PriceRow key={index} price={price} dict={dict} />
          ))}
        </div>
      </fieldset>

      <Field label={dict.admin.forms.configJson} hint={dict.admin.forms.configJsonHint}>
        <TextArea
          name="configJson"
          defaultValue={toConfigInput(tool?.config)}
          className="min-h-32 font-mono"
          placeholder={'{\n  "command": "npx",\n  "args": ["-y", "my-mcp-server"]\n}'}
        />
      </Field>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-6">
        <a
          href={tool ? `/admin/tools/${tool.id}` : "/admin/tools"}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          {dict.admin.forms.cancel}
        </a>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          {tool ? dict.admin.forms.saveChanges : dict.admin.forms.createTool}
        </button>
      </div>
    </form>
  );
}

function PriceRow({ price, dict }: { price: ToolPriceInfo; dict: Dict }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label={dict.admin.forms.priceAmountPlan}>
        <TextInput
          name="priceAmount"
          type="number"
          step="0.01"
          min="0"
          defaultValue={price.amount > 0 ? toPriceInputValue(price) : ""}
          placeholder="0.00"
        />
      </Field>
      <Field label={dict.admin.forms.priceCurrencyPlan}>
        <Select name="priceCurrency" defaultValue={price.currency}>
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={dict.admin.forms.priceDuration} hint={dict.admin.forms.priceDurationHint}>
        <TextInput
          name="priceDuration"
          type="number"
          min="0"
          step="1"
          defaultValue={String(price.durationDays)}
          placeholder="0"
        />
      </Field>
    </div>
  );
}

/** `appUrl` có input riêng nên không lặp lại trong ô JSON. */
function toConfigInput(config: Record<string, unknown> | null | undefined): string {
  if (!config) return "";
  const { appUrl: _appUrl, ...rest } = config;
  return Object.keys(rest).length > 0 ? JSON.stringify(rest, null, 2) : "";
}
