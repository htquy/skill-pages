import { NextResponse } from "next/server";
import { z } from "zod";
import { aiGatewayService } from "@/src/infrastructure/composition";
import { auth as getWebSession } from "@/src/infrastructure/authentication/auth";
import { AiValidationError, toProblemDetailsResponse } from "@/src/domain/ai/errors";

const textContentPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().max(500_000),
});

const imageUrlContentPartSchema = z.object({
  type: z.literal("image_url"),
  image_url: z.object({
    url: z.string().min(1),
    detail: z.enum(["auto", "low", "high"]).optional(),
  }),
});

const textRequestSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  appSlug: z.string().max(120).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool"]),
        content: z
          .union([
            z.string().max(500_000),
            z.array(z.union([textContentPartSchema, imageUrlContentPartSchema])),
            z.null(),
          ]),
        tool_calls: z
          .array(
            z.object({
              id: z.string().min(1),
              type: z.literal("function"),
              function: z.object({
                name: z.string().min(1),
                arguments: z.string(),
              }),
            }),
          )
          .max(32)
          .optional(),
        tool_call_id: z.string().optional(),
      }),
    )
    .min(1),
  tools: z
    .array(
      z.object({
        type: z.literal("function"),
        function: z.object({
          name: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
          description: z.string().max(4000).optional(),
          parameters: z.record(z.string(), z.unknown()),
        }),
      }),
    )
    .max(64)
    .optional(),
  toolChoice: z.enum(["auto", "none", "required"]).optional(),
  parallelToolCalls: z.boolean().optional(),
  reasoningEffort: z.enum(["minimal", "low", "medium", "high"]).optional(),
  allowFallback: z.boolean().optional(),
  fallbackProvider: z.string().optional(),
  fallbackModel: z.string().optional(),
  dataCollection: z.enum(["allow", "deny"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
  systemPrompt: z.string().optional(),
});

const imageRequestSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().min(1).max(4000),
  negativePrompt: z.string().optional(),
  aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4"]).optional(),
  numImages: z.number().int().min(1).max(4).optional(),
  seed: z.number().int().optional(),
  callbackUrl: z.string().url().optional(),
});

const videoRequestSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().min(1).max(2000),
  imageUrl: z.string().url().optional(),
  durationSeconds: z.number().int().min(3).max(10).optional(),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional(),
  callbackUrl: z.string().url().optional(),
});

const audioRequestSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  text: z.string().min(1).max(5000),
  voice: z.string().default("alloy"),
  speed: z.number().min(0.25).max(4.0).optional(),
  format: z.enum(["mp3", "wav", "ogg", "aac"]).default("mp3"),
});

