import { z } from "zod";
import { orderCommands } from "@/src/infrastructure/composition";
import { requireUser } from "@/src/infrastructure/authentication/authorization";
import { isAppError } from "@/src/domain/errors";

const schema = z.object({ skillId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const result = await orderCommands.createOrder(user, input.skillId);
    return Response.json(result, { status: result.existing ? 200 : 201 });
  } catch (error) {
    if (isAppError(error)) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid request" }, { status: 400 });
    return Response.json({ error: "Unable to create order" }, { status: 500 });
  }
}
