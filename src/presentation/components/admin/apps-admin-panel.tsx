"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Plus } from "lucide-react";
import type { Dict } from "@/src/lib/i18n/config";
import type {
  AppMenuItemRecord,
  AppRecord,
  FeatureRecord,
  SubscriptionPlanRecord,
} from "@/src/domain/apps/entities";

export interface AdminAppConfig {
  app: AppRecord;
  plans: SubscriptionPlanRecord[];
  menus: AppMenuItemRecord[];
  /** Trang giới thiệu (catalog.tools) trỏ tới app này qua appSlug — lối vào duy nhất của khách. */
  catalogPages: Array<{ id: string; slug: string; title: string; status: string }>;
}

/** Kỳ hạn bán thông dụng; 0 = vĩnh viễn. Admin vẫn nhập được số tháng khác. */
const PERIODS = [1, 3, 6, 12, 0] as const;
const APP_TYPES = ["WEB_APP", "DESKTOP_TOOL", "MOBILE_APP", "EMBED_WIDGET", "MCP_SERVER"] as const;

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-zinc-400">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export function AppsAdminPanel({
  dict,
  configs,
  features,
}: {
  dict: Dict;
  configs: AdminAppConfig[];
  features: FeatureRecord[];
}) {
  const t = dict.admin.apps;
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(configs[0]?.app.slug ?? null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const selected = useMemo(
    () => configs.find((config) => config.app.slug === selectedSlug) ?? null,
    [configs, selectedSlug],
  );

  async function submit(key: string, url: string, body: unknown, reset?: () => void, method: "POST" | "PATCH" | "DELETE" = "POST") {
    setBusy(key);
    setStatus(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? t.error);
      }
      reset?.();
      setStatus({ kind: "ok", text: t.saved });
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : t.error });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">{t.appHeader}</h2>
          {configs.length === 0 ? <p className="text-sm text-zinc-500">{t.empty}</p> : null}
          {configs.map((config) => (
            <button
              key={config.app.id}
              type="button"
              onClick={() => setSelectedSlug(config.app.slug)}
              className={
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
                (selectedSlug === config.app.slug
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50")
              }
            >
              <span className="block font-medium">{config.app.name}</span>
              <span className="text-xs text-zinc-400">{config.app.slug}</span>
            </button>
          ))}
          <CreateAppForm dict={dict} busy={busy === "app"} onSubmit={(body, reset) => submit("app", "/api/admin/apps", body, reset)} />
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          {status ? (
            <p
              className={
                "rounded-lg px-3 py-2 text-sm " +
                (status.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")
              }
            >
              {status.text}
            </p>
          ) : null}

          {selected ? (
            <>
              <section className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold text-zinc-900">{selected.app.name}</h2>
                  <span className="text-xs text-zinc-400">
                    {selected.app.type} · /{selected.app.slug}
                  </span>
                </div>
                {selected.app.description ? (
                  <p className="mt-1 text-sm text-zinc-500">{selected.app.description}</p>
                ) : null}
                <CatalogLinks config={selected} t={t} />
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-zinc-900">{t.plans}</h3>
                {selected.plans.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">{t.noPlans}</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {selected.plans.map((plan) => (
                      <PlanCard
                        key={plan.id}
                        dict={dict}
                        plan={plan}
                        menuFeatureKeys={paidFeatureKeys(selected.menus)}
                        busy={busy}
                        onToggle={() =>
                          submit(`plan-${plan.id}`, `/api/admin/apps/${selected.app.slug}/plans/${plan.id}`, { isActive: !plan.isActive }, undefined, "PATCH")
                        }
                        onSavePrice={(body, reset) =>
                          submit(`price-${plan.id}`, `/api/admin/apps/${selected.app.slug}/plans/${plan.id}/prices`, body, reset)
                        }
                        onEdit={(body, done) =>
                          submit(`edit-${plan.id}`, `/api/admin/apps/${selected.app.slug}/plans/${plan.id}`, body, done, "PATCH")
                        }
                        onDelete={() =>
                          submit(`delete-${plan.id}`, `/api/admin/apps/${selected.app.slug}/plans/${plan.id}`, undefined, undefined, "DELETE")
                        }
                        onDeletePrice={(priceId) =>
                          submit(`price-${plan.id}`, `/api/admin/apps/${selected.app.slug}/plans/${plan.id}/prices/${priceId}`, undefined, undefined, "DELETE")
                        }
                      />
                    ))}
                  </div>
                )}
                <CreatePlanForm
                  dict={dict}
                  busy={busy === "plan"}
                  onSubmit={(body, reset) =>
                    submit("plan", `/api/admin/apps/${selected.app.slug}/plans`, body, reset)
                  }
                />
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-zinc-900">{t.menus}</h3>
                {selected.menus.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">{t.noMenus}</p>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {selected.menus.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-zinc-800">{item.label}</span>
                        <span className="text-xs text-zinc-400">{item.path ?? "—"}</span>
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                          {item.access}
                        </span>
                        {item.requiredFeatureKey ? (
                          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                            {item.requiredFeatureKey}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <CreateMenuForm
                  dict={dict}
                  menus={selected.menus}
                  features={features}
                  busy={busy === "menu"}
                  onSubmit={(body, reset) =>
                    submit("menu", `/api/admin/apps/${selected.app.slug}/menus`, body, reset)
                  }
                />
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-zinc-900">{t.grant}</h3>
                <GrantSubscriptionForm
                  dict={dict}
                  plans={selected.plans}
                  busy={busy === "grant"}
                  onSubmit={(body, reset) =>
                    submit("grant", `/api/admin/apps/${selected.app.slug}/grant`, body, reset)
                  }
                />
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CreateAppForm({
  dict,
  busy,
  onSubmit,
}: {
  dict: Dict;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>, reset: () => void) => void;
}) {
  const t = dict.admin.apps;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<(typeof APP_TYPES)[number]>("WEB_APP");
  const [description, setDescription] = useState("");

  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-lg border border-dashed border-zinc-200 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(
          { name, slug, type, description: description || null },
          () => {
            setName("");
            setSlug("");
            setDescription("");
          },
        );
      }}
    >
      <p className="text-xs font-semibold uppercase text-zinc-400">{t.createApp}</p>
      <input className={inputClass} placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} required />
      <input className={inputClass} placeholder={t.slug} value={slug} onChange={(e) => setSlug(e.target.value)} required />
      <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as (typeof APP_TYPES)[number])}>
        {APP_TYPES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <textarea
        className={inputClass}
        placeholder={t.description}
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
        {t.createApp}
      </button>
    </form>
  );
}

