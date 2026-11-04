import { cn } from "@/src/lib/utils";

/**
 * Tiêu đề chung cho các trang danh sách (Công cụ, Xếp hạng, Tin tức, Tìm kiếm):
 * nhãn eyebrow, H1 và mô tả, phía sau là một quầng màu iris mờ.
 */
export function PageHeader({
  eyebrow,
  icon,
  title,
  subtitle,
  className,
}: {
  eyebrow?: string;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate mb-8 animate-fade-up", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-16 -z-10 hidden h-48 sm:block w-[28rem] max-w-full rounded-full bg-gradient-to-r from-brand-200/50 via-violet-200/40 to-spark-100/40 blur-3xl"
      />
      {eyebrow ? (
        <div className="eyebrow">
          {icon}
          {eyebrow}
        </div>
      ) : null}
      <h1
        className={cn(
          "text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]",
          eyebrow ? "mt-3" : null,
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 max-w-2xl text-lg text-zinc-600 [text-wrap:pretty]">{subtitle}</p>
      ) : null}
    </div>
  );
}
