import type { PaginatedResult, Pagination } from "@/src/domain/shared";

export type OrderStatus = "PENDING" | "PAID" | "EXPIRED" | "CANCELED" | "FAILED" | "REFUNDED";

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  skillId: string;
  skillTitle: string;
  skillSlug: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  expiresAt: Date;
  paidAt: Date | null;
  canceledAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderCommand {
  userId: string;
  skillId: string;
  amount: number;
  currency: string;
  expiresInMinutes?: number;
}

export interface OrderStatusChange {
  id: string;
  orderCode: string;
  status: OrderStatus;
  skillId: string;
  skillTitle: string;
  skillSlug: string;
  amount: number;
  currency: string;
  expiresAt: Date;
  paidAt: Date | null;
  canceledAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
}

export interface OrderRepository {
  create(data: CreateOrderCommand): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByOrderCode(orderCode: string): Promise<Order | null>;
  findValidPending(userId: string, skillId: string): Promise<Order | null>;
  listByUser(userId: string): Promise<Order[]>;
  listPendingExpired(before: Date): Promise<Order[]>;
  updateStatus(id: string, status: OrderStatus, extra?: { paidAt?: Date; canceledAt?: Date; refundedAt?: Date }): Promise<Order | null>;
  listForAdmin(filter: { q?: string; status?: OrderStatus }, pagination: Pagination): Promise<PaginatedResult<Order>>;
  countByStatus(): Promise<Record<OrderStatus, number>>;
  sumRevenue(): Promise<number>;
  listRevenueByMonth(months: number): Promise<{ month: string; total: number }[]>;
  listSalesBySkill(limit: number): Promise<{ skillId: string; title: string; slug: string; orders: number; revenue: number }[]>;
  listRecent(limit: number): Promise<Order[]>;
  sumViewsAndFavorites(): Promise<{ views: number; favorites: number }>;
}