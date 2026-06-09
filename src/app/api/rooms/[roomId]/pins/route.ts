import type { NextRequest } from "next/server";

import type { RoomRouteContext } from "@/lib/api";
import {
  apiSuccess,
  handleApiError,
  parseJson,
  requireMember,
  requireRoom,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getPinReactionCounts, serializePin } from "@/lib/serializers";
import {
  createPinSchema,
  pinListQuerySchema,
  type PinSortValue,
} from "@/lib/validators";

const sortPins = <T extends { createdAt: Date; reactions?: { reactionType: "MUST" | "WANT" }[] }>(
  pins: T[],
  sort: PinSortValue,
) =>
  [...pins].sort((a, b) => {
    const aCounts = getPinReactionCounts(a);
    const bCounts = getPinReactionCounts(b);
    const latest = b.createdAt.getTime() - a.createdAt.getTime();

    if (sort === "popular") {
      return bCounts.totalCount - aCounts.totalCount || latest;
    }

    if (sort === "must") {
      return bCounts.mustCount - aCounts.mustCount || latest;
    }

    if (sort === "want") {
      return bCounts.wantCount - aCounts.wantCount || latest;
    }

    return latest;
  });

export async function POST(request: Request, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;
    const body = createPinSchema.parse(await parseJson(request));

    await requireRoom(roomId);
    await requireMember(roomId, body.memberId);

    const pin = await prisma.pin.create({
      data: {
        roomId,
        memberId: body.memberId,
        title: body.title,
        category: body.category,
        url: body.url ?? null,
        memo: body.memo ?? null,
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

export async function GET(request: NextRequest, context: RoomRouteContext) {
  try {
    const { roomId } = await context.params;
    const query = pinListQuerySchema.parse({
      category: request.nextUrl.searchParams.get("category") ?? undefined,
      sort: request.nextUrl.searchParams.get("sort") ?? undefined,
    });

    await requireRoom(roomId);

    const pins = await prisma.pin.findMany({
      where: {
        roomId,
        category: query.category,
      },
      include: {
        member: true,
        reactions: true,
      },
    });

    return apiSuccess(sortPins(pins, query.sort).map((pin) => serializePin(pin)));
  } catch (error) {
    return handleApiError(error);
  }
}
