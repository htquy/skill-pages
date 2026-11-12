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
        "whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors xl:px-3",
        isActive
          ? "text-zinc-900"
          : "text-zinc-600 hover:bg-brand-50/70 hover:text-brand-700",
        className,
      )}
    >
      {/* Bar nằm ngoài luồng và luôn được render nên đổi trạng thái không làm nhảy layout. */}
      <span className="relative inline-block">
        {label}
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 -bottom-[3px] h-0.5 origin-left rounded-full transition-transform duration-500 ease-fluid bg-brand-500",
            isActive ? "scale-x-100" : "scale-x-0",
          )}
        />
      </span>
    </Link>
  );
}