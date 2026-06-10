import type { RoomRouteContext } from "@/lib/api";
import {
  apiSuccess,
  handleApiError,
  parseJson,
  requireMember,
  requireRoom,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  formatDateOnly,
  serializeAvailableDate,
  serializeMember,
} from "@/lib/serializers";
import { availableDatesSchema, toDateOnly } from "@/lib/validators";

export async function POST(request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;
    const body = availableDatesSchema.parse(await parseJson(request));

    await requireRoom(roomId);
    await requireMember(roomId, body.memberId);

    const availableDates = await prisma.$transaction(async (tx) => {
      await tx.availableDate.deleteMany({
        where: {
          roomId,
          memberId: body.memberId,
        },
      });

      await tx.availableDate.createMany({
        data: body.dates.map((date) => ({
          roomId,
          memberId: body.memberId,
          date: toDateOnly(date),
        })),
      });

      return tx.availableDate.findMany({
        where: {
          roomId,
          memberId: body.memberId,
        },
        orderBy: { date: "asc" },
      });
    });

    return apiSuccess(availableDates.map(serializeAvailableDate), 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(_request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;

    await requireRoom(roomId);

    const availableDates = await prisma.availableDate.findMany({
      where: { roomId },
      include: {
        member: true,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    const grouped = new Map<
      string,
      {
        date: string;
        count: number;
        availableMembers: string[];
        members: ReturnType<typeof serializeMember>[];
      }
    >();

    for (const availableDate of availableDates) {
      const date = formatDateOnly(availableDate.date);

      if (!date) {
        continue;
      }

      const group =
        grouped.get(date) ??
        grouped
          .set(date, {
            date,
            count: 0,
            availableMembers: [],
            members: [],
          })
          .get(date);

      if (!group) {
        continue;
      }

      group.count += 1;
      group.availableMembers.push(availableDate.member.nickname);
      group.members.push(serializeMember(availableDate.member));
    }

    return apiSuccess([...grouped.values()]);
  } catch (error) {
    return handleApiError(error);
  }
}
