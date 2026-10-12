"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import type { Dict } from "@/src/lib/i18n/config";
import type {
  AppMenuItemRecord,
  AppRecord,
  FeatureRecord,
  SubscriptionInterval,
  SubscriptionPlanRecord,
} from "@/src/domain/apps/entities";

export interface AdminAppConfig {
  app: AppRecord;
  plans: SubscriptionPlanRecord[];
  menus: AppMenuItemRecord[];
}

const INTERVALS: SubscriptionInterval[] = ["MONTH", "QUARTER", "YEAR", "CUSTOM"];
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
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

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

  async function submit(key: string, url: string, body: unknown, reset?: () => void) {
    setBusy(key);
    setStatus(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
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
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-zinc-900">{t.plans}</h3>
                {selected.plans.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">{t.noPlans}</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-zinc-400">
                        <tr>
                          <th className="py-1 pr-3">{t.name}</th>
                          <th className="py-1 pr-3">{t.price}</th>
                          <th className="py-1 pr-3">{t.interval}</th>
                          <th className="py-1 pr-3">{t.durationDays}</th>
                          <th className="py-1 pr-3">{t.featureKeys}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {selected.plans.map((plan) => (
                          <tr key={plan.id}>
                            <td className="py-2 pr-3 font-medium text-zinc-800">{plan.name}</td>
                            <td className="py-2 pr-3 text-zinc-600">
                              {plan.price.toLocaleString()} {plan.currency}
                            </td>
                            <td className="py-2 pr-3 text-zinc-600">{plan.interval}</td>
                            <td className="py-2 pr-3 text-zinc-600">
                              {plan.durationDays > 0 ? plan.durationDays : t.lifetime}
                            </td>
                            <td className="py-2 pr-3 text-xs text-zinc-500">
                              {plan.featureKeys.join(", ") || t.none}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
        {t.createApp}
      </button>
    </form>
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
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState("VND");
  const [interval, setInterval] = useState<SubscriptionInterval>("MONTH");
  const [durationDays, setDurationDays] = useState("30");
  const [featureKeys, setFeatureKeys] = useState("");

  return (
    <form
      className="mt-4 grid gap-3 rounded-lg border border-dashed border-zinc-200 p-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(
          {
            name,
            price: Number(price),
            currency,
            interval,
            durationDays: Number(durationDays),
            featureKeys: featureKeys
              .split(",")
              .map((key) => key.trim())
              .filter(Boolean),
          },
          () => {
            setName("");
            setPrice("0");
            setFeatureKeys("");
          },
        );
      }}
    >
      <p className="text-xs font-semibold uppercase text-zinc-400 sm:col-span-2">{t.createPlan}</p>
      <Field label={t.name}>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label={t.price}>
        <input className={inputClass} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} required />
      </Field>
      <Field label={t.currency}>
        <input className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)} required />
      </Field>
      <Field label={t.interval}>
        <select className={inputClass} value={interval} onChange={(e) => setInterval(e.target.value as SubscriptionInterval)}>
          {INTERVALS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.durationDays}>
        <input className={inputClass} type="number" min={0} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
      </Field>
      <Field label={t.featureKeys} hint={t.featureKeysHint}>
        <input className={inputClass} value={featureKeys} onChange={(e) => setFeatureKeys(e.target.value)} />
      </Field>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
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
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
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
  const [durationDays, setDurationDays] = useState("");

  return (
    <form
      className="mt-3 grid gap-3 rounded-lg border border-dashed border-zinc-200 p-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(
          {
            userId,
            planId,
            durationDays: durationDays ? Number(durationDays) : undefined,
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
      <Field label={t.optionalDays}>
        <input className={inputClass} type="number" min={0} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
      </Field>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy || plans.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
          {t.grant}
        </button>
      </div>
    </form>
  );
}
