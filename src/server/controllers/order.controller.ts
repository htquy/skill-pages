import { NextResponse } from "next/server";
import { z } from "zod";
import { orderCommands, orderRepository, paymentCommands } from "@/src/infrastructure/composition";
import { requireUser } from "@/src/infrastructure/authentication/authorization";
import { ForbiddenError, NotFoundError, isAppError } from "@/src/domain/errors";

/** Mua skill (`skillId`) hoặc một kỳ hạn gói app (`planPriceId`); đúng một trong hai. */
const createOrderSchema = z.union([
  z.object({ skillId: z.string().trim().min(1).max(100), planPriceId: z.undefined().optional() }),
  z.object({ planPriceId: z.string().trim().min(1).max(100), skillId: z.undefined().optional() }),
]);

/**
 * OrderController: xử lý toàn bộ giao thức HTTP cho module mua kỹ năng
 * (tạo đơn, tạo yêu cầu thanh toán, thăm dò trạng thái đơn).
 */
export class OrderController {
  /** POST /api/orders */
  static async create(request: Request): Promise<NextResponse> {
    try {
      const user = await requireUser();
      const input = createOrderSchema.parse(await request.json());
      const result = input.planPriceId
        ? await orderCommands.createPlanOrder(user, input.planPriceId)
        : await orderCommands.createOrder(user, input.skillId!);
      return NextResponse.json(result, { status: result.existing ? 200 : 201 });
    } catch (error) {
      if (isAppError(error)) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
      return NextResponse.json({ error: "Unable to create order" }, { status: 500 });
    }
  }

  /** POST /api/orders/[id]/payment */
  static async createPayment(_request: Request, orderId: string): Promise<NextResponse> {
    try {
      const user = await requireUser();
      const order = await orderRepository.findById(orderId);
      if (!order) throw new NotFoundError("Order was not found");
      if (order.userId !== user.id) throw new ForbiddenError("You can only pay for your own order");
      if (order.status !== "PENDING") {
        return NextResponse.json({ error: "Order is no longer payable" }, { status: 409 });
      }
      return NextResponse.json(await paymentCommands.createPaymentRequest(order));
    } catch (error) {
      if (isAppError(error)) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      return NextResponse.json({ error: "Unable to create payment request" }, { status: 500 });
    }
  }

  /** GET /api/orders/[id]/status */
  static async getStatus(_request: Request, orderId: string): Promise<NextResponse> {
    try {
      const user = await requireUser();
      const result = await orderCommands.getOrderStatus(user, orderId);
      // DTO gọn cho polling: client chỉ cần trạng thái + quyền đã mở khoá hay chưa.
      return NextResponse.json({ status: result.status, unlocked: result.skillAccess.unlocked });
    } catch (error) {
      if (isAppError(error)) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      return NextResponse.json({ error: "Unable to load order" }, { status: 500 });
    }
  }
}
