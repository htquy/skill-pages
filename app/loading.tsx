export default function RootLoading() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-600" />
        <span className="text-sm text-zinc-500">Loading…</span>
      </div>
    </div>
  );
}