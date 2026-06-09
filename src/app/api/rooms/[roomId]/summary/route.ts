import type { RoomRouteContext } from "@/lib/api";
import { apiSuccess, handleApiError, requireRoom } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  formatDateOnly,
  getPinReactionCounts,
  serializeMember,
  serializePin,
} from "@/lib/serializers";

const topByReaction = <
  T extends { createdAt: Date; reactions?: { reactionType: "MUST" | "WANT" }[] },
>(
  pins: T[],
  reactionType: "MUST" | "WANT",
) =>
  [...pins]
    .filter((pin) => {
      const counts = getPinReactionCounts(pin);
      return reactionType === "MUST" ? counts.mustCount > 0 : counts.wantCount > 0;
    })
    .sort((a, b) => {
      const aCounts = getPinReactionCounts(a);
      const bCounts = getPinReactionCounts(b);
      const reactionDiff =
        reactionType === "MUST"
          ? bCounts.mustCount - aCounts.mustCount
          : bCounts.wantCount - aCounts.wantCount;

      return reactionDiff || b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, 3);

export async function GET(_request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;
    const room = await requireRoom(roomId);

    const [members, pins, bucketCount] = await Promise.all([
      prisma.member.findMany({
        where: { roomId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.pin.findMany({
        where: { roomId },
        include: {
          member: true,
          reactions: true,
        },
      }),
      prisma.bucketList.count({
        where: { roomId },
      }),
    ]);

    return apiSuccess({
      roomTitle: room.title,
      confirmedDate:
        room.confirmedStartDate && room.confirmedEndDate
          ? {
              startDate: formatDateOnly(room.confirmedStartDate),
              endDate: formatDateOnly(room.confirmedEndDate),
            }
          : null,
      members: members.map(serializeMember),
      topMustPins: topByReaction(pins, "MUST").map((pin) => serializePin(pin)),
      topWantPins: topByReaction(pins, "WANT").map((pin) => serializePin(pin)),
      pinCount: pins.length,
      bucketCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
