import type { OrderRepository } from "@/src/domain/orders";
import type { UserRepository } from "@/src/domain/identity/entities";

export interface StatisticsDeps {
  orders: OrderRepository;
  users: UserRepository;
  skills: { countAll(): Promise<number>; countPublished(): Promise<number> };
  articles: { countPublished(): Promise<number> };
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSkills: number;
  publishedSkills: number;
  totalArticles: number;
  paidOrders: number;
  totalOrders: number;
  conversionRate: number;
  revenue: number;
  skillViews: number;
  favorites: number;
  topSkills: { skillId: string; title: string; slug: string; orders: number; revenue: number }[];
  recentOrders: import("@/src/domain/orders").Order[];
  orderStatusCounts: Record<import("@/src/domain/orders").OrderStatus, number>;
}

export interface RevenueStatistics {
  byMonth: { month: string; total: number }[];
  total: number;
}

export interface SkillSalesStatistics {
  items: { skillId: string; title: string; slug: string; orders: number; revenue: number }[];
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  adminUsers: number;
  customerUsers: number;
}

export function createStatistics(deps: StatisticsDeps) {
  return {
    async getDashboardMetrics(): Promise<DashboardMetrics> {
      const [totalUsers, activeUsers, totalSkills, publishedSkills, totalArticles, byStatus, revenue, engagement, topSkills, recentOrders] =
        await Promise.all([
          deps.users.countTotal(),
          deps.users.countActive(),
          deps.skills.countAll(),
          deps.skills.countPublished(),
          deps.articles.countPublished(),
          deps.orders.countByStatus(),
          deps.orders.sumRevenue(),
          deps.orders.sumViewsAndFavorites(),
          deps.orders.listSalesBySkill(5),
          deps.orders.listRecent(5),
        ]);

      const totalOrders = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
      const paidOrders = byStatus.PAID;
      const conversionRate = totalOrders > 0 ? Math.round((paidOrders / totalOrders) * 1000) / 10 : 0;

      return {
        totalUsers,
        activeUsers,
        totalSkills,
        publishedSkills,
        totalArticles,
        paidOrders,
        totalOrders,
        conversionRate,
        revenue,
        skillViews: engagement.views,
        favorites: engagement.favorites,
        topSkills,
        recentOrders,
        orderStatusCounts: byStatus,
      };
    },

    async getRevenueStatistics(months = 12): Promise<RevenueStatistics> {
      const [byMonth, total] = await Promise.all([
        deps.orders.listRevenueByMonth(months),
        deps.orders.sumRevenue(),
      ]);
      return { byMonth, total };
    },

    async getSkillSalesStatistics(): Promise<SkillSalesStatistics> {
      const items = await deps.orders.listSalesBySkill(50);
      return { items };
    },

    async getUserStatistics(): Promise<UserStatistics> {
      const [totalUsers, activeUsers, blockedUsers, adminUsers, customerUsers] = await Promise.all([
        deps.users.countTotal(),
        deps.users.countActive(),
        deps.users.countByStatus("BLOCKED"),
        deps.users.countByRole("ADMIN"),
        deps.users.countByRole("CUSTOMER"),
      ]);
      return { totalUsers, activeUsers, blockedUsers, adminUsers, customerUsers };
    },
  };
}