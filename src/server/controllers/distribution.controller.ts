import { NextResponse } from "next/server";
import { z } from "zod";
import { distributionService } from "@/src/infrastructure/composition";
import crypto from "crypto";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { isAppError, ForbiddenError, UnauthorizedError } from "@/src/domain/errors";
import { getReleaseCiToken } from "@/src/lib/env";
import { Prisma } from "@prisma/client";

const version = z.string().regex(/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/);
const key = z.string().regex(/^[a-z][a-z0-9-]{0,79}$/);
const sourceSchema = z.object({
  key, name: z.string().trim().min(1).max(200), version,
  kind: z.enum(["APPLICATION", "RESOURCE"]), format: z.enum(["ZIP", "FILE"]),
  platform: z.enum(["win-x64"]), url: z.url().max(2000),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/).transform(s => s.toLowerCase()),
  size: z.number().int().positive().max(20 * 1024 ** 3), fileName: z.string().min(1).max(200),
  installDirectory: z.string().max(240), entryPoint: z.string().min(1).max(240),
  requiredFiles: z.array(z.string().min(1).max(240)).max(100).default([]),
  description: z.string().max(2000).default(""), metadata: z.record(z.string().max(80), z.string().max(2000)).default({}),
});
const releaseSchema = z.object({ version, channel: z.enum(["stable", "beta"]), platform: z.enum(["win-x64"]),
  notes: z.string().max(20000).default(""), sourceIds: z.array(z.string().uuid()).min(1).max(100) });

const ciReleaseSchema = z.object({
  version, channel: z.enum(["stable", "beta"]).default("stable"), platform: z.enum(["win-x64"]).default("win-x64"),
  notes: z.string().max(20000).default(""), publish: z.boolean().default(false),
  application: z.object({
    url: z.url().max(2000),
    sha256: z.string().regex(/^[a-fA-F0-9]{64}$/).transform(s => s.toLowerCase()),
    size: z.number().int().positive().max(20 * 1024 ** 3),
    fileName: z.string().min(1).max(200),
    entryPoint: z.string().min(1).max(240).default("DirectorCraftStudio.exe"),
    requiredFiles: z.array(z.string().min(1).max(240)).max(100).default([]),
  }),
});

export class DistributionController {
  /** CI (GitHub Actions) xác thực bằng Bearer RELEASE_CI_TOKEN, so sánh thời gian hằng. */
  private static requireCi(request: Request) {
    const expected = getReleaseCiToken();
    if (!expected) throw new ForbiddenError("CI release endpoint chưa bật (RELEASE_CI_TOKEN)");
    const header = request.headers.get("authorization") ?? "";
    const provided = Buffer.from(header.startsWith("Bearer ") ? header.slice(7).trim() : "");
    const target = Buffer.from(expected);
    if (provided.length !== target.length || !crypto.timingSafeEqual(provided, target)) throw new UnauthorizedError("Invalid CI token");
  }
  /** POST /api/ci/apps/:slug/releases */
  static async ciRelease(request: Request, slug: string) {
    try {
      this.requireCi(request);
      const result = await distributionService.registerCiRelease(slug, ciReleaseSchema.parse(await request.json()));
      return NextResponse.json({ data: result }, { status: result.created ? 201 : 200 });
    } catch (error) { return this.error(error); }
  }
  private static error(error: unknown) {
    if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Dữ liệu không hợp lệ" }, { status: 400 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2003", "P2034"].includes(error.code))
      return NextResponse.json({ error: "Phiên bản bị trùng hoặc dữ liệu đã thay đổi; tải lại trang" }, { status: 409 });
    console.error("[app-distribution]", error);
    return NextResponse.json({ error: "Không xử lý được yêu cầu phát hành" }, { status: 500 });
  }
  private static checkOrigin(request: Request) {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new ForbiddenError("Invalid origin");
  }
  static async manifest(request: Request, slug: string) {
    try {
      const params = new URL(request.url).searchParams;
      const channel = z.enum(["stable", "beta"]).parse(params.get("channel") ?? "stable");
      const platform = z.enum(["win-x64"]).parse(params.get("platform") ?? "win-x64");
      return NextResponse.json({ data: await distributionService.manifest(slug, channel, platform) },
        { headers: { "Cache-Control": "no-store" } });
    } catch (error) { return this.error(error); }
  }
  static async config(slug: string) {
    try { await requireAdmin(); return NextResponse.json({ data: await distributionService.config(slug) }); }
    catch (error) { return this.error(error); }
  }
  static async saveSource(request: Request, slug: string, id?: string) {
    try { await requireAdmin(); this.checkOrigin(request);
      return NextResponse.json({ data: await distributionService.saveSource(slug, sourceSchema.parse(await request.json()), id) });
    } catch (error) { return this.error(error); }
  }
  static async deleteSource(request: Request, slug: string, id: string) {
    try { await requireAdmin(); this.checkOrigin(request); await distributionService.deleteSource(slug, id);
      return NextResponse.json({ deleted: true });
    } catch (error) { return this.error(error); }
  }
  static async createRelease(request: Request, slug: string) {
    try { await requireAdmin(); this.checkOrigin(request);
      return NextResponse.json({ data: await distributionService.createRelease(slug, releaseSchema.parse(await request.json())) });
    } catch (error) { return this.error(error); }
  }
  static async changeRelease(request: Request, slug: string, id: string) {
    try { await requireAdmin(); this.checkOrigin(request);
      const status = z.object({ status: z.enum(["PUBLISHED", "WITHDRAWN"]) }).parse(await request.json()).status;
      await distributionService.transition(slug, id, status); return NextResponse.json({ updated: true });
    } catch (error) { return this.error(error); }
  }
  static async deleteRelease(request: Request, slug: string, id: string) {
    try { await requireAdmin(); this.checkOrigin(request); await distributionService.deleteRelease(slug, id); return NextResponse.json({ deleted: true }); }
    catch (error) { return this.error(error); }
  }
}
