import { ForbiddenError, UnauthorizedError } from "@/src/domain/errors";
import type { CurrentUser } from "@/src/domain/identity/entities";
import type { OAuthService } from "./oauth-service";

/** A supplied bearer token must be valid and scoped; never silently use a different session identity. */
export function createApiUserResolver(deps: {
  tokenUser: OAuthService["getUserByAccessToken"];
  sessionUser: () => Promise<CurrentUser>;
}) {
  return async (
    authorization: string | null,
    requiredScope: string,
  ): Promise<CurrentUser> => {
    if (authorization === null) return deps.sessionUser();
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) throw new UnauthorizedError("A valid bearer token is required");
    let user: Awaited<ReturnType<OAuthService["getUserByAccessToken"]>>;
    try {
      user = await deps.tokenUser(match[1]);
    } catch {
      throw new UnauthorizedError("Invalid or expired access token");
    }
    if (user.status !== "ACTIVE")
      throw new ForbiddenError("Your account has been blocked");
    if (!user.scopes.includes(requiredScope))
      throw new ForbiddenError("Sign in again to grant " + requiredScope);
    if (user.role !== "ADMIN" && user.role !== "CUSTOMER")
      throw new ForbiddenError("Unsupported account role");
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      status: "ACTIVE",
      lastLoginAt: null,
    };
  };
}
