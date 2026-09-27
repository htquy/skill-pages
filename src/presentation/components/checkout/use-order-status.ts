"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELED" | "FAILED" | "REFUNDED";

export interface OrderStatusSnapshot {
  status: OrderStatus;
  unlocked: boolean;
}

const TERMINAL_STATUSES: OrderStatus[] = ["PAID", "EXPIRED", "CANCELED", "FAILED", "REFUNDED"];

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Hỏi trạng thái đơn định kỳ để đóng modal ngay khi webhook SePay báo thành công.
 *
 * Chỉ dùng `fetch` + `setInterval` thay vì SWR/React Query vì đây là một luồng
 * đơn lẻ, không có shared cache, và dự án không dùng thư viện polling nào.
 */
export function useOrderStatusPolling(orderId: string | null, intervalMs = 4000) {
  const [snapshot, setSnapshot] = useState<OrderStatusSnapshot | null>(null);
  const [checking, setChecking] = useState(false);
  const inFlight = useRef(false);
  /** Đơn đã kết thúc thì dừng hẳn việc poll để không gọi vô ích. */
  const stopped = useRef(false);

  const check = useCallback(async () => {
    if (!orderId || inFlight.current) return null;
    inFlight.current = true;
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
      if (!response.ok) return null;
      const body = (await response.json()) as OrderStatusSnapshot;
      setSnapshot(body);
      stopped.current = isTerminalStatus(body.status);
      return body;
    } catch {
      return null;
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }, [orderId]);

  const checkNow = useCallback(() => {
    setChecking(true);
    return check();
  }, [check]);

  useEffect(() => {
    setSnapshot(null);
    stopped.current = false;
    if (!orderId) return;

    // Lần kiểm tra đầu chạy trong timer nên không setState ngay khi effect chạy.
    const timer = setInterval(() => {
      if (stopped.current) return;
      void check();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [check, orderId, intervalMs]);

  return { snapshot, checking, checkNow };
}
