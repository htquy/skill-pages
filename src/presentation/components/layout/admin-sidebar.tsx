"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  Trophy,
  Wrench,
  ShoppingCart,
  Boxes,
  Webhook,
  BarChart3,
  Bot,
  PackageOpen,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { Dict } from "@/src/lib/i18n/config";

/**
 * Menu chia nhóm theo luồng nghiệp vụ. "Công cụ" là trang giới thiệu công khai (catalog),
 * "Ứng dụng & gói" là sản phẩm bán thật (gói, giá, quyền) — hai mục liên kết qua Tool.appSlug.
 */
function adminNavGroups(dict: Dict) {
  const nav = dict.admin.nav;
  return [
    {
      label: null,
      items: [{ href: "/admin", label: nav.dashboard, icon: LayoutDashboard }],
    },
    {
      label: nav.groupContent,
      items: [
        { href: "/admin/articles", label: nav.articles, icon: FileText },
        { href: "/admin/skills", label: nav.skills, icon: BookOpen },
        { href: "/admin/rankings", label: nav.rankings, icon: Trophy },
      ],
    },
    {
      label: nav.groupProducts,
      items: [
        { href: "/admin/tools", label: nav.tools, icon: Wrench },
        { href: "/admin/apps", label: nav.apps, icon: Boxes },
        { href: "/admin/app-releases", label: nav.appReleases, icon: PackageOpen },
        { href: "/admin/orders", label: nav.orders, icon: ShoppingCart },
      ],
    },
    {
      label: nav.groupSystem,
      items: [
        { href: "/admin/users", label: nav.users, icon: Users },
        { href: "/admin/ai-gateway", label: nav.aiGateway, icon: Bot },
        { href: "/admin/webhook-events", label: nav.webhookEvents, icon: Webhook },
        { href: "/admin/statistics", label: nav.statistics, icon: BarChart3 },
      ],
    },
  ];
}

export function AdminSidebar({ dict }: { dict: Dict }) {
  const pathname = usePathname();
  const groups = adminNavGroups(dict);
  const isItemActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      {/* Điện thoại / máy tính bảng: thanh menu cuộn ngang, dính ngay dưới header. */}
      <nav
        aria-label={dict.admin.nav.aria}
        className="sticky top-16 z-20 border-b border-zinc-200 bg-white lg:hidden"
      >
        <ul className="flex gap-1 overflow-x-auto overscroll-x-contain px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups
            .flatMap((group) => group.items)
            .map((item) => {
              const isActive = isItemActive(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                    )}
                  >
                    <Icon
                      className={cn("size-4", isActive ? "text-brand-600" : "text-zinc-400")}
                      aria-hidden="true"
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      {/* Máy tính: sidebar dọc. */}
      <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 border-r border-zinc-200 bg-white lg:block">
        <nav aria-label={dict.admin.nav.aria} className="h-full w-60 overflow-y-auto px-3 py-6">
          <div className="space-y-5">
            {groups.map((group, index) => (
              <div key={group.label ?? index}>
                {group.label ? (
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    {group.label}
                  </p>
                ) : null}
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = isItemActive(item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-brand-50 text-brand-700"
                              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                          )}
                        >
                          <Icon
                            className={cn("size-4", isActive ? "text-brand-600" : "text-zinc-400")}
                            aria-hidden="true"
                          />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
