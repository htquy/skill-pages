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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-16 text-center">
      <SearchX className="size-10 text-zinc-300" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}