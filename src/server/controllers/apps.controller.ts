import { NextResponse } from "next/server";
import crypto from "crypto";
import { appsService, oauthService } from "@/src/infrastructure/composition";
import { auth } from "@/src/infrastructure/authentication/auth";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { isAppError } from "@/src/domain/errors";
import { getServerApiSecret } from "@/src/lib/env";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function getErrorStatus(error: unknown, fallback: number = 400): number {
  if (isAppError(error)) return error.status;
  return fallback;
}

/**
 * Xác thực server-to-server: chỉ chấp nhận `userId` khi request kèm secret dùng chung
 * (header `x-internal-secret` hoặc query `?secret=`). Không cấu hình secret => tắt đường này.
 */
function isTrustedServerCall(request: Request): boolean {
  const expected = getServerApiSecret();
  if (!expected) return false;
  const url = new URL(request.url);
  const provided = request.headers.get("x-internal-secret") ?? url.searchParams.get("secret");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function resolveUser(request: Request): Promise<{ id: string; email: string | null; name: string | null } | null> {
  // 1. Bearer token từ luồng OAuth2 PKCE (app/tool bên ngoài).
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    try {
      const user = await oauthService.getUserByAccessToken(token);
      return { id: user.id, email: user.email, name: user.name };
    } catch {
      // Token sai/hết hạn -> thử các cách xác thực khác.
    }
  }

  // 2. Session cookie (web app dùng chung domain).
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    };
  }

  // 3. Server-to-server: bắt buộc secret dùng chung, không tin userId trần từ client.
  const queryUserId = new URL(request.url).searchParams.get("userId");
  if (queryUserId && isTrustedServerCall(request)) {
    return { id: queryUserId, email: null, name: null };
  }

  return null;
}

export const appCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-internal-secret",
} as const;

export class AppsController {
  static handleOptions(): NextResponse {
    return new NextResponse(null, {
      status: 204,
      headers: appCorsHeaders,
    });
  }
  /**
   * GET /api/apps
   * List all active applications with pricing options
   */
  static async listApps(): Promise<NextResponse> {
    try {
      const apps = await appsService.listActiveApps();
      return NextResponse.json({ data: apps }, { headers: appCorsHeaders });
    } catch (error: unknown) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500, headers: appCorsHeaders });
    }
  }

  /**
   * GET /api/apps/[slug]
   * Get app details and available plans
   */
  static async getApp(slug: string): Promise<NextResponse> {
    try {
      const result = await appsService.getApp(slug);
      return NextResponse.json({ data: result }, { headers: appCorsHeaders });
    } catch (error: unknown) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 404, headers: appCorsHeaders });
    }
  }

  /**
   * GET /api/apps/[slug]/menus
   * Get dynamic menus tailored to user's subscription and permission tier
   */
  static async getAppMenus(request: Request, slug: string): Promise<NextResponse> {
    try {
      const user = await resolveUser(request);
      const menus = await appsService.getAppMenusForUser(slug, user ? user.id : null);

      return NextResponse.json(
        {
          data: {
            appSlug: slug,
            userId: user?.id ?? null,
            isAuthenticated: !!user,
            menus,
          },
        },
        { headers: appCorsHeaders },
      );
    } catch (error: unknown) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 404, headers: appCorsHeaders });
    }
  }

  /**
   * GET /api/apps/[slug]/check-access (or /entitlement)
   * Main verification API for external apps/tools:
   * Checks whether the user is paid, active subscription, days remaining, unlocked features & menus.
   * Optional query ?feature=KEY to check a specific feature directly.
   */
  static async checkAccess(request: Request, slug: string): Promise<NextResponse> {
    try {
      const user = await resolveUser(request);
      if (!user) {
        return NextResponse.json(
          {
            isPaid: false,
            hasActiveSubscription: false,
            hasFeature: false,
            error: "UNAUTHENTICATED",
            message: "User must be authenticated via Bearer token, session cookie, or userId query parameter",
          },
          { status: 401, headers: appCorsHeaders },
        );
      }

      const entitlement = await appsService.checkUserAppAccess(slug, user.id);
      const menus = await appsService.getAppMenusForUser(slug, user.id);

      const url = new URL(request.url);
      const queryFeature = url.searchParams.get("feature");
      const hasSpecificFeature = queryFeature
        ? entitlement.unlockedFeatures.includes(queryFeature)
        : undefined;

      return NextResponse.json(
        {
          success: true,
          data: {
            ...entitlement,
            hasFeature: queryFeature ? hasSpecificFeature : undefined,
            checkedFeature: queryFeature ?? null,
            menus,
          },
        },
        { headers: appCorsHeaders },
      );
    } catch (error: unknown) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 400, headers: appCorsHeaders });
    }
  }

  /**
   * POST /api/admin/apps
   * Admin: Create new application
   */
  static async adminCreateApp(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = await request.json();
      const created = await appsService.adminCreateApp(body);
      return NextResponse.json({ data: created }, { status: 201 });
    } catch (error: unknown) {
      const status = getErrorStatus(error, 400);
      return NextResponse.json({ error: getErrorMessage(error) }, { status });
    }
  }

  /**
   * POST /api/admin/apps/[slug]/plans
   * Admin: Add pricing plan (1 month, 3 months, 1 year, lifetime...)
   */
  static async adminCreatePlan(request: Request, slug: string): Promise<NextResponse> {
    try {
      await requireAdmin();
      const { app } = await appsService.getApp(slug);
      const body = await request.json();
      const plan = await appsService.adminCreatePlan({
        ...body,
        appId: app.id,
      });
      return NextResponse.json({ data: plan }, { status: 201 });
    } catch (error: unknown) {
      const status = getErrorStatus(error, 400);
      return NextResponse.json({ error: getErrorMessage(error) }, { status });
    }
  }

  /**
   * POST /api/admin/apps/[slug]/menus
   * Admin: Add menu item
   */
  static async adminCreateMenuItem(request: Request, slug: string): Promise<NextResponse> {
    try {
      await requireAdmin();
      const { app } = await appsService.getApp(slug);
      const body = await request.json();
      const item = await appsService.adminCreateMenuItem({
        ...body,
        appId: app.id,
      });
      return NextResponse.json({ data: item }, { status: 201 });
    } catch (error: unknown) {
      const status = getErrorStatus(error, 400);
      return NextResponse.json({ error: getErrorMessage(error) }, { status });
    }
  }

  /**
   * POST /api/admin/apps/[slug]/grant
   * Admin: Grant/extend subscription for a user
   */
  static async adminGrantSubscription(request: Request, slug: string): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = await request.json();
      const { userId, planId, durationDays } = body;
      const sub = await appsService.adminGrantSubscription({
        userId,
        appSlug: slug,
        planId,
        durationDays,
      });
      return NextResponse.json({ data: sub }, { status: 200 });
    } catch (error: unknown) {
      const status = getErrorStatus(error, 400);
      return NextResponse.json({ error: getErrorMessage(error) }, { status });
    }
  }
}
