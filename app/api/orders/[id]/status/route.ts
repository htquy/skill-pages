import { orderCommands } from "@/src/infrastructure/composition";
import { requireUser } from "@/src/infrastructure/authentication/authorization";
import { isAppError } from "@/src/domain/errors";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const result = await orderCommands.getOrderStatus(user, (await params).id);
    // DTO gọn cho polling: client chỉ cần trạng thái + quyền đã mở khoá hay chưa.
    return Response.json({ status: result.status, unlocked: result.skillAccess.unlocked });
  } catch (error) {
    if (isAppError(error)) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Unable to load order" }, { status: 500 });
  }
}
