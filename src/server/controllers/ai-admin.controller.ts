import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { aiRepository, keyManagerService, aiGatewayService } from "@/src/infrastructure/composition";
import { isAppError } from "@/src/domain/errors";

const createKeySchema = z.object({
  provider: z.string().min(1).max(60),
  keySecret: z.string().min(1),
  alias: z.string().max(120).optional(),
  clientId: z.string().optional().nullable(),
  weight: z.number().int().min(1).max(100).default(1),
});

const updateKeySchema = z.object({
  alias: z.string().max(120).optional().nullable(),
  keySecret: z.string().min(1).optional(),
  weight: z.number().int().min(1).max(100).optional(),
  status: z.enum(["ACTIVE", "RATE_LIMITED", "SUSPENDED", "EXPIRED"]).optional(),
  resetCooldown: z.boolean().optional(),
});

const testApiSchema = z.object({
  taskType: z.enum(["TEXT", "IMAGE", "AUDIO"]),
  provider: z.string().min(1),
  model: z.string().optional(),
  prompt: z.string().min(1).max(4000),
  customKey: z.string().optional(), // Test trực tiếp bằng key vừa nhập hoặc key hệ thống
});

export class AiAdminController {
  /** GET /api/admin/ai/keys */
  static async listKeys(): Promise<NextResponse> {
    try {
      await requireAdmin();
      const keys = await keyManagerService.listKeys();
      // Mask keySecret để không lộ toàn bộ raw secret trên UI (chỉ hiện 4 ký tự đầu và 4 ký tự cuối)
      const maskedKeys = keys.map((k) => ({
        ...k,
        keySecretMasked:
          k.keySecret.length > 10
            ? `${k.keySecret.slice(0, 4)}••••••••${k.keySecret.slice(-4)}`
            : "••••••••",
      }));
      return NextResponse.json(maskedKeys);
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      return NextResponse.json({ error: "Failed to list AI keys" }, { status: 500 });
    }
  }

  /** POST /api/admin/ai/keys */
  static async createKey(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = await request.json();
      const input = createKeySchema.parse(body);

      const created = await keyManagerService.upsertKey({
        provider: input.provider.toLowerCase().trim(),
        keySecret: input.keySecret.trim(),
        alias: input.alias?.trim() || null,
        clientId: input.clientId || null,
        weight: input.weight,
      });

      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Dữ liệu không hợp lệ", details: error.flatten() }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed to create AI key" }, { status: 500 });
    }
  }

  /** PUT /api/admin/ai/keys/[id] */
  static async updateKey(request: Request, id: string): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = await request.json();
      const input = updateKeySchema.parse(body);

      const updated = await keyManagerService.updateKey(id, {
        alias: input.alias,
        keySecret: input.keySecret,
        weight: input.weight,
        status: input.status,
        cooldownUntil: input.resetCooldown ? null : undefined,
      });

      return NextResponse.json(updated);
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
      }
      return NextResponse.json({ error: "Failed to update AI key" }, { status: 500 });
    }
  }

  /** DELETE /api/admin/ai/keys/[id] */
  static async deleteKey(_request: Request, id: string): Promise<NextResponse> {
    try {
      await requireAdmin();
      await keyManagerService.deleteKey(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      return NextResponse.json({ error: "Failed to delete AI key" }, { status: 500 });
    }
  }

  /** GET /api/admin/ai/logs */
  static async listLogs(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const offset = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        aiRepository.getUsageLogs(limit, offset),
        aiRepository.countUsageLogs(),
      ]);

      return NextResponse.json({
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      if (isAppError(error)) return NextResponse.json({ error: error.message }, { status: error.status });
      return NextResponse.json({ error: "Failed to load AI logs" }, { status: 500 });
    }
  }

  /** POST /api/admin/ai/test - Trực tiếp thử nghiệm API từ Admin Panel */
  static async testApi(request: Request): Promise<NextResponse> {
    try {
      const user = await requireAdmin();
      const body = await request.json();
      const input = testApiSchema.parse(body);

      // Tạo một mock auth context cho Admin
      const adminAuth = {
        client: {
          id: `admin-${user.id}`,
          name: "Admin Playground",
          apiKey: "internal-admin",
          status: "ACTIVE" as const,
          rateLimitPerMin: 1000,
          allowedProviders: ["*"],
          allowedTasks: ["*"],
        },
        byokKey: input.customKey || undefined,
      };

      if (input.taskType === "TEXT") {
        const result = await aiGatewayService.generateText(
          {
            provider: input.provider,
            model: input.model,
            messages: [{ role: "user", content: input.prompt }],
            stream: false,
          },
          adminAuth,
        );
        return NextResponse.json({ kind: "TEXT", result });
      }

      if (input.taskType === "AUDIO") {
        const result = await aiGatewayService.synthesizeAudio(
          {
            provider: input.provider,
            model: input.model,
            text: input.prompt,
            voice: "alloy",
          },
          adminAuth,
        );
        const base64Audio = result.audioBuffer
          ? `data:${result.contentType};base64,${result.audioBuffer.toString("base64")}`
          : undefined;

        return NextResponse.json({
          kind: "AUDIO",
          result: {
            audioUrl: base64Audio,
            durationSeconds: result.durationSeconds,
            executionTimeMs: result.executionTimeMs,
          },
        });
      }

      if (input.taskType === "IMAGE") {
        const result = await aiGatewayService.generateImage(
          {
            provider: input.provider,
            model: input.model,
            prompt: input.prompt,
            aspectRatio: "1:1",
          },
          adminAuth,
        );
        return NextResponse.json({ kind: "IMAGE", result });
      }

      return NextResponse.json({ error: "Unsupported task type" }, { status: 400 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Test execution failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
}
