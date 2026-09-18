"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { navItems } from "@/src/lib/site";
import { NavLink } from "@/src/presentation/components/layout/nav-link";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-700 hover:bg-zinc-100"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>

      {open ? (
        <nav
          aria-label="Mobile"
          className="absolute inset-x-0 top-full border-b border-zinc-200 bg-white shadow-sm"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {navItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} className="px-2 py-2.5 text-base" />
            ))}
            <Link
              href="/search"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2 py-2.5 text-base font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <Search className="size-4 text-zinc-400" aria-hidden="true" />
              Search
            </Link>
          </div>
        </nav>
      ) : null}
    </div>
  );
}