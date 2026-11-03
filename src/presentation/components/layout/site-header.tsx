import { Suspense } from "react";
import Link from "next/link";
import Form from "next/form";
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
    <Form action="/search" role="search" className="hidden md:block">
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
          className="w-44 rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 transition-[width,border-color,box-shadow] duration-500 ease-fluid focus:w-56 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 lg:w-56 lg:focus:w-64"
        />
      </div>
    </Form>
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
      className="rounded-lg p-1.5 text-zinc-700 transition-colors hover:bg-brand-50 hover:text-brand-700 sm:p-2 md:hidden"
    >
      <Search className="size-5" aria-hidden="true" />
    </Link>
  );
}

export async function SiteHeader() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/75 backdrop-blur-xl backdrop-saturate-150">
      {/* Đường sáng gradient dưới header. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent"
      />
      <Container className="flex h-16 items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <Logo />
        </div>

        <MainNavigation className="hidden lg:block" />

        <div className="flex items-center gap-1.5 sm:gap-3">
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