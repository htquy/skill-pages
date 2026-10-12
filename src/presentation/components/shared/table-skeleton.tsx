import { Skeleton } from "@/src/presentation/components/shared/skeleton";

/**
 * Placeholder cho các bảng danh sách admin. Dùng làm fallback của `<Suspense>`
 * để khi lọc chỉ vùng bảng tải lại, không phải cả trang.
 */
export function TableSkeleton({
  rows = 6,
  columns = 5,
  label,
}: {
  rows?: number;
  columns?: number;
  label: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="divide-y divide-zinc-100">
        <div className="flex gap-4 bg-zinc-50 px-5 py-3">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-4 flex-1 rounded" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((_, column) => (
              <Skeleton key={column} className="h-4 flex-1 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
