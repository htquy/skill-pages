import { cn } from "@/src/lib/utils";

/**
 * Khối skeleton nền (shimmer), luôn `aria-hidden` vì không mang thông tin.
 * Kích thước phải truyền qua `className` để khớp 1:1 với nội dung thật.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton block", className)} />;
}

/** Bọc vùng skeleton: nhãn i18n cho screen reader, phần thị giác bị ẩn a11y. */
export function SkeletonStatus({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {label}
      </p>
      <div aria-hidden="true">{children}</div>
    </>
  );
}