/** Nối app với trang giới thiệu công khai và bảng giá, để admin thấy ngay app đã "lên kệ" chưa. */
function CatalogLinks({ config, t }: { config: AdminAppConfig; t: Dict["admin"]["apps"] }) {
  const published = config.catalogPages.filter((page) => page.status === "PUBLISHED");
  const linkClass =
    "inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50";
  return (
    <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
      <div className="text-sm">
        <span className="font-medium text-zinc-700">{t.catalogPage}: </span>
        {config.catalogPages.length > 0 ? (
          config.catalogPages.map((page, index) => (
            <span key={page.id}>
              {index > 0 ? ", " : null}
              <Link href={`/admin/tools/${page.id}`} className="text-brand-700 hover:underline">
                {page.title}
              </Link>
              <span className="ml-1 text-xs text-zinc-400">({page.status})</span>
            </span>
          ))
        ) : null}
        {published.length === 0 ? (
          <p className="mt-1 text-xs text-amber-600">{t.noCatalogPage}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {config.catalogPages.length === 0 ? (
          <Link href={`/admin/tools/new?app=${encodeURIComponent(config.app.slug)}`} className={linkClass}>
            <Plus className="size-3.5" aria-hidden="true" />
            {t.createCatalogPage}
          </Link>
        ) : null}
        <a href={`/apps/${config.app.slug}/pricing`} target="_blank" rel="noreferrer" className={linkClass}>
          <ExternalLink className="size-3.5" aria-hidden="true" />
          {t.viewPricing}
        </a>
        <Link href="/admin/app-releases" className={linkClass}>
          {t.releases}
        </Link>
      </div>
    </div>
  );
}

function periodText(months: number, t: Dict["admin"]["apps"]) {
  return months === 0 ? t.lifetime : `${months} ${t.monthsUnit}`;
}

/** Mã tính năng mà các menu trả phí của app yêu cầu; gói không chứa mã nào trong đó thì mua xong vẫn bị khóa. */
function paidFeatureKeys(menus: AppMenuItemRecord[]): string[] {
  return [...new Set(menus.flatMap((menu) => (menu.access === "PAID" && menu.requiredFeatureKey ? [menu.requiredFeatureKey] : [])))];
}

function PlanCard({
  dict,
  plan,
  menuFeatureKeys,
  busy,
  onToggle,
  onSavePrice,
  onEdit,
  onDelete,
  onDeletePrice,
}: {
  dict: Dict;
  plan: SubscriptionPlanRecord;
  menuFeatureKeys: string[];
  busy: string | null;
  onToggle: () => void;
  onSavePrice: (body: Record<string, unknown>, reset: () => void) => void;
  onEdit: (body: Record<string, unknown>, done: () => void) => void;
  onDelete: () => void;
  onDeletePrice: (priceId: string) => void;
}) {
  const t = dict.admin.apps;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? "");
  const [featureKeys, setFeatureKeys] = useState(plan.featureKeys.join(", "));
  const [sortOrder, setSortOrder] = useState(String(plan.sortOrder));
  const [months, setMonths] = useState("1");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(plan.prices[0]?.currency ?? "VND");

  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium text-zinc-800">{plan.name}</span>
          <span
            className={
              "ml-2 rounded px-1.5 py-0.5 text-xs " +
              (plan.isActive ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500")
            }
          >
            {plan.isActive ? t.active : t.inactive}
          </span>
          <p className="mt-0.5 text-xs text-zinc-500">{plan.featureKeys.join(", ") || t.none}</p>
          {menuFeatureKeys.length > 0 && !plan.featureKeys.some((key) => menuFeatureKeys.includes(key)) ? (
            <p className="mt-1 text-xs text-red-600">
              {t.unlocksNothing.replace("{keys}", menuFeatureKeys.join(", "))}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            {editing ? t.cancel : t.editPlan}
          </button>
          <button
            type="button"
            onClick={onToggle}
            disabled={busy === `plan-${plan.id}`}
            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {plan.isActive ? t.stopSelling : t.resumeSelling}
          </button>
          <button
            type="button"
            disabled={busy === `delete-${plan.id}`}
            onClick={() => {
              if (confirm(t.deletePlanConfirm.replace("{name}", plan.name))) onDelete();
            }}
            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {t.deletePlan}
          </button>
        </div>
      </div>

      {editing ? (
        <form
          className="mt-3 grid gap-3 rounded-lg bg-zinc-50 p-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            onEdit(
              {
                name,
                description: description || null,
                sortOrder: Number(sortOrder) || 0,
                featureKeys: featureKeys.split(",").map((key) => key.trim()).filter(Boolean),
              },
              () => setEditing(false),
            );
          }}
        >
          <Field label={t.name}>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label={t.description}>
            <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label={t.featureKeys} hint={t.featureKeysHint}>
            <input className={inputClass} value={featureKeys} onChange={(e) => setFeatureKeys(e.target.value)} />
          </Field>
          <Field label={t.sortOrder}>
            <input className={inputClass} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </Field>
          <button
            type="submit"
            disabled={busy === `edit-${plan.id}`}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60 sm:col-span-2"
          >
            {t.savePlan}
          </button>
        </form>
      ) : null}

      {plan.prices.length === 0 ? (
        <p className="mt-2 text-xs text-amber-700">{t.noPrices}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {plan.prices.map((price) => (
            <li key={price.id} className="flex items-center gap-1">
              <button
                type="button"
                title={price.isActive ? t.stopSelling : t.resumeSelling}
                disabled={busy === `price-${plan.id}`}
                onClick={() =>
                  onSavePrice({ months: price.months, amount: price.amount, currency: price.currency, isActive: !price.isActive }, () => {})
                }
                className={
                  "rounded-full border px-2.5 py-1 text-xs " +
                  (price.isActive
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-zinc-200 bg-zinc-50 text-zinc-400 line-through")
                }
              >
                {periodText(price.months, t)} · {price.amount.toLocaleString()} {price.currency}
              </button>
              <button
                type="button"
                title={t.deletePrice}
                aria-label={t.deletePrice}
                disabled={busy === `price-${plan.id}`}
                onClick={() => {
                  if (confirm(t.deletePriceConfirm)) onDeletePrice(price.id);
                }}
                className="rounded-full px-1.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-60"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSavePrice({ months: Number(months), amount: Number(amount), currency, isActive: true }, () => setAmount(""));
        }}
      >
        <Field label={t.months}>
          <select className={inputClass} value={months} onChange={(e) => setMonths(e.target.value)}>
            {PERIODS.map((value) => (
              <option key={value} value={value}>
                {periodText(value, t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.price}>
          <input className={inputClass} type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label={t.currency}>
          <input className={inputClass + " w-20"} value={currency} onChange={(e) => setCurrency(e.target.value)} required />
        </Field>
        <button
          type="submit"
          disabled={busy === `price-${plan.id}`}
          className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t.setPrice}
        </button>
      </form>
    </div>
  );
}

function CreatePlanForm({
  dict,
  busy,
  onSubmit,
}: {
  dict: Dict;
  busy: boolean;
  onSubmit: (body: Record<string, unknown>, reset: () => void) => void;
}) {
  const t = dict.admin.apps;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [featureKeys, setFeatureKeys] = useState("");
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  return (
    <form
      className="mt-4 grid gap-3 rounded-lg border border-dashed border-zinc-200 p-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(
          {
            name,
            description: description || null,
            featureKeys: featureKeys
              .split(",")
              .map((key) => key.trim())
              .filter(Boolean),
            prices: PERIODS.filter((months) => amounts[months]?.trim()).map((months) => ({
              months,
              amount: Number(amounts[months]),
              currency,
            })),
          },
          () => {
            setName("");
            setDescription("");
            setFeatureKeys("");
            setAmounts({});
          },
        );
      }}
    >
      <p className="text-xs font-semibold uppercase text-zinc-400 sm:col-span-2">{t.createPlan}</p>
      <Field label={t.name}>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label={t.description}>
        <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label={t.featureKeys} hint={t.featureKeysHint}>
        <input className={inputClass} value={featureKeys} onChange={(e) => setFeatureKeys(e.target.value)} />
      </Field>
      <Field label={t.currency}>
        <input className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)} required />
      </Field>
      <div className="sm:col-span-2">
        <p className="mb-1 text-sm font-medium text-zinc-700">{t.initialPrices}</p>
        <div className="grid gap-2 sm:grid-cols-5">
          {PERIODS.map((months) => (
            <Field key={months} label={periodText(months, t)}>
              <input
                className={inputClass}
                type="number"
                min={0}
                value={amounts[months] ?? ""}
                onChange={(e) => setAmounts((prev) => ({ ...prev, [months]: e.target.value }))}
              />
            </Field>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          {t.createPlan}
        </button>
      </div>
    </form>
  );
}

function CreateMenuForm({
  dict,
  menus,
  features,
  busy,
  onSubmit,
}: {
  dict: Dict;
  menus: AppMenuItemRecord[];
  features: FeatureRecord[];
  busy: boolean;
  onSubmit: (body: Record<string, unknown>, reset: () => void) => void;
}) {
  const t = dict.admin.apps;
  const [label, setLabel] = useState("");
  const [path, setPath] = useState("");
  const [parentId, setParentId] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [access, setAccess] = useState<"FREE" | "PAID">("FREE");
  const [requiredFeatureKey, setRequiredFeatureKey] = useState("");

  return (
    <form
      className="mt-4 grid gap-3 rounded-lg border border-dashed border-zinc-200 p-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(
          {
            label,
            path: path || null,
            parentId: parentId || null,
            sortOrder: Number(sortOrder),
            access,
            requiredFeatureKey: requiredFeatureKey || null,
          },
          () => {
            setLabel("");
            setPath("");
          },
        );
      }}
    >
      <p className="text-xs font-semibold uppercase text-zinc-400 sm:col-span-2">{t.createMenu}</p>
      <Field label={t.label}>
        <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} required />
      </Field>
      <Field label={t.path}>
        <input className={inputClass} value={path} onChange={(e) => setPath(e.target.value)} />
      </Field>
      <Field label={t.parent}>
        <select className={inputClass} value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">{t.rootMenu}</option>
          {menus.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.sortOrder}>
        <input className={inputClass} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      </Field>
      <Field label={t.access}>
        <select className={inputClass} value={access} onChange={(e) => setAccess(e.target.value as "FREE" | "PAID")}>
          <option value="FREE">{t.free}</option>
          <option value="PAID">{t.paid}</option>
        </select>
      </Field>
      <Field label={t.requiredFeature}>
        <input
          className={inputClass}
          list="admin-feature-keys"
          value={requiredFeatureKey}
          onChange={(e) => setRequiredFeatureKey(e.target.value)}
        />
        <datalist id="admin-feature-keys">
          {features.map((feature) => (
            <option key={feature.id} value={feature.key} />
          ))}
        </datalist>
      </Field>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          {t.createMenu}
        </button>
      </div>
    </form>
  );
}

function GrantSubscriptionForm({
  dict,
  plans,
  busy,
  onSubmit,
}: {
  dict: Dict;
  plans: SubscriptionPlanRecord[];
  busy: boolean;
  onSubmit: (body: Record<string, unknown>, reset: () => void) => void;
}) {
  const t = dict.admin.apps;
  const [userId, setUserId] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [months, setMonths] = useState("1");

  return (
    <form
      className="mt-3 grid gap-3 rounded-lg border border-dashed border-zinc-200 p-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(
          {
            userId,
            planId,
            months: Number(months),
          },
          () => setUserId(""),
        );
      }}
    >
      <Field label={t.userId}>
        <input className={inputClass} value={userId} onChange={(e) => setUserId(e.target.value)} required />
      </Field>
      <Field label={t.plan}>
        <select className={inputClass} value={planId} onChange={(e) => setPlanId(e.target.value)} required>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.months} hint={t.grantHint}>
        <select className={inputClass} value={months} onChange={(e) => setMonths(e.target.value)}>
          {PERIODS.map((value) => (
            <option key={value} value={value}>
              {periodText(value, t)}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy || plans.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          {t.grant}
        </button>
      </div>
    </form>
  );
}
