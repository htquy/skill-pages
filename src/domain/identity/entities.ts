import type { PaginatedResult, Pagination } from "@/src/domain/shared";

export type UserRole = "CUSTOMER" | "ADMIN";
export type UserStatus = "ACTIVE" | "BLOCKED";

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
}

export interface AuthenticatedContext {
  user: CurrentUser;
}

export interface UserRecord {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminUserView extends UserRecord {
  orderCount: number;
  paidAmount: number;
  accessCount: number;
}

export interface UserFilters {
  q?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  updateLastLoginAt(id: string, at: Date): Promise<void>;
  listForAdmin(filters: UserFilters, pagination: Pagination): Promise<PaginatedResult<AdminUserView>>;
  setRole(id: string, role: UserRole): Promise<void>;
  setStatus(id: string, status: UserStatus): Promise<void>;
  countTotal(): Promise<number>;
  countActive(): Promise<number>;
  countByRole(role: UserRole): Promise<number>;
  countByStatus(status: UserStatus): Promise<number>;
}

export interface EngagementRepository {
  isFavorite(userId: string, skillId: string): Promise<boolean>;
  addFavorite(userId: string, skillId: string): Promise<void>;
  removeFavorite(userId: string, skillId: string): Promise<void>;
  listFavoriteSkillIds(userId: string): Promise<string[]>;
  recordSkillView(skillId: string, opts: { userId: string | null; sessionHash: string | null }): Promise<void>;
}