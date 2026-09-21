"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  Trophy,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Dict } from "@/src/lib/i18n/config";

function adminNavItems(dict: Dict) {
  return [
    { href: "/admin", label: dict.admin.nav.dashboard, icon: LayoutDashboard },
    { href: "/admin/users", label: dict.admin.nav.users, icon: Users },
    { href: "/admin/articles", label: dict.admin.nav.articles, icon: FileText },
    { href: "/admin/skills", label: dict.admin.nav.skills, icon: BookOpen },
    { href: "/admin/rankings", label: dict.admin.nav.rankings, icon: Trophy },
    { href: "/admin/orders", label: dict.admin.nav.orders, icon: ShoppingCart },
    { href: "/admin/statistics", label: dict.admin.nav.statistics, icon: BarChart3 },
  ];
}

export function AdminSidebar({ dict }: { dict: Dict }) {
  const pathname = usePathname();
  const items = adminNavItems(dict);

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] shrink-0 border-r border-zinc-200 bg-white">
      <nav aria-label={dict.admin.nav.aria} className="w-60 px-3 py-6">
        <ul className="space-y-1">
          {items.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      isActive ? "text-indigo-600" : "text-zinc-400",
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}