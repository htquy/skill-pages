"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { trans, type Dict, type Locale } from "@/src/lib/i18n/config";
import { publicNav } from "@/src/lib/site";
import { NavLink } from "@/src/presentation/components/layout/nav-link";
import { LocaleSwitcher } from "@/src/presentation/components/layout/locale-switcher";

const labels: Record<string, keyof Dict["nav"]> = {
  "/": "home",
  "/tools": "tools",
  "/skills": "skills",
  "/news": "aiNews",
  "/rankings": "rankings",
};

export function MobileNavigation({ dict, locale }: { dict: Dict; locale: Locale }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    // Khoá cuộn nền khi menu mở để thao tác trên điện thoại không kéo trang phía sau.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-navigation-panel"
        aria-label={open ? dict.siteHeader.closeMenu : dict.siteHeader.openMenu}
        className="inline-flex size-11 items-center justify-center rounded-lg text-zinc-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>

      {open ? (
        <>
          {/* Lớp phủ: chạm ra ngoài để đóng menu. */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-30 bg-zinc-900/30"
          />
          <nav
            id="mobile-navigation-panel"
            aria-label="Mobile"
            // Đóng menu khi chọn một liên kết (kể cả khi điều hướng tới đúng trang hiện tại).
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setOpen(false);
            }}
            className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-b border-zinc-200 bg-white shadow-lg"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {publicNav.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={dict.nav[labels[item.href] ?? "home"]}
                  className="flex min-h-11 items-center px-2 text-base"
                />
              ))}
              <Link
                href="/search"
                className="flex min-h-11 items-center gap-2 rounded-md px-2 text-base font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                <Search className="size-4 text-zinc-400" aria-hidden="true" />
                {dict.nav.search}
              </Link>
              <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-3 sm:hidden">
                <span className="text-sm text-zinc-500">{trans(dict.locale.switchLanguage)}</span>
                <LocaleSwitcher locale={locale} dict={dict} />
              </div>
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
