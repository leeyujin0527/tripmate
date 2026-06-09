import type { BucketRouteContext } from "@/lib/api";
import {
  ApiError,
  apiSuccess,
  handleApiError,
  parseJson,
  requireBucket,
  requireMember,
  requireRoom,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { deleteByMemberSchema } from "@/lib/validators";

export async function DELETE(request: Request, context: BucketRouteContext) {
  try {
    const { roomId, bucketId } = await context.params;
    const body = deleteByMemberSchema.parse(await parseJson(request));

    await requireRoom(roomId);
    await requireMember(roomId, body.memberId);

    const bucket = await requireBucket(roomId, bucketId);

    if (bucket.memberId !== body.memberId) {
      throw new ApiError("작성자만 삭제할 수 있습니다.", 403);
    }

    await prisma.bucketList.delete({
      where: { id: bucketId },
    });

    return apiSuccess({ id: bucketId });
  } catch (error) {
    return handleApiError(error);
  }
}
