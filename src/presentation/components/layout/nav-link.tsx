"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";

export function NavLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "text-zinc-900"
          : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100",
        className,
      )}
    >
      {label}
      {isActive ? (
        <span
          className="mt-0.5 block h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );
}