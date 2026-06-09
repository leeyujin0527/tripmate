import type { RoomRouteContext } from "@/lib/api";
import { apiSuccess, handleApiError, requireRoom } from "@/lib/api";
import { serializeRoom } from "@/lib/serializers";

export async function GET(_request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;
    const room = await requireRoom(roomId);

    return apiSuccess(serializeRoom(room));
  } catch (error) {
    return handleApiError(error);
  }
}
