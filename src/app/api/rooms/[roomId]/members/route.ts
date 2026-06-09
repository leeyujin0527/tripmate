import type { RoomRouteContext } from "@/lib/api";
import {
  apiSuccess,
  handleApiError,
  parseJson,
  requireRoom,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { serializeMember } from "@/lib/serializers";
import { createMemberSchema } from "@/lib/validators";

export async function POST(request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;
    const body = createMemberSchema.parse(await parseJson(request));

    await requireRoom(roomId);

    const member = await prisma.member.create({
      data: {
        roomId,
        nickname: body.nickname,
      },
    });

    return apiSuccess(serializeMember(member), 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(_request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;

    await requireRoom(roomId);

    const members = await prisma.member.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
    });

    return apiSuccess(members.map(serializeMember));
  } catch (error) {
    return handleApiError(error);
  }
}
