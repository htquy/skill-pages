/**
 * Quy tắc thời hạn gói (thuần, không phụ thuộc DB) để test được độc lập.
 *
 * - Kỳ hạn tính theo THÁNG LỊCH: mua 6 tháng ngày 31/08 hết hạn 28/02 (hoặc 29/02 năm nhuận),
 *   không phải "180 ngày".
 * - Gia hạn cùng gói khi còn hạn: kỳ mới bắt đầu ngay khi kỳ cũ kết thúc (cộng dồn, không mất ngày).
 * - months = 0 nghĩa là vĩnh viễn (endsAt = null).
 */
export const LIFETIME_MONTHS = 0;
export const MAX_PLAN_MONTHS = 120;

export function addCalendarMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export interface PeriodLike {
  planId: string;
  endsAt: Date | null;
}

/**
 * Tính kỳ mới khi mua `months` tháng của `planId`.
 * `existing` là các kỳ ACTIVE chưa hết hạn của cùng user + app (kể cả kỳ nối tiếp chưa bắt đầu).
 */
export function nextPeriod(
  existing: PeriodLike[],
  planId: string,
  months: number,
  now: Date,
): { startsAt: Date; endsAt: Date | null } {
  if (months === LIFETIME_MONTHS) return { startsAt: now, endsAt: null };
  const samePlan = existing.filter((p) => p.planId === planId && p.endsAt !== null && p.endsAt > now);
  const chainEnd = samePlan.reduce<Date | null>((max, p) => (max === null || p.endsAt! > max ? p.endsAt! : max), null);
  const startsAt = chainEnd ?? now;
  return { startsAt, endsAt: addCalendarMonths(startsAt, months) };
}

/** Số ngày còn lại làm tròn lên; null (vĩnh viễn) trả null. */
export function daysUntil(endsAt: Date | null, now: Date): number | null {
  if (endsAt === null) return null;
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000));
}

/** Nhãn kỳ hạn tiếng Việt: "1 tháng", "6 tháng", "12 tháng", "Vĩnh viễn". */
export function periodLabel(months: number): string {
  return months === LIFETIME_MONTHS ? "Vĩnh viễn" : `${months} tháng`;
}
