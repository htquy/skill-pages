"use client";

import { Fragment, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Form from "next/form";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

/**
 * Form lọc dùng cho mọi danh sách (skills, tools, news, rankings, admin…).
 *
 * `next/form` tự động chuyển submit GET thành điều hướng client-side nên trang
 * không bị tải lại; chỉ vùng danh sách bên dưới `<Suspense>` được render lại.
 *
 * `resetKey` là chuỗi đại diện cho bộ lọc hiện tại: khi URL đổi (submit, clear,
 * back/forward) React remount các field nên `defaultValue` luôn khớp URL.
 */
export function FilterForm({
  action,
  resetKey,
  className,
  children,
}: {
  action: string;
  resetKey?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Form action={action} scroll={false} className={className}>
      <Fragment key={resetKey}>{children}</Fragment>
    </Form>
  );
}

/**
 * Nút submit của `FilterForm`; hiển thị spinner khi điều hướng đang chạy nhờ
 * `useFormStatus`. Phải nằm trong cây con của `FilterForm`.
 */
export function FilterSubmitButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "btn-primary text-sm",
        className,
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {label}
    </button>
  );
}

/** Liên kết xoá lọc, đi kèm `FilterSubmitButton` cho đồng bộ giao diện. */
export function FilterClearLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900"
    >
      {label}
    </Link>
  );
}
