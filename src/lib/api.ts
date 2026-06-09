import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";

export type RoomRouteContext = {
  params: Promise<{ roomId: string }>;
};

export type PinRouteContext = {
  params: Promise<{ roomId: string; pinId: string }>;
};

export type BucketRouteContext = {
  params: Promise<{ roomId: string; bucketId: string }>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export const apiSuccess = (data: unknown, status = 200) =>
  Response.json(
    {
      success: true,
      data,
    },
    { status },
  );

export const apiError = (message: string, status = 400) =>
  Response.json(
    {
      success: false,
      message,
    },
    { status },
  );

export const parseJson = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    throw new ApiError("요청 본문이 올바른 JSON이 아닙니다.", 400);
  }
};

const hasPrismaCode = (error: unknown): error is { code: string } =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string";

export const handleApiError = (error: unknown) => {
  if (error instanceof ApiError) {
    return apiError(error.message, error.status);
  }

  if (error instanceof ZodError) {
    return apiError(
      error.issues[0]?.message ?? "요청 값이 올바르지 않습니다.",
      400,
    );
  }

  if (hasPrismaCode(error)) {
    if (error.code === "P2002") {
      return apiError("이미 존재하는 데이터입니다.", 409);
    }

    if (error.code === "P2025") {
      return apiError("존재하지 않는 데이터입니다.", 404);
    }

    if (error.code === "P1001" || error.code === "ECONNREFUSED") {
      return apiError("데이터베이스에 연결할 수 없습니다.", 503);
    }
  }

  console.error(error);
  return apiError("서버 오류가 발생했습니다.", 500);
};

export const requireRoom = async (roomId: string) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    throw new ApiError("존재하지 않는 여행방입니다.", 404);
  }

  return room;
};

export const requireMember = async (roomId: string, memberId: string) => {
  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      roomId,
    },
  });

  if (!member) {
    throw new ApiError("존재하지 않는 참여자입니다.", 404);
  }

  return member;
};

export const requirePin = async (roomId: string, pinId: string) => {
  const pin = await prisma.pin.findFirst({
    where: {
      id: pinId,
      roomId,
    },
  });

  if (!pin) {
    throw new ApiError("존재하지 않는 핀입니다.", 404);
  }

  return pin;
};

export const requireBucket = async (roomId: string, bucketId: string) => {
  const bucket = await prisma.bucketList.findFirst({
    where: {
      id: bucketId,
      roomId,
    },
  });

  if (!bucket) {
    throw new ApiError("존재하지 않는 버킷리스트입니다.", 404);
  }

  return bucket;
};
