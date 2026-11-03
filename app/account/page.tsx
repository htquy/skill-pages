export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { Bookmark, Shield, ArrowRight, Package } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { requireUser } from "@/src/infrastructure/authentication/authorization";
import { getDictionary, trans } from "@/src/lib/i18n";
import { appsService } from "@/src/infrastructure/composition";
import { formatDate } from "@/src/lib/utils";

/** Gói đang hiệu lực của user trên từng app, hỏi qua facade check-access (không tự kiểm tra subscription). */
async function loadSubscriptions(userId: string) {
  const apps = await appsService.listActiveApps();
  const entitlements = await Promise.all(
    apps.map((app) => appsService.checkUserAppAccess(app.slug, userId).catch(() => null)),
  );
  return entitlements.flatMap((entitlement) =>
    entitlement?.subscription ? [{ app: entitlement.app, subscription: entitlement.subscription }] : [],
  );
}

export default async function AccountPage() {
  const user = await requireUser();
  const [dict, subscriptions] = await Promise.all([getDictionary(), loadSubscriptions(user.id)]);

  return (
    <Container className="max-w-3xl py-12 md:py-16">
      <div className="flex flex-col items-center text-center">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? dict.account.yourAvatar}
            width={80}
            height={80}
            className="size-20 rounded-full border-4 border-white shadow-md ring-1 ring-zinc-200"
          />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-violet-600 text-2xl font-bold text-white shadow-md">
            {(user.name ?? user.email ?? "U").slice(0, 2).toUpperCase()}
          </span>
        )}
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-zinc-900">
          {user.name ?? dict.account.yourAccount}
        </h1>
        <p className="mt-1 text-zinc-500">{user.email}</p>
        {user.role === "ADMIN" ? (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            <Shield className="size-3.5" aria-hidden="true" />
            {dict.account.admin}
          </span>
        ) : null}
      </div>

      <section className="mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 border-b border-zinc-100 px-6 py-5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Package className="size-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block font-medium text-zinc-900">{dict.account.subscriptions}</span>
            <span className="block text-sm text-zinc-500">{dict.account.subscriptionsSubtitle}</span>
          </span>
        </div>
        {subscriptions.length > 0 ? (
          <ul>
            {subscriptions.map(({ app, subscription }) => (
              <li key={app.id} className="border-b border-zinc-100 last:border-0">
                <Link
                  href={`/apps/${app.slug}/pricing`}
                  className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-50"
                >
                  <span className="flex-1">
                    <span className="block font-medium text-zinc-900">
                      {app.name} · {subscription.planName}
                    </span>
                    <span className="block text-sm text-zinc-500">
                      {subscription.isLifetime || !subscription.endsAt
                        ? dict.account.lifetime
                        : trans(dict.account.until, {
                            date: formatDate(subscription.endsAt),
                            days: subscription.daysRemaining,
                          })}
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 text-sm text-zinc-500">
            <span>{dict.account.noSubscriptions}</span>
            <Link href="/tools" className="font-medium text-brand-700 hover:underline">
              {dict.account.browseTools}
            </Link>
          </div>
        )}
      </section>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <Link
          href="/account/saved"
          className="group flex items-center gap-4 border-b border-zinc-100 px-6 py-5 transition-colors hover:bg-zinc-50"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Bookmark className="size-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block font-medium text-zinc-900">{dict.account.savedSkills}</span>
            <span className="block text-sm text-zinc-500">
              {dict.account.saveSubtitle}
            </span>
          </span>
          <ArrowRight className="size-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>

        <div className="flex items-center gap-4 px-6 py-5">
          <span className="flex size-11 items-center justify-center rounded-xl bg-zinc-50 text-zinc-500">
            <Shield className="size-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block font-medium text-zinc-900">{dict.account.privacy}</span>
            <span className="block text-sm text-zinc-500">
              {dict.account.privacySubtitle}
            </span>
          </span>
        </div>
      </div>
    </Container>
  );
}