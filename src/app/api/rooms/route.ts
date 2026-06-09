import { apiSuccess, handleApiError, parseJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createRoomSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = createRoomSchema.parse(await parseJson(request));
    const origin = new URL(request.url).origin;
    const room = await prisma.room.create({
      data: {
        title: body.title,
      },
    });

    return apiSuccess(
      {
        roomId: room.id,
        title: room.title,
        inviteUrl: `${origin}/room/${room.id}`,
        createdAt: room.createdAt.toISOString(),
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
