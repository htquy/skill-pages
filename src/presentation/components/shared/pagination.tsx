import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/utils";

export interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
}

export function buildPaginationHref(
  path: string,
  params: URLSearchParams,
  page: number,
): string {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  const query = next.toString();
  return query ? `${path}?${query}` : path;
}

export function Pagination({
  info,
  path,
  params,
}: {
  info: PaginationInfo;
  path: string;
  params: URLSearchParams;
}) {
  if (info.totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-between gap-4"
    >
      {info.page > 1 ? (
        <Link
          href={buildPaginationHref(path, params, info.page - 1)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50",
          )}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      <p className="text-sm text-zinc-500" aria-live="polite">
        Page {info.page} of {info.totalPages} · {info.total} results
      </p>

      {info.page < info.totalPages ? (
        <Link
          href={buildPaginationHref(path, params, info.page + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50"
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}