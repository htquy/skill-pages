import { OrderController } from "@/src/server/controllers/order.controller";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  return OrderController.createPayment(request, id);
}
