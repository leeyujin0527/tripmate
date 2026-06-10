import type { PinCategoryValue, ReactionTypeValue } from "@/lib/validators";

type DateLike = Date | null;

type RoomLike = {
  id: string;
  title: string;
  confirmedStartDate: DateLike;
  confirmedEndDate: DateLike;
  createdAt: Date;
  updatedAt: Date;
};

type MemberLike = {
  id: string;
  roomId: string;
  nickname: string;
  createdAt: Date;
};

type AvailableDateLike = {
  id: string;
  roomId: string;
  memberId: string;
  date: Date;
  createdAt: Date;
};

type ReactionLike = {
  id: string;
  pinId: string;
  memberId: string;
  reactionType: ReactionTypeValue;
  createdAt: Date;
  updatedAt: Date;
  member?: MemberLike;
};

type ReactionCountLike = {
  reactionType: ReactionTypeValue;
};

type PinLike = {
  id: string;
  roomId: string;
  memberId: string;
  title: string;
  category: PinCategoryValue;
  url: string | null;
  memo: string | null;
  previewTitle?: string | null;
  previewDescription?: string | null;
  previewImage?: string | null;
  previewSiteName?: string | null;
  createdAt: Date;
  updatedAt: Date;
  member?: MemberLike;
  reactions?: ReactionLike[];
};

type BucketLike = {
  id: string;
  roomId: string;
  memberId: string;
  content: string;
  createdAt: Date;
  member?: MemberLike;
};

export const formatDateOnly = (value: DateLike) =>
  value ? value.toISOString().slice(0, 10) : null;

const formatDateTime = (value: Date) => value.toISOString();

export const serializeRoom = (room: RoomLike) => ({
  id: room.id,
  title: room.title,
  confirmedStartDate: formatDateOnly(room.confirmedStartDate),
  confirmedEndDate: formatDateOnly(room.confirmedEndDate),
  createdAt: formatDateTime(room.createdAt),
  updatedAt: formatDateTime(room.updatedAt),
});

export const serializeMember = (member: MemberLike) => ({
  id: member.id,
  roomId: member.roomId,
  nickname: member.nickname,
  createdAt: formatDateTime(member.createdAt),
});

export const serializeAvailableDate = (availableDate: AvailableDateLike) => ({
  id: availableDate.id,
  roomId: availableDate.roomId,
  memberId: availableDate.memberId,
  date: formatDateOnly(availableDate.date),
  createdAt: formatDateTime(availableDate.createdAt),
});

export const getPinReactionCounts = (pin: { reactions?: ReactionCountLike[] }) => {
  const reactions = pin.reactions ?? [];
  const mustCount = reactions.filter(
    (reaction) => reaction.reactionType === "MUST",
  ).length;
  const wantCount = reactions.filter(
    (reaction) => reaction.reactionType === "WANT",
  ).length;

  return {
    mustCount,
    wantCount,
    totalCount: mustCount + wantCount,
  };
};

export const serializePinReaction = (reaction: ReactionLike) => ({
  id: reaction.id,
  pinId: reaction.pinId,
  memberId: reaction.memberId,
  reactionType: reaction.reactionType,
  createdAt: formatDateTime(reaction.createdAt),
  updatedAt: formatDateTime(reaction.updatedAt),
  member: reaction.member ? serializeMember(reaction.member) : undefined,
});

export const serializePin = (
  pin: PinLike,
  options: { includeReactions?: boolean } = {},
) => ({
  id: pin.id,
  roomId: pin.roomId,
  memberId: pin.memberId,
  title: pin.title,
  category: pin.category,
  url: pin.url,
  memo: pin.memo,
  previewTitle: pin.previewTitle ?? null,
  previewDescription: pin.previewDescription ?? null,
  previewImage: pin.previewImage ?? null,
  previewSiteName: pin.previewSiteName ?? null,
  createdAt: formatDateTime(pin.createdAt),
  updatedAt: formatDateTime(pin.updatedAt),
  member: pin.member ? serializeMember(pin.member) : undefined,
  reactionCounts: getPinReactionCounts(pin),
  reactions: options.includeReactions
    ? (pin.reactions ?? []).map(serializePinReaction)
    : undefined,
});

export const serializeBucket = (bucket: BucketLike) => ({
  id: bucket.id,
  roomId: bucket.roomId,
  memberId: bucket.memberId,
  content: bucket.content,
  createdAt: formatDateTime(bucket.createdAt),
  member: bucket.member ? serializeMember(bucket.member) : undefined,
});
