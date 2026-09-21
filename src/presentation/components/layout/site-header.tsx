import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Container } from "@/src/presentation/components/layout/container";
import { Logo } from "@/src/presentation/components/layout/logo";
import { MainNavigation } from "@/src/presentation/components/layout/main-navigation";
import { MobileNavigation } from "@/src/presentation/components/layout/mobile-navigation";
import { AccountMenuServer } from "@/src/presentation/components/layout/account-menu-server";
import { LocaleSwitcher } from "@/src/presentation/components/layout/locale-switcher";
import { getDictionary, getLocale } from "@/src/lib/i18n";

function HeaderSearch({ dict }: { dict: Awaited<ReturnType<typeof getDictionary>> }) {
  return (
    <form action="/search" role="search" className="hidden md:block">
      <label htmlFor="header-search" className="sr-only">
        {dict.siteHeader.searchSkills}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <input
          id="header-search"
          name="q"
          type="search"
          placeholder={dict.siteHeader.searchPlaceholder}
          className="w-44 rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 lg:w-56"
        />
      </div>
    </form>
  );
}

function AccountFallback() {
  return <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-100" aria-hidden="true" />;
}

function MobileSearchLink({ dict }: { dict: Awaited<ReturnType<typeof getDictionary>> }) {
  return (
    <Link
      href="/search?q="
      aria-label={dict.siteHeader.searchSkills}
      className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100 md:hidden"
    >
      <Search className="size-5" aria-hidden="true" />
    </Link>
  );
}

export async function SiteHeader() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Logo />
        </div>

        <MainNavigation className="hidden lg:block" />

        <div className="flex items-center gap-3">
          <HeaderSearch dict={dict} />
          <MobileSearchLink dict={dict} />
          <Suspense fallback={<AccountFallback />}>
            <AccountMenuServer />
          </Suspense>
          <LocaleSwitcher locale={locale} dict={dict} />
          <MobileNavigation dict={dict} />
        </div>
      </Container>
    </header>
  );
}