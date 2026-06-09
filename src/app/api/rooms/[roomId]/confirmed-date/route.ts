import type { RoomRouteContext } from "@/lib/api";
import {
  apiSuccess,
  handleApiError,
  parseJson,
  requireRoom,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { serializeRoom } from "@/lib/serializers";
import { confirmedDateSchema, toDateOnly } from "@/lib/validators";

export async function PATCH(request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;
    const body = confirmedDateSchema.parse(await parseJson(request));

    await requireRoom(roomId);

    const room = await prisma.room.update({
      where: { id: roomId },
      data: {
        confirmedStartDate: toDateOnly(body.startDate),
        confirmedEndDate: toDateOnly(body.endDate),
      },
    });

    return apiSuccess(serializeRoom(room));
  } catch (error) {
    return handleApiError(error);
  }
}
