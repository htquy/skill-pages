export type SkillAccessSource = "ORDER" | "ADMIN_GRANT" | "PROMOTION";

export interface SkillAccess {
  id: string;
  userId: string;
  skillId: string;
  orderId: string | null;
  source: SkillAccessSource;
  grantedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillAccessView {
  skillId: string;
  skillSlug: string;
  skillTitle: string;
  source: SkillAccessSource;
  grantedAt: Date;
  revokedAt: Date | null;
  orderCode: string | null;
}

export interface SkillAccessRepository {
  findActive(userId: string, skillId: string): Promise<SkillAccess | null>;
  listActiveByUser(userId: string): Promise<SkillAccessView[]>;
  listActiveByUserFetch(userId: string): Promise<SkillAccess[]>;
  grant(input: {
    userId: string;
    skillId: string;
    source: SkillAccessSource;
    orderId?: string | null;
  }): Promise<SkillAccess>;
  revoke(userId: string, skillId: string): Promise<void>;
  listByUserForAdmin(userId: string): Promise<SkillAccessView[]>;
}

export interface AccessService {
  hasActiveAccess(userId: string, skillId: string): Promise<boolean>;
}