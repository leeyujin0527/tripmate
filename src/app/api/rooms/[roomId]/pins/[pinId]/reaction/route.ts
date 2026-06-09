import type { PinRouteContext } from "@/lib/api";
import {
  apiSuccess,
  handleApiError,
  parseJson,
  requireMember,
  requirePin,
  requireRoom,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { serializePinReaction } from "@/lib/serializers";
import { reactionSchema } from "@/lib/validators";

export async function POST(request: Request, context: PinRouteContext) {
  try {
    const { roomId, pinId } = await context.params;
    const body = reactionSchema.parse(await parseJson(request));

    await requireRoom(roomId);
    await requireMember(roomId, body.memberId);
    await requirePin(roomId, pinId);

    if (body.reactionType === "NONE") {
      await prisma.pinReaction.deleteMany({
        where: {
          pinId,
          memberId: body.memberId,
        },
      });

      return apiSuccess({
        pinId,
        memberId: body.memberId,
        reactionType: "NONE",
      });
    }

    const reaction = await prisma.pinReaction.upsert({
      where: {
        pinId_memberId: {
          pinId,
          memberId: body.memberId,
        },
      },
      update: {
        reactionType: body.reactionType,
      },
      create: {
        pinId,
        memberId: body.memberId,
        reactionType: body.reactionType,
      },
    });

    return apiSuccess(serializePinReaction(reaction));
  } catch (error) {
    return handleApiError(error);
  }
}
