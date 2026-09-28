import { isRichText, sanitizeRichText, toPlainText } from "@/src/lib/rich-text";
import { cn } from "@/src/lib/utils";

type Props = {
  html: string | null | undefined;
  className?: string;
  /** Dùng khi nội dung cũ vẫn là plain text (mọi bài trước khi chuyển sang rich text). */
  fallbackClassName?: string;
};

/**
 * Render nội dung rich text đã sanitize.
 * Nội dung cũ dạng text thuần vẫn hiển thị đúng nhờ nhánh fallback.
 */
export function RichText({ html, className, fallbackClassName }: Props) {
  if (!html) return null;

  if (!isRichText(html)) {
    return (
      <div className={cn("whitespace-pre-wrap text-base leading-relaxed text-zinc-700", fallbackClassName, className)}>
        {html}
      </div>
    );
  }

  const safeHtml = sanitizeRichText(html);
  if (!safeHtml) {
    return (
      <div className={cn("whitespace-pre-wrap text-base leading-relaxed text-zinc-700", fallbackClassName, className)}>
        {toPlainText(html)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "text-base leading-relaxed text-zinc-700",
        "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-zinc-900",
        "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-zinc-900",
        "[&_h4]:mt-4 [&_h4]:mb-1.5 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-zinc-900",
        "[&_p]:my-3",
        "[&_a]:font-medium [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-700",
        "[&_strong]:font-semibold [&_strong]:text-zinc-900",
        "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
        "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
        "[&_li]:pl-1",
        "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-violet-200 [&_blockquote]:bg-violet-50/50 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:text-zinc-600",
        "[&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-zinc-800",
        "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-zinc-900 [&_pre]:p-4 [&_pre]:text-zinc-100",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-sm [&_pre_code]:text-zinc-100",
        "[&_hr]:my-6 [&_hr]:border-zinc-200",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
