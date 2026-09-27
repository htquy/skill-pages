import { CopyButton } from "@/src/presentation/components/shared/copy-button";
import type { Dict } from "@/src/lib/i18n/config";
import { cn } from "@/src/lib/utils";

export interface BankTransferDetails {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amountLabel: string;
  orderCode: string;
  /** Ảnh QR dựng sẵn ở server (data URL), không phụ thuộc CDN của ngân hàng. */
  qrImage: string;
}

function BankRow({ label, value, dict }: { label: string; value: string; dict: Dict }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2 last:border-b-0">
      <span className="shrink-0 text-sm text-zinc-500">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium text-zinc-900">{value}</span>
        <CopyButton text={value} dict={dict} />
      </span>
    </div>
  );
}

/**
 * Hiển thị QR + thông tin chuyển khoản ngân hàng.
 *
 * Nội dung chuyển khoản phải giữ nguyên `orderCode` — webhook đối chiếu đúng
 * chuỗi này nên khi sao chép không được thêm bớt ký tự nào.
 */
export function QrPaymentPanel({
  details,
  dict,
  className,
}: {
  details: BankTransferDetails;
  dict: Dict;
  className?: string;
}) {
  const { qr } = dict.checkout;

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {details.qrImage ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={details.qrImage}
          alt={qr.alt}
          width={320}
          height={320}
          className="mx-auto aspect-square w-full max-w-64 rounded-xl border border-zinc-200 bg-white p-2 object-contain shadow-sm"
        />
      ) : (
        <div className="mx-auto flex aspect-square w-full max-w-64 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-400">
          {qr.alt}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3">
        <BankRow label={qr.bank} value={details.bankName} dict={dict} />
        <BankRow label={qr.accountNumber} value={details.accountNumber} dict={dict} />
        <BankRow label={qr.accountHolder} value={details.accountHolder} dict={dict} />
        <BankRow label={qr.amount} value={details.amountLabel} dict={dict} />
        <BankRow label={qr.content} value={details.orderCode} dict={dict} />
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">{qr.hint}</p>
    </div>
  );
}
