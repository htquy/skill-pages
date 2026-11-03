export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { BuyNowButton } from "@/src/presentation/components/checkout/buy-now-button";
import { appsService, toolQueries } from "@/src/infrastructure/composition";
import { auth } from "@/src/infrastructure/authentication/auth";
import { isAppError } from "@/src/domain/errors";
import { formatMoney } from "@/src/domain/shared";
import { getDictionary, trans } from "@/src/lib/i18n";

type Props = { params: Promise<{ slug: string }> };

async function loadApp(slug: string) {
  try {
    return await appsService.getApp(slug);
  } catch (error) {
    if (isAppError(error) && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadApp(slug);
  return result ? { title: result.app.name } : {};
}

type Price = { id: string; months: number; amount: number; currency: string };

/** Kỳ hạn có giá/tháng thấp nhất (bỏ qua vĩnh viễn) và % tiết kiệm của từng kỳ so với giá 1 tháng. */
function priceInsights(prices: Price[]) {
  const monthly = prices.find((price) => price.months === 1);
  const periodic = prices.filter((price) => price.months > 0);
  const best = periodic.length > 1
    ? periodic.reduce((a, b) => (b.amount / b.months < a.amount / a.months ? b : a))
    : null;
  const savings = new Map<string, number>();
  if (monthly) {
    for (const price of periodic) {
      if (price.months <= 1) continue;
      const percent = Math.round((1 - price.amount / (monthly.amount * price.months)) * 100);
      if (percent > 0) savings.set(price.id, percent);
    }
  }
  return { bestId: best && best.months > 1 ? best.id : null, savings };
}

/**
 * Bảng giá công khai của một app: mỗi gói (tầng tính năng) có nhiều kỳ hạn (1/6/12 tháng, vĩnh viễn).
 * App desktop mở trang này khi người dùng bấm "Mua gói". Thanh toán dùng chung luồng đơn hàng + SePay với skill.
 */
export default async function AppPricingPage({ params }: Props) {
  const { slug } = await params;
  const [dict, result, session, tool] = await Promise.all([
    getDictionary(),
    loadApp(slug),
    auth(),
    toolQueries.findByAppSlug(slug),
  ]);
  if (!result) notFound();
  const { app, plans } = result;
  const t = dict.pricing;
  const entitlement = session?.user?.id ? await appsService.checkUserAppAccess(slug, session.user.id).catch(() => null) : null;
  const sub = entitlement?.subscription ?? null;
  const path = `/apps/${app.slug}/pricing`;
  const purchasable = plans.filter((plan) => plan.prices.length > 0);

  return (
    <section className="aurora border-b border-zinc-200">
      <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 -z-10" />
      <Container className="py-12 sm:py-16">
        <header className="mb-10 max-w-2xl animate-fade-up">
          {tool ? (
            <Link
              href={`/tools/${tool.slug}`}
              className="group mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-brand-700"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
              {trans(t.aboutProduct, { app: app.name })}
            </Link>
          ) : null}
          <div className="eyebrow">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {t.eyebrow}
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">
            <span className="text-gradient">{trans(t.title, { app: app.name })}</span>
          </h1>
          <p className="mt-3 text-zinc-600">{app.description ?? t.subtitle}</p>
          {app.description ? <p className="mt-1 text-sm text-zinc-500">{t.subtitle}</p> : null}
          {sub ? (
            <p className="mt-5 inline-flex rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
              {trans(t.current, { plan: sub.planName })} ·{" "}
              {sub.isLifetime
                ? t.lifetimeActive
                : trans(t.until, { date: sub.endsAt ? new Date(sub.endsAt).toLocaleDateString("vi-VN") : "—", days: String(sub.daysRemaining) })}
            </p>
          ) : !session?.user ? (
            <p className="mt-4 text-sm text-zinc-500">{t.signInHint}</p>
          ) : null}
        </header>

        {purchasable.length === 0 ? (
          <p className="text-zinc-500">{t.noPlans}</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {purchasable.map((plan, planIndex) => {
              const owned = entitlement?.subscription && plan.featureKeys.every((k) => entitlement.unlockedFeatures.includes(k));
              const { bestId, savings } = priceInsights(plan.prices);
              return (
                <section
                  key={plan.id}
                  className="card-lift animate-fade-up stagger flex flex-col rounded-3xl border-gradient p-6 shadow-lift sm:p-7"
                  style={{ "--d": `${120 + planIndex * 90}ms` } as React.CSSProperties}
                >
                  <h2 className="text-xl font-bold text-zinc-950">{plan.name}</h2>
                  {plan.description ? <p className="mt-1 text-sm text-zinc-500">{plan.description}</p> : null}
                  {plan.features && plan.features.length > 0 ? (
                    <ul className="mt-4 space-y-1.5 text-sm text-zinc-700">
                      {plan.features.map((feature) => (
                        <li key={feature.key} className="flex gap-2">
                          <span className="mt-0.5 inline-grid size-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="size-3" aria-hidden="true" />
                          </span>
                          <span>{feature.name}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <ul className="mt-6 flex flex-col gap-3">
                    {plan.prices.map((price) => {
                      const period = price.months === 0 ? t.lifetime : `${price.months} ${t.monthsUnit}`;
                      const title = `${app.name} · ${plan.name} · ${period}`;
                      const isBest = price.id === bestId;
                      const save = savings.get(price.id);
                      return (
                        <li
                          key={price.id}
                          className={`relative flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 ease-fluid hover:-translate-y-0.5 ${
                            isBest
                              ? "border-spark-300 bg-gradient-to-r from-spark-50 to-brand-50 shadow-[0_10px_30px_-16px_rgb(245_123_11/0.6)]"
                              : "border-zinc-200 bg-white hover:border-brand-200"
                          }`}
                        >
                          {isBest ? (
                            <span className="absolute -top-2.5 left-4 rounded-full bg-gradient-to-r from-spark-500 to-spark-400 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                              {t.bestValue}
                            </span>
                          ) : null}
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-900">
                              {period}
                              {save ? (
                                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                  {trans(t.save, { percent: String(save) })}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-base font-bold tabular-nums text-zinc-950">{formatMoney(price.amount, price.currency)}</p>
                            {price.months > 1 ? (
                              <p className="text-xs tabular-nums text-zinc-500">
                                {trans(t.perMonth, { amount: formatMoney(Math.round(price.amount / price.months), price.currency) })}
                              </p>
                            ) : null}
                          </div>
                          <div className="w-28">
                            <BuyNowButton
                              planPriceId={price.id}
                              skillSlug={app.slug}
                              skillTitle={title}
                              productPath={path}
                              label={owned ? t.extend : t.buy}
                              dict={dict}
                              variant="card"
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Container>
    </section>
  );
}
