import { NextResponse } from "next/server";
import { z } from "zod";
import { aiGatewayService } from "@/src/infrastructure/composition";
import { toProblemDetailsResponse } from "@/src/domain/ai/errors";

// Zod Validation Schemas
const textRequestSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool"]),
        content: z.string().max(200_000),
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
  dataCollection: z.enum(["allow", "deny"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
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

export class AiGatewayController {
  private static extractAuth(request: Request) {
    const apiKey =
      request.headers.get("x-api-key") || request.headers.get("authorization");
    const byokKey = request.headers.get("x-provider-key") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : "127.0.0.1";
    return { apiKey, byokKey, ipAddress };
  }

  /**
   * POST /api/v1/ai/text/generate
   * Hỗ trợ đồng bộ (JSON) và SSE Streaming (Server-Sent Events)
   */
  static async generateText(request: Request): Promise<Response> {
    const { apiKey, byokKey, ipAddress } =
      AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress);
      auth.byokKey = byokKey;

      const body = await request.json();
      const parsed = textRequestSchema.parse(body);

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
      const problem = toProblemDetailsResponse(
        error,
        "/api/v1/ai/text/generate",
      );
      return NextResponse.json(problem, {
        status: problem.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }
  }

  /**
   * POST /api/v1/ai/image/generate
   */
  static async generateImage(request: Request): Promise<NextResponse> {
    const { apiKey, byokKey, ipAddress } =
      AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress);
      auth.byokKey = byokKey;

      const body = await request.json();
      const parsed = imageRequestSchema.parse(body);

      const result = await aiGatewayService.generateImage(parsed, auth);
      return NextResponse.json(result, { status: 202 });
    } catch (error) {
      const problem = toProblemDetailsResponse(
        error,
        "/api/v1/ai/image/generate",
      );
      return NextResponse.json(problem, {
        status: problem.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }
  }

  /**
   * POST /api/v1/ai/video/generate
   */
  static async generateVideo(request: Request): Promise<NextResponse> {
    const { apiKey, byokKey, ipAddress } =
      AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress);
      auth.byokKey = byokKey;

      const body = await request.json();
      const parsed = videoRequestSchema.parse(body);

      const result = await aiGatewayService.generateVideo(parsed, auth);
      return NextResponse.json(result, { status: 202 });
    } catch (error) {
      const problem = toProblemDetailsResponse(
        error,
        "/api/v1/ai/video/generate",
      );
      return NextResponse.json(problem, {
        status: problem.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }
  }

  /**
   * POST /api/v1/ai/audio/speech
   */
  static async synthesizeAudio(request: Request): Promise<Response> {
    const { apiKey, byokKey, ipAddress } =
      AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress);
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
      const problem = toProblemDetailsResponse(
        error,
        "/api/v1/ai/audio/speech",
      );
      return NextResponse.json(problem, {
        status: problem.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }
  }

  /**
   * GET /api/v1/ai/tasks/[taskId]
   */
  static async getTaskStatus(
    request: Request,
    taskId: string,
  ): Promise<NextResponse> {
    const { apiKey, ipAddress } = AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress);
      const task = await aiGatewayService.getTask(taskId, auth);
      return NextResponse.json(task);
    } catch (error) {
      const problem = toProblemDetailsResponse(
        error,
        `/api/v1/ai/tasks/${taskId}`,
      );
      return NextResponse.json(problem, {
        status: problem.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }
  }

  /**
   * GET /api/v1/ai/catalog
   */
  static async getCatalog(request: Request): Promise<Response> {
    const { apiKey, ipAddress } = AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress);
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
      const problem = toProblemDetailsResponse(error, "/api/v1/ai/catalog");
      return NextResponse.json(problem, {
        status: problem.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }
  }

  /**
   * GET /api/v1/ai/profiles/[profileId]
   */
  static async getProfile(
    request: Request,
    profileId: string,
  ): Promise<Response> {
    const { apiKey, ipAddress } = AiGatewayController.extractAuth(request);

    try {
      const auth = await aiGatewayService.authenticateClient(apiKey, ipAddress);
      const profile = await aiGatewayService.getProfile(profileId, auth);
      const etag = `W/"prof-${profile.profileId}-v${profile.version}"`;

      return NextResponse.json(profile, {
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=300",
        },
      });
    } catch (error) {
      const problem = toProblemDetailsResponse(
        error,
        `/api/v1/ai/profiles/${profileId}`,
      );
      return NextResponse.json(problem, {
        status: problem.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }
  }
}
