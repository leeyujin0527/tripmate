import { z } from "zod";

export const pinCategories = [
  "PHOTO_SPOT",
  "CAFE",
  "RESTAURANT",
  "TOUR",
  "ACCOMMODATION",
  "ACTIVITY",
  "ETC",
] as const;

export const reactionTypes = ["MUST", "WANT"] as const;
export const reactionRequestTypes = ["MUST", "WANT", "NONE"] as const;

export type PinCategoryValue = (typeof pinCategories)[number];
export type ReactionTypeValue = (typeof reactionTypes)[number];
export type ReactionRequestTypeValue = (typeof reactionRequestTypes)[number];

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateOnly = (value: string) => {
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
};

const uniqueValues = (values: string[]) => new Set(values).size === values.length;

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

export const idSchema = z.string().trim().min(1, "id가 필요합니다.");

export const dateOnlySchema = z
  .string()
  .trim()
  .refine(isValidDateOnly, "날짜는 YYYY-MM-DD 형식이어야 합니다.");

export const createRoomSchema = z.object({
  title: z.string().trim().min(1, "여행방 제목을 입력해주세요.").max(100),
});

export const createMemberSchema = z.object({
  nickname: z.string().trim().min(1, "닉네임을 입력해주세요.").max(30),
});

export const availableDatesSchema = z.object({
  memberId: idSchema,
  dates: z
    .array(dateOnlySchema)
    .min(1, "가능한 날짜를 하나 이상 입력해주세요.")
    .refine(uniqueValues, "날짜는 중복될 수 없습니다."),
});

export const confirmedDateSchema = z
  .object({
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
  })
  .refine((value) => value.startDate <= value.endDate, {
    message: "종료일은 시작일보다 빠를 수 없습니다.",
    path: ["endDate"],
  });

export const pinCategorySchema = z.enum(pinCategories);

const urlSchema = z
  .string()
  .trim()
  .url("올바른 URL을 입력해주세요.")
  .max(2048)
  .refine(isHttpUrl, "http 또는 https 링크만 저장할 수 있어요.");

const optionalUrlSchema = z.preprocess(
  emptyToUndefined,
  urlSchema.optional(),
);

const optionalMemoSchema = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(1000).optional(),
);

export const createPinSchema = z.object({
  memberId: idSchema,
  url: urlSchema,
  memo: optionalMemoSchema,
});

export const updatePinSchema = z
  .object({
    memberId: idSchema,
    title: z.string().trim().min(1, "핀 제목을 입력해주세요.").max(100).optional(),
    category: pinCategorySchema.optional(),
    url: optionalUrlSchema,
    memo: optionalMemoSchema,
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.category !== undefined ||
      value.url !== undefined ||
      value.memo !== undefined,
    "수정할 필드를 하나 이상 입력해주세요.",
  );

export const deleteByMemberSchema = z.object({
  memberId: idSchema,
});

export const reactionSchema = z.object({
  memberId: idSchema,
  reactionType: z.enum(reactionRequestTypes),
});

export const createBucketSchema = z.object({
  memberId: idSchema,
  content: z.string().trim().min(1, "버킷리스트 내용을 입력해주세요.").max(300),
});

export const toDateOnly = (value: string) => new Date(`${value}T00:00:00.000Z`);
