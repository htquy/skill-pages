import { orderRepository, paymentCommands } from "@/src/infrastructure/composition";
import { requireUser } from "@/src/infrastructure/authentication/authorization";
import { ForbiddenError, NotFoundError, isAppError } from "@/src/domain/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const order = await orderRepository.findById((await params).id);
    if (!order) throw new NotFoundError("Order was not found");
    if (order.userId !== user.id) throw new ForbiddenError("You can only pay for your own order");
    if (order.status !== "PENDING" || order.expiresAt <= new Date()) {
      return Response.json({ error: "Order is no longer payable" }, { status: 409 });
    }
    return Response.json(await paymentCommands.createPaymentRequest(order));
  } catch (error) {
    if (isAppError(error)) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Unable to create payment request" }, { status: 500 });
  }
}
