import type { RoomRouteContext } from "@/lib/api";
import {
  apiSuccess,
  handleApiError,
  parseJson,
  requireMember,
  requireRoom,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { serializeBucket } from "@/lib/serializers";
import { createBucketSchema } from "@/lib/validators";

export async function POST(request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;
    const body = createBucketSchema.parse(await parseJson(request));

    await requireRoom(roomId);
    await requireMember(roomId, body.memberId);

    const bucket = await prisma.bucketList.create({
      data: {
        roomId,
        memberId: body.memberId,
        content: body.content,
      },
      include: {
        member: true,
      },
    });

    return apiSuccess(serializeBucket(bucket), 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(_request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;

    await requireRoom(roomId);

    const buckets = await prisma.bucketList.findMany({
      where: { roomId },
      include: {
        member: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return apiSuccess(buckets.map(serializeBucket));
  } catch (error) {
    return handleApiError(error);
  }
}
