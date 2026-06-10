import type { PinRouteContext } from "@/lib/api";
import {
  ApiError,
  apiSuccess,
  handleApiError,
  parseJson,
  requireMember,
  requirePin,
  requireRoom,
} from "@/lib/api";
import { fetchLinkPreviewMetadata } from "@/lib/link-preview";
import { prisma } from "@/lib/prisma";
import { serializePin } from "@/lib/serializers";
import { deleteByMemberSchema, updatePinSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(_request: Request, context: PinRouteContext) {
  try {
    const { roomId, pinId } = await context.params;

    await requireRoom(roomId);

    const pin = await prisma.pin.findFirst({
      where: {
        id: pinId,
        roomId,
      },
      include: {
        member: true,
        reactions: {
          include: {
            member: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!pin) {
      throw new ApiError("존재하지 않는 핀입니다.", 404);
    }

    return apiSuccess(serializePin(pin, { includeReactions: true }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: PinRouteContext) {
  try {
    const { roomId, pinId } = await context.params;
    const body = updatePinSchema.parse(await parseJson(request));

    await requireRoom(roomId);
    await requireMember(roomId, body.memberId);

    const pin = await requirePin(roomId, pinId);

    if (pin.memberId !== body.memberId) {
      throw new ApiError("작성자만 수정할 수 있습니다.", 403);
    }

    const preview = body.url
      ? await fetchLinkPreviewMetadata(body.url)
      : undefined;

    const updatedPin = await prisma.pin.update({
      where: { id: pinId },
      data: {
        title: body.title ?? preview?.previewTitle ?? undefined,
        category: body.category,
        url: body.url,
        memo: body.memo,
        previewTitle: preview?.previewTitle,
        previewDescription: preview?.previewDescription,
        previewImage: preview?.previewImage,
        previewSiteName: preview?.previewSiteName,
      },
      include: {
        member: true,
        reactions: true,
      },
    });

    return apiSuccess(serializePin(updatedPin));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: PinRouteContext) {
  try {
    const { roomId, pinId } = await context.params;
    const body = deleteByMemberSchema.parse(await parseJson(request));

    await requireRoom(roomId);
    await requireMember(roomId, body.memberId);

    const pin = await requirePin(roomId, pinId);

    if (pin.memberId !== body.memberId) {
      throw new ApiError("작성자만 삭제할 수 있습니다.", 403);
    }

    await prisma.pin.delete({
      where: { id: pinId },
    });

    return apiSuccess({ id: pinId });
  } catch (error) {
    return handleApiError(error);
  }
}
