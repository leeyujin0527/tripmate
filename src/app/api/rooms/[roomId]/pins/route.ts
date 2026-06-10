import type { RoomRouteContext } from "@/lib/api";
import {
  apiSuccess,
  handleApiError,
  parseJson,
  requireMember,
  requireRoom,
} from "@/lib/api";
import {
  fetchLinkPreviewMetadata,
  getFallbackLinkPreview,
} from "@/lib/link-preview";
import { prisma } from "@/lib/prisma";
import { serializePin } from "@/lib/serializers";
import { createPinSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;
    const body = createPinSchema.parse(await parseJson(request));

    await requireRoom(roomId);
    await requireMember(roomId, body.memberId);

    const preview = await fetchLinkPreviewMetadata(body.url);
    const fallbackPreview = getFallbackLinkPreview(body.url);

    const pin = await prisma.pin.create({
      data: {
        roomId,
        memberId: body.memberId,
        title: preview.previewTitle ?? fallbackPreview.previewTitle ?? body.url,
        category: "ETC",
        url: body.url,
        memo: body.memo ?? null,
        previewTitle: preview.previewTitle,
        previewDescription: preview.previewDescription,
        previewImage: preview.previewImage,
        previewSiteName: preview.previewSiteName,
      },
      include: {
        member: true,
        reactions: true,
      },
    });

    return apiSuccess(serializePin(pin), 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(_request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;

    await requireRoom(roomId);

    const pins = await prisma.pin.findMany({
      where: { roomId },
      include: {
        member: true,
        reactions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(pins.map((pin) => serializePin(pin)));
  } catch (error) {
    return handleApiError(error);
  }
}