function toErrorResponse(error: unknown, instance: string): NextResponse {
  if (error instanceof z.ZodError) {
    const validationErr = new AiValidationError(
      error.issues[0]?.message || "Validation failed",
      error.issues.map((i) => ({ name: i.path.join(".") || "body", reason: i.message })),
      instance,
    );
    const problem = validationErr.toProblemDetails();
    return NextResponse.json(problem, {
      status: problem.status,
      headers: { "Content-Type": "application/problem+json" },
    });
  }
  const problem = toProblemDetailsResponse(error, instance);
  return NextResponse.json(problem, {
    status: problem.status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

export class AiGatewayController {
  private static extractAuth(request: Request) {
    const apiKey =
      request.headers.get("x-api-key") || request.headers.get("authorization");
    const byokKey = request.headers.get("x-provider-key") || undefined;
    const url = new URL(request.url);
    const appSlug =
      request.headers.get("x-app-slug") ||
      url.searchParams.get("appSlug") ||
      undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : "127.0.0.1";
    return { apiKey, byokKey, appSlug, ipAddress };
  }

  /**
   * GET /api/v1/ai/credits?appSlug=skill-studio
   * Trả về hạn mức credit tháng, số đã dùng, số còn lại và model mặc định cho tài khoản đăng nhập.
   */
  static async getCredits(request: Request): Promise<NextResponse> {
    const { apiKey, appSlug, ipAddress } = AiGatewayController.extractAuth(request);

    try {
      const session = !apiKey ? await getWebSession() : null;
      const sessionUser = session?.user?.id
        ? {
            id: session.user.id,
            email: session.user.email ?? null,
            name: session.user.name ?? null,
          }
        : null;

      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress, {
        appSlug,
        sessionUser,
      });
      if (!auth.userId) {
        return NextResponse.json(
          {
            error: "Credit wallet requires OAuth Bearer token or logged-in user session",
            code: "USER_TOKEN_REQUIRED",
          },
          { status: 400 },
        );
      }

      const status = await aiGatewayService.getUserCreditStatus(
        auth.userId,
        appSlug || auth.appSlug,
      );
      return NextResponse.json(status);
    } catch (error) {
      return toErrorResponse(error, "/api/v1/ai/credits");
    }
  }

  /**
   * POST /api/v1/ai/text/generate
   * Hỗ trợ đồng bộ (JSON) và SSE Streaming (Server-Sent Events)
   */
  static async generateText(request: Request): Promise<Response> {
    const { apiKey, byokKey, appSlug, ipAddress } =
      AiGatewayController.extractAuth(request);

    try {
      const body = await request.json();
      const parsed = textRequestSchema.parse(body);

      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress, {
        appSlug: parsed.appSlug || appSlug,
      });
      auth.byokKey = byokKey;

      // 1. Trường hợp SSE Streaming
      if (parsed.stream) {
        const streamGenerator = aiGatewayService.streamText(parsed, auth);
        const encoder = new TextEncoder();

        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of streamGenerator) {
                const sseData = `data: ${JSON.stringify(chunk)}\n\n`;
                controller.enqueue(encoder.encode(sseData));
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (streamErr) {
              const problem = toProblemDetailsResponse(
                streamErr,
                "/api/v1/ai/text/generate",
              );
              controller.enqueue(
                encoder.encode(
                  `event: error\ndata: ${JSON.stringify(problem)}\n\n`,
                ),
              );
              controller.close();
            }
          },
        });

        return new Response(readableStream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }

      // 2. Trường hợp JSON thông thường
      const result = await aiGatewayService.generateText(parsed, auth);
      return NextResponse.json(result);
    } catch (error) {
      return toErrorResponse(error, "/api/v1/ai/text/generate");
    }
  }

  /**
   * POST /api/v1/ai/image/generate
   */
  static async generateImage(request: Request): Promise<NextResponse> {
    const { apiKey, byokKey, appSlug, ipAddress } =
      AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress, {
        appSlug,
      });
      auth.byokKey = byokKey;

      const body = await request.json();
      const parsed = imageRequestSchema.parse(body);

      const result = await aiGatewayService.generateImage(parsed, auth);
      return NextResponse.json(result, { status: 202 });
    } catch (error) {
      return toErrorResponse(error, "/api/v1/ai/image/generate");
    }
  }

  /**
   * POST /api/v1/ai/video/generate
   */
  static async generateVideo(request: Request): Promise<NextResponse> {
    const { apiKey, byokKey, appSlug, ipAddress } =
      AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress, {
        appSlug,
      });
      auth.byokKey = byokKey;

      const body = await request.json();
      const parsed = videoRequestSchema.parse(body);

      const result = await aiGatewayService.generateVideo(parsed, auth);
      return NextResponse.json(result, { status: 202 });
    } catch (error) {
      return toErrorResponse(error, "/api/v1/ai/video/generate");
    }
  }

  /**
   * POST /api/v1/ai/audio/speech
   */
  static async synthesizeAudio(request: Request): Promise<Response> {
    const { apiKey, byokKey, appSlug, ipAddress } =
      AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress, {
        appSlug,
      });
      auth.byokKey = byokKey;

      const body = await request.json();
      const parsed = audioRequestSchema.parse(body);

      const result = await aiGatewayService.synthesizeAudio(parsed, auth);

      if (result.audioBuffer) {
        return new Response(new Uint8Array(result.audioBuffer), {
          headers: {
            "Content-Type": result.contentType,
            "Content-Length": String(result.audioBuffer.length),
            "Cache-Control": "public, max-age=86400",
          },
        });
      }

      return NextResponse.json(result);
    } catch (error) {
      return toErrorResponse(error, "/api/v1/ai/audio/speech");
    }
  }

  /**
   * GET /api/v1/ai/tasks/[taskId]
   */
  static async getTaskStatus(
    request: Request,
    taskId: string,
  ): Promise<NextResponse> {
    const { apiKey, appSlug, ipAddress } = AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress, {
        appSlug,
      });
      const task = await aiGatewayService.getTask(taskId, auth);
      return NextResponse.json(task);
    } catch (error) {
      return toErrorResponse(error, `/api/v1/ai/tasks/${taskId}`);
    }
  }

  /**
   * GET /api/v1/ai/catalog
   */
  static async getCatalog(request: Request): Promise<Response> {
    const { apiKey, appSlug, ipAddress } = AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress, {
        appSlug,
      });
      const url = new URL(request.url);
      const capability = url.searchParams.get("capability") || undefined;
      const catalog = await aiGatewayService.getCatalog(auth, capability);

      const etag = `W/"cat-${catalog.catalogVersion}-${catalog.profiles.length}"`;
      const clientEtag = request.headers.get("if-none-match");
      if (clientEtag && clientEtag === etag) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: etag,
            "Cache-Control": "public, max-age=60",
          },
        });
      }

      return NextResponse.json(catalog, {
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=60",
        },
      });
    } catch (error) {
      return toErrorResponse(error, "/api/v1/ai/catalog");
    }
  }

  /**
   * GET /api/v1/ai/profiles/[profileId]
   */
  static async getProfile(
    request: Request,
    profileId: string,
  ): Promise<Response> {
    const { apiKey, appSlug, ipAddress } = AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress, {
        appSlug,
      });
      const profile = await aiGatewayService.getProfile(profileId, auth);
      const etag = `W/"prof-${profile.profileId}-v${profile.version}"`;

      return NextResponse.json(profile, {
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch (error) {
      return toErrorResponse(error, `/api/v1/ai/profiles/${profileId}`);
    }
  }
}
