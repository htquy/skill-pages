import { paymentCommands } from "@/src/infrastructure/composition";

export async function POST(request: Request) {
  try {
    const result = await paymentCommands.handlePaymentWebhook({
      payload: await request.json(),
      signature: request.headers.get("x-payment-signature") ?? undefined,
      ipAddress: request.headers.get("x-forwarded-for"),
      userAgent: request.headers.get("user-agent"),
    });
    return Response.json(result, { status: result.handled ? 200 : 422 });
  } catch {
    return Response.json({ error: "Invalid payment webhook" }, { status: 400 });
  }
}
