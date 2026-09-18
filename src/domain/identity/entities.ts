export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
}

export interface AuthenticatedContext {
  user: CurrentUser;
}

export interface EngagementRepository {
  isFavorite(userId: string, skillId: string): Promise<boolean>;
  addFavorite(userId: string, skillId: string): Promise<void>;
  removeFavorite(userId: string, skillId: string): Promise<void>;
  listFavoriteSkillIds(userId: string): Promise<string[]>;
  recordSkillView(skillId: string, opts: { userId: string | null; sessionHash: string | null }): Promise<void>;
}