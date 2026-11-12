import { SearchX } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-200 px-6 py-16 text-center bg-brand-50/60">
      <span className="inline-grid size-14 place-items-center rounded-2xl bg-surface text-brand-400 shadow-lift ring-1 ring-brand-100">
        <SearchX className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}