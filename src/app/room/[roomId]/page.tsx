"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageIcon,
  Link as LinkIcon,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiError = {
  success: false;
  message: string;
};

type Room = {
  id: string;
  title: string;
  confirmedStartDate?: string | null;
  confirmedEndDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type MemberStorage = {
  memberId: string;
  nickname: string;
  roomId: string;
};

type JoinMemberResponse = {
  memberId?: string;
  id?: string;
  nickname: string;
  roomId: string;
};

type ReactionType = "MUST" | "WANT";

type ActiveTab = "홈" | "날짜" | "핀보드" | "버킷리스트";

type Pin = {
  id: string;
  roomId: string;
  memberId: string;
  title: string;
  url: string | null;
  memo: string | null;
  previewTitle: string | null;
  previewDescription: string | null;
  previewImage: string | null;
  previewSiteName: string | null;
  createdAt: string;
  updatedAt: string;
  member?: {
    id: string;
    roomId: string;
    nickname: string;
    createdAt?: string;
  };
  reactionCounts: {
    mustCount: number;
    wantCount: number;
    totalCount: number;
  };
};

type PinForm = {
  url: string;
  memo: string;
};

type AvailableDateMember = {
  id: string;
  roomId: string;
  nickname: string;
  createdAt?: string;
};

type AvailableDateStatus = {
  date: string;
  count: number;
  availableMembers?: string[];
  members?: AvailableDateMember[];
};

type TabItem = {
  label: ActiveTab;
  emoji: string;
};

type InviteLinkCardProps = {
  inviteUrl: string;
  isCopied: boolean;
  onCopy: () => void;
};

type DateStepProps = {
  room: Room;
  roomId: string;
  member: MemberStorage;
  onRoomUpdate: (room: Room) => void;
  onConfirmed: () => void;
};

type BucketMember = {
  id?: string;
  memberId?: string;
  nickname?: string;
  name?: string;
};

type BucketItem = {
  id?: string;
  bucketId?: string;
  memberId?: string;
  content: string;
  author?: { memberId: string; nickname: string };
  member?: BucketMember;
  createdAt?: string;
};

type SummaryMember =
  | string
  | {
      id?: string;
      memberId?: string;
      nickname?: string;
      name?: string;
    };

type SummaryPin = {
  id?: string;
  pinId?: string;
  title?: string | null;
  memo?: string | null;
  previewTitle?: string | null;
  mustCount?: number;
  wantCount?: number;
  reactionCounts?: {
    mustCount?: number;
    wantCount?: number;
  };
};

type RoomSummary = {
  roomTitle: string;
  confirmedDate: {
    startDate: string | null;
    endDate: string | null;
  } | null;
  members: SummaryMember[];
  topMustPins: SummaryPin[];
  topWantPins: SummaryPin[];
  pinCount: number;
  bucketCount: number;
};

type HomeTabProps = {
  room: Room;
  roomId: string;
};

const tabs: TabItem[] = [
  { label: "홈", emoji: "🏠" },
  { label: "날짜", emoji: "🗓️" },
  { label: "핀보드", emoji: "📌" },
  { label: "버킷리스트", emoji: "📝" },
];

const defaultPinForm: PinForm = {
  url: "",
  memo: "",
};

const dateMemberColors = [
  "bg-pink-200",
  "bg-violet-200",
  "bg-sky-200",
  "bg-emerald-200",
  "bg-amber-200",
  "bg-rose-200",
  "bg-indigo-200",
];

const bucketPastelColors = [
  "bg-pink-50",
  "bg-violet-50",
  "bg-sky-50",
  "bg-emerald-50",
  "bg-amber-50",
  "bg-rose-50",
  "bg-indigo-50",
];

const getStorageKey = (roomId: string) => `tripmate_member_${roomId}`;

const getPinReactionStorageKey = (roomId: string, memberId: string) =>
  `tripmate_pin_reactions_${roomId}_${memberId}`;

const parseStoredPinReactions = (
  roomId: string,
  memberId: string,
): Record<string, ReactionType> => {
  try {
    const storedValue = window.localStorage.getItem(
      getPinReactionStorageKey(roomId, memberId),
    );

    if (!storedValue) {
      return {};
    }

    const parsed = JSON.parse(storedValue) as Record<string, ReactionType>;
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, reactionType]) =>
          reactionType === "MUST" || reactionType === "WANT",
      ),
    );
  } catch {
    window.localStorage.removeItem(getPinReactionStorageKey(roomId, memberId));
    return {};
  }
};

const saveStoredPinReactions = (
  roomId: string,
  memberId: string,
  reactions: Record<string, ReactionType>,
) => {
  window.localStorage.setItem(
    getPinReactionStorageKey(roomId, memberId),
    JSON.stringify(reactions),
  );
};

const getLinkHost = (url: string | null) => {
  if (!url) {
    return "";
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const getPinDisplayTitle = (pin: Pin) =>
  pin.previewTitle?.trim() || pin.title || getLinkHost(pin.url) || "여행 링크";

const getPinSiteName = (pin: Pin) =>
  pin.previewSiteName?.trim() || getLinkHost(pin.url);

const formatSavedDate = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const getCalendarDays = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: Array<{ dateKey: string; day: number } | null> = [];

  for (let index = 0; index < firstDay; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDate; day += 1) {
    const date = new Date(year, month, day);

    days.push({
      dateKey: formatDateKey(date),
      day,
    });
  }

  return days;
};

const formatDateLabel = (dateKey: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(parseDateKey(dateKey));

const formatConfirmedDate = (room: Room) => {
  if (!room.confirmedStartDate || !room.confirmedEndDate) {
    return null;
  }

  if (room.confirmedStartDate === room.confirmedEndDate) {
    return formatDateLabel(room.confirmedStartDate);
  }

  return `${formatDateLabel(room.confirmedStartDate)} - ${formatDateLabel(
    room.confirmedEndDate,
  )}`;
};

const getStatusMemberNames = (status: AvailableDateStatus) =>
  status.availableMembers ??
  status.members?.map((availableMember) => availableMember.nickname) ??
  [];

const getStatusMemberIds = (status: AvailableDateStatus) =>
  status.members?.map((availableMember) => availableMember.id) ?? [];

const formatDateWithDots = (dateKey: string | null) =>
  dateKey ? dateKey.replaceAll("-", ".") : "";

const formatSummaryDate = (confirmedDate: RoomSummary["confirmedDate"]) => {
  if (!confirmedDate?.startDate || !confirmedDate.endDate) {
    return "📅 여행 날짜를 정하는 중";
  }

  const startDate = formatDateWithDots(confirmedDate.startDate);
  const endDate = formatDateWithDots(confirmedDate.endDate);

  return startDate === endDate ? startDate : `${startDate} ~ ${endDate}`;
};

const getSummaryMemberKey = (member: SummaryMember, index: number) =>
  typeof member === "string"
    ? `${member}-${index}`
    : member.id ?? member.memberId ?? member.nickname ?? `member-${index}`;

const getSummaryMemberName = (member: SummaryMember) =>
  typeof member === "string"
    ? member
    : member.nickname ?? member.name ?? "익명";

const getSummaryPinKey = (pin: SummaryPin, index: number) =>
  pin.pinId ?? pin.id ?? `${pin.title ?? "pin"}-${index}`;

const getSummaryPinTitle = (pin: SummaryPin) =>
  pin.previewTitle?.trim() ||
  pin.title?.trim() ||
  pin.memo?.trim() ||
  "여행 장소";

const getSummaryPinCount = (
  pin: SummaryPin,
  reactionType: ReactionType,
) =>
  reactionType === "MUST"
    ? pin.mustCount ?? pin.reactionCounts?.mustCount ?? 0
    : pin.wantCount ?? pin.reactionCounts?.wantCount ?? 0;

function InviteLinkCard({ inviteUrl, isCopied, onCopy }: InviteLinkCardProps) {
  return (
    <div className="rounded-[8px] border border-[#ead8d0] bg-white/70 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#b76478]">초대 링크</p>
          <p className="mt-1 truncate text-sm font-semibold text-[#5d4640]">
            {inviteUrl || "초대 링크를 준비 중이에요"}
          </p>
        </div>
        <Button
          type="button"
          onClick={onCopy}
          disabled={!inviteUrl}
          className="h-10 shrink-0 rounded-[8px] bg-[#df7f95] px-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#cf6f86]"
        >
          {isCopied ? "복사됨" : "복사"}
        </Button>
      </div>
    </div>
  );
}

const parseStoredMember = (roomId: string): MemberStorage | null => {
  try {
    const storedValue = window.localStorage.getItem(getStorageKey(roomId));

    if (!storedValue) {
      return null;
    }

    const parsed = JSON.parse(storedValue) as Partial<MemberStorage>;

    if (
      parsed.roomId !== roomId ||
      !parsed.memberId ||
      !parsed.nickname
    ) {
      window.localStorage.removeItem(getStorageKey(roomId));
      return null;
    }

    return {
      memberId: parsed.memberId,
      nickname: parsed.nickname,
      roomId: parsed.roomId,
    };
  } catch {
    window.localStorage.removeItem(getStorageKey(roomId));
    return null;
  }
};

function HomeEmptyCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="tripmate-card rounded-[8px] border-dashed p-5 text-center">
      <p className="text-3xl" aria-hidden="true">
        {icon}
      </p>
      <p className="mt-3 text-base font-bold text-[#3b2926]">{title}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[#7b6a63]">
        {description}
      </p>
    </div>
  );
}

function HomeTab({ room, roomId }: HomeTabProps) {
  const [summary, setSummary] = useState<RoomSummary | null>(null);
  const [homeBuckets, setHomeBuckets] = useState<BucketItem[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    setSummaryError("");

    try {
      const [summaryResponse, bucketsResponse] = await Promise.all([
        fetch(`/api/rooms/${encodeURIComponent(roomId)}/summary`),
        fetch(`/api/rooms/${encodeURIComponent(roomId)}/buckets`),
      ]);
      const summaryResult = (await summaryResponse.json()) as
        | ApiSuccess<RoomSummary>
        | ApiError;
      const bucketsResult = (await bucketsResponse.json()) as
        | ApiSuccess<BucketItem[]>
        | ApiError;

      if (!summaryResponse.ok || !summaryResult.success) {
        throw new Error(
          summaryResult.success
            ? "홈 화면을 불러오지 못했어요."
            : summaryResult.message,
        );
      }

      if (!bucketsResponse.ok || !bucketsResult.success) {
        throw new Error(
          bucketsResult.success
            ? "버킷리스트를 불러오지 못했어요."
            : bucketsResult.message,
        );
      }

      setSummary(summaryResult.data);
      setHomeBuckets(bucketsResult.data);
    } catch (error) {
      setSummaryError(
        error instanceof Error
          ? error.message
          : "홈 화면을 불러오지 못했어요.",
      );
    } finally {
      setIsLoadingSummary(false);
    }
  }, [roomId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchSummary();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchSummary]);

  const fallbackConfirmedDate =
    room.confirmedStartDate && room.confirmedEndDate
      ? {
          startDate: room.confirmedStartDate,
          endDate: room.confirmedEndDate,
        }
      : null;
  const roomTitle = summary?.roomTitle ?? room.title;
  const confirmedDate = summary?.confirmedDate ?? fallbackConfirmedDate;
  const members = summary?.members ?? [];
  const topMustPins = summary?.topMustPins ?? [];
  const topWantPins = summary?.topWantPins ?? [];
  const pinCount = summary?.pinCount ?? 0;
  const moodPins = [...topMustPins, ...topWantPins].slice(0, 4);
  const recentBuckets = homeBuckets.slice(-3).reverse();

  return (
    <section className="mt-5 space-y-4">
      <div className="tripmate-paper overflow-hidden rounded-[8px] border border-[#ead8d0] shadow-[0_24px_70px_rgba(111,75,58,0.12)]">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#c07084]">
                travel cover
              </p>
              <h2 className="mt-2 wrap-break-word text-4xl font-black leading-tight text-[#32231f] sm:text-5xl">
                🌊 {roomTitle}
              </h2>
              <p className="mt-4 inline-flex rounded-full bg-white/75 px-4 py-2 text-sm font-bold text-[#7b5f54] shadow-sm">
                {formatSummaryDate(confirmedDate)}
              </p>
              <p className="mt-5 max-w-md text-base font-semibold leading-8 text-[#7b5f54]">
                친구들과 저장한 장소와 하고 싶은 순간들이 모여서 우리만의
                여행 분위기가 만들어지고 있어요.
              </p>
            </div>
            <div className="grid w-full max-w-xs grid-cols-2 gap-3 sm:shrink-0">
              <div className="tripmate-sticker aspect-[4/5] rounded-[8px] bg-[#dff3fb] p-3 text-[#31556b]">
                <span className="text-3xl" aria-hidden="true">
                  📌
                </span>
                <p className="mt-8 text-sm font-black leading-snug">
                  저장한 장소를
                  <br />
                  같이 고르는 중
                </p>
              </div>
              <div className="tripmate-sticker mt-8 aspect-square rounded-[8px] bg-[#ffe6ee] p-3 text-[#7a2f48]">
                <span className="text-3xl" aria-hidden="true">
                  ✨
                </span>
                <p className="mt-5 text-sm font-black leading-snug">
                  하고 싶은
                  <br />
                  순간들
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoadingSummary ? (
        <div className="tripmate-card rounded-[8px] p-6 text-center">
          <p className="text-2xl" aria-hidden="true">
            🧳
          </p>
          <p className="mt-3 text-base font-bold text-[#3b2926]">
            여행 준비 노트를 불러오는 중이에요
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 rounded-[8px] bg-[#fff0f4]" />
            ))}
          </div>
        </div>
      ) : summaryError ? (
        <div
          className="tripmate-card rounded-[8px] p-6 text-center"
          role="alert"
        >
          <p className="text-2xl" aria-hidden="true">
            💌
          </p>
          <p className="mt-3 text-base font-bold text-[#3b2926]">
            홈 화면을 잠시 불러오지 못했어요
          </p>
          <p className="mt-2 text-sm leading-6 text-[#8b736c]">
            {summaryError}
          </p>
          <Button
            type="button"
            onClick={fetchSummary}
            className="mt-4 h-10 rounded-[8px] bg-[#df7f95] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#cf6f86]"
          >
            다시 불러오기
          </Button>
        </div>
      ) : (
        <>
          <div className="tripmate-card rounded-[8px] p-5">
            <h3 className="text-lg font-bold text-[#241817]">
              👯 함께 떠나는 사람들
            </h3>
            {members.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {members.map((member, index) => (
                  <span
                    key={getSummaryMemberKey(member, index)}
                    className="rounded-full border border-[#ead8d0] bg-[#fff8fb] px-4 py-2 text-sm font-bold text-[#7a4a57] shadow-sm"
                  >
                    {getSummaryMemberName(member)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#8b736c]">
                초대 링크를 보내고 함께 떠날 친구를 기다리는 중이에요.
              </p>
            )}
          </div>

          <div className="tripmate-card rounded-[8px] p-5">
            <h3 className="text-lg font-bold text-[#241817]">
              📌 최근 저장된 핀 미리보기
            </h3>
            {moodPins.length > 0 ? (
              <div className="mt-4 columns-1 gap-3 sm:columns-2">
                {moodPins.map((pin, index) => (
                  <article
                    key={getSummaryPinKey(pin, index)}
                    className={`mb-3 break-inside-avoid rounded-[8px] p-4 shadow-sm ${
                      index % 2 === 0
                        ? "bg-[#fff2d8] text-[#76552a]"
                        : "bg-[#fff0f4] text-[#7a2f48]"
                    }`}
                  >
                    <p className="text-3xl" aria-hidden="true">
                      {index % 2 === 0 ? "⭐" : "❤️"}
                    </p>
                    <p className="mt-6 wrap-break-word text-lg font-black leading-snug">
                      {getSummaryPinTitle(pin)}
                    </p>
                    <p className="mt-2 text-sm font-bold opacity-75">
                      친구들이 눈여겨보는 장소
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <HomeEmptyCard
                  icon="📌"
                  title="아직 저장된 장소가 없어요"
                  description="릴스나 블로그 링크를 저장해보세요"
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="tripmate-card rounded-[8px] p-5">
              <h3 className="text-lg font-bold text-[#241817]">
                🔥 다들 가장 가고 싶어 하는 곳
              </h3>
              {topMustPins.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {topMustPins.map((pin, index) => (
                    <article
                      key={getSummaryPinKey(pin, index)}
                      className="rounded-[8px] bg-[#fff7dc] p-4 shadow-sm"
                    >
                      <p className="wrap-break-word text-base font-bold text-[#4b3410]">
                        ⭐ {getSummaryPinTitle(pin)}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#7a6220]">
                        {getSummaryPinCount(pin, "MUST")}명이 꼭 가고 싶어 해
                      </p>
                    </article>
                  ))}
                </div>
              ) : pinCount === 0 ? (
                <div className="mt-4">
                  <HomeEmptyCard
                    icon="📌"
                    title="아직 저장된 장소가 없어요"
                    description="릴스나 블로그 링크를 저장해보세요"
                  />
                </div>
              ) : (
                <p className="mt-4 rounded-[8px] bg-[#fff7dc] p-4 text-sm font-semibold leading-6 text-[#7a6220]">
                  별표가 모이면 친구들이 제일 기대하는 장소가 여기에 떠요.
                </p>
              )}
            </div>

            <div className="tripmate-card rounded-[8px] p-5">
              <h3 className="text-lg font-bold text-[#241817]">
                💖 관심 많은 장소
              </h3>
              {topWantPins.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {topWantPins.map((pin, index) => (
                    <article
                      key={getSummaryPinKey(pin, index)}
                      className="rounded-[8px] bg-[#fff0f4] p-4 shadow-sm"
                    >
                      <p className="wrap-break-word text-base font-bold text-[#7a2f48]">
                        ❤️ {getSummaryPinTitle(pin)}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#b94a6b]">
                        {getSummaryPinCount(pin, "WANT")}명이 가고 싶어 해
                      </p>
                    </article>
                  ))}
                </div>
              ) : pinCount === 0 ? (
                <p className="mt-4 rounded-[8px] bg-[#fff0f4] p-4 text-sm font-semibold leading-6 text-[#b94a6b]">
                  장소를 저장하면 친구들의 관심이 쌓이는 걸 볼 수 있어요.
                </p>
              ) : (
                <p className="mt-4 rounded-[8px] bg-[#fff0f4] p-4 text-sm font-semibold leading-6 text-[#b94a6b]">
                  하트가 쌓이면 가볍게 들러보고 싶은 곳이 여기에 모여요.
                </p>
              )}
            </div>
          </div>

          <div className="tripmate-card rounded-[8px] bg-[#fffdf7] p-5">
            <h3 className="text-lg font-bold text-[#241817]">
              📝 최근 버킷리스트
            </h3>
            {recentBuckets.length === 0 ? (
              <div className="mt-4">
                <HomeEmptyCard
                  icon="✨"
                  title="하고 싶은 걸 적어보세요"
                  description="첫 버킷리스트를 남겨보세요"
                />
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                {recentBuckets.map((bucket, index) => {
                  const bucketId = bucket.bucketId ?? bucket.id ?? `${bucket.content}-${index}`;
                  const authorName =
                    bucket.author?.nickname ??
                    bucket.member?.nickname ??
                    bucket.member?.name ??
                    "익명";

                  return (
                    <article
                      key={bucketId}
                      className={`rounded-[8px] border border-white p-4 shadow-sm ${
                        bucketPastelColors[index % bucketPastelColors.length]
                      }`}
                    >
                      <p className="text-2xl" aria-hidden="true">
                        {index === 0 ? "✨" : index === 1 ? "📍" : "🌿"}
                      </p>
                      <p className="mt-3 wrap-break-word text-base font-black leading-snug text-[#32231f]">
                        “{bucket.content}”
                      </p>
                      <p className="mt-2 text-xs font-bold text-[#7b6a63]">
                        {authorName}이 적었어요
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="tripmate-card rounded-[8px] bg-[#f4fbeb] p-5">
            <p className="text-lg font-bold text-[#374b18]">
              ✨ 여행 준비 중
            </p>
            <p className="mt-3 text-base font-semibold leading-8 text-[#52613b]">
              친구들이 저장한 장소와
              <br />
              버킷리스트를 보며
              <br />
              우리만의 여행을 만들어가고 있어
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function DateStep({
  room,
  roomId,
  member,
  onRoomUpdate,
  onConfirmed,
}: DateStepProps) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();

    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateStatuses, setDateStatuses] = useState<AvailableDateStatus[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [isSavingDates, setIsSavingDates] = useState(false);
  const [confirmingDate, setConfirmingDate] = useState<string | null>(null);
  const [dateError, setDateError] = useState("");
  const [dateNotice, setDateNotice] = useState("");

  const confirmedDateLabel = formatConfirmedDate(room);
  const selectedDateSet = new Set(selectedDates);
  const todayKey = formatDateKey(new Date());
  const calendarDays = getCalendarDays(calendarMonth);
  const maxCount = Math.max(
    0,
    ...dateStatuses.map((dateStatus) => dateStatus.count),
  );

  const [confirmMode, setConfirmMode] = useState(false);
  const [confirmStart, setConfirmStart] = useState<string | null>(
    room.confirmedStartDate ?? null,
  );
  const [confirmEnd, setConfirmEnd] = useState<string | null>(
    room.confirmedEndDate ?? null,
  );

  const { memberColorMap, memberNameMap } = useMemo(() => {
    const nameMap = new Map<string, string>();
    const ids: string[] = [];

    dateStatuses.forEach((ds) => {
      if (ds.members && ds.members.length > 0) {
        ds.members.forEach((m) => {
          if (!nameMap.has(m.id)) {
            nameMap.set(m.id, m.nickname);
            ids.push(m.id);
          }
        });
      } else if (ds.availableMembers && ds.availableMembers.length > 0) {
        ds.availableMembers.forEach((nick) => {
          if (!nameMap.has(nick)) {
            nameMap.set(nick, nick);
            ids.push(nick);
          }
        });
      }
    });

    const colorMap = new Map<string, string>();
    ids.forEach((id, idx) => {
      colorMap.set(id, dateMemberColors[idx % dateMemberColors.length]);
    });

    return { memberColorMap: colorMap, memberNameMap: nameMap };
  }, [dateStatuses]);

  const fetchDateStatuses = useCallback(
    async (options: { keepSelection?: boolean } = {}) => {
      setIsLoadingDates(true);
      setDateError("");

      try {
        const response = await fetch(
          `/api/rooms/${encodeURIComponent(roomId)}/available-dates`,
        );
        const result = (await response.json()) as
          | ApiSuccess<AvailableDateStatus[]>
          | ApiError;

        if (!response.ok || !result.success) {
          throw new Error(
            result.success
              ? "날짜 현황을 불러오지 못했어요."
              : result.message,
          );
        }

        setDateStatuses(result.data);

        if (!options.keepSelection) {
          const myDates = result.data
            .filter((dateStatus) =>
              getStatusMemberIds(dateStatus).includes(member.memberId),
            )
            .map((dateStatus) => dateStatus.date);

          setSelectedDates(myDates);

          if (myDates[0]) {
            const firstSavedDate = parseDateKey(myDates[0]);

            setCalendarMonth(
              new Date(
                firstSavedDate.getFullYear(),
                firstSavedDate.getMonth(),
                1,
              ),
            );
          }
        }
      } catch (error) {
        setDateError(
          error instanceof Error
            ? error.message
            : "날짜 현황을 불러오지 못했어요.",
        );
      } finally {
        setIsLoadingDates(false);
      }
    },
    [member.memberId, roomId],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchDateStatuses();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchDateStatuses]);

  const toggleDate = (dateKey: string) => {
    setSelectedDates((current) =>
      current.includes(dateKey)
        ? current.filter((selectedDate) => selectedDate !== dateKey)
        : [...current, dateKey].sort(),
    );
    setDateError("");
    setDateNotice("");
  };

  const handleSaveDates = async () => {
    if (selectedDates.length === 0) {
      setDateError("가능한 날짜를 하나 이상 골라줘.");
      return;
    }

    setIsSavingDates(true);
    setDateError("");
    setDateNotice("");

    try {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/available-dates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberId: member.memberId,
            dates: selectedDates,
          }),
        },
      );
      const result = (await response.json()) as ApiSuccess<unknown> | ApiError;

      if (!response.ok || !result.success) {
        throw new Error(
          result.success ? "가능한 날짜를 저장하지 못했어요." : result.message,
        );
      }

      setDateNotice("저장됐어요. 친구들이랑 가장 많이 겹치는 날을 찾아볼게.");
      await fetchDateStatuses({ keepSelection: true });
    } catch (error) {
      setDateError(
        error instanceof Error
          ? error.message
          : "가능한 날짜를 저장하지 못했어요.",
      );
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleConfirmDate = async (dateKey: string) => {
    setConfirmingDate(dateKey);
    setDateError("");
    setDateNotice("");

    try {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/confirmed-date`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate: dateKey,
            endDate: dateKey,
          }),
        },
      );
      const result = (await response.json()) as ApiSuccess<Room> | ApiError;

      if (!response.ok || !result.success) {
        throw new Error(
          result.success ? "최종 날짜를 확정하지 못했어요." : result.message,
        );
      }

      onRoomUpdate(result.data);
      setDateNotice("여행 날짜가 확정됐어요. 이제 여행 아이디어를 모아볼게.");
      onConfirmed();
    } catch (error) {
      setDateError(
        error instanceof Error
          ? error.message
          : "최종 날짜를 확정하지 못했어요.",
      );
    } finally {
      setConfirmingDate(null);
    }
  };

  return (
    <section className="mt-5">
      {confirmedDateLabel ? (
        <div className="mb-4 inline-flex rounded-full border border-[#d7eadf] bg-[#f4fbeb] px-4 py-2 text-sm font-bold text-[#52613b] shadow-sm">
          <p>📅 {confirmedDateLabel}</p>
        </div>
      ) : null}

      <div className="tripmate-paper rounded-[8px] border border-[#ead8d0] p-5 shadow-[0_16px_50px_rgba(111,75,58,0.1)] sm:p-6">
        <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#b76478]">
          <CalendarDays className="size-4" aria-hidden="true" />
          날짜 맞추기
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight">
          우리 언제 떠날까?
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-[#7b5f54]">
          가능한 날에 친구들의 색상 점이 하나씩 쌓여요.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[8px] border border-[#ead8d0] bg-white/70 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth((current) => addMonths(current, -1))
                }
                className="flex size-10 items-center justify-center rounded-[8px] bg-white text-[#7a5a53] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff0f4]"
                aria-label="이전 달"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <p className="text-base font-black text-[#32231f]">
                {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
              </p>
              <button
                type="button"
                onClick={() =>
                  setCalendarMonth((current) => addMonths(current, 1))
                }
                className="flex size-10 items-center justify-center rounded-[8px] bg-white text-[#7a5a53] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff0f4]"
                aria-label="다음 달"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#9a8179]">
              {weekdayLabels.map((weekday) => (
                <div key={weekday} className="py-2">
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((calendarDay, index) => {
                if (!calendarDay) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const status = dateStatuses.find(
                  (d) => d.date === calendarDay.dateKey,
                );
                const membersOnDate = status
                  ? (status.members ??
                    status.availableMembers?.map((nickname) => ({
                      id: nickname,
                      roomId,
                      nickname,
                    })) ??
                    [])
                  : [];
                const isSelected = selectedDateSet.has(calendarDay.dateKey);
                const isToday = calendarDay.dateKey === todayKey;
                const isMostOverlap = status && status.count === maxCount && status.count > 0;

                const confirmedStart = room.confirmedStartDate ? parseDateKey(room.confirmedStartDate) : null;
                const confirmedEnd = room.confirmedEndDate ? parseDateKey(room.confirmedEndDate) : null;
                const cellDate = parseDateKey(calendarDay.dateKey);
                const isInConfirmedRange =
                  confirmedStart && confirmedEnd
                    ? cellDate >= confirmedStart && cellDate <= confirmedEnd
                    : false;

                const selectingStart = confirmStart ? parseDateKey(confirmStart) : null;
                const selectingEnd = confirmEnd ? parseDateKey(confirmEnd) : null;
                const isInSelectingRange =
                  selectingStart && selectingEnd
                    ? cellDate >= selectingStart && cellDate <= selectingEnd
                    : selectingStart && !selectingEnd
                    ? cellDate.getTime() === selectingStart.getTime()
                    : false;

                const isConfirmedStart = room.confirmedStartDate === calendarDay.dateKey;
                const isConfirmedEnd = room.confirmedEndDate === calendarDay.dateKey;

                return (
                  <button
                    key={calendarDay.dateKey}
                    type="button"
                    onClick={() => {
                      if (confirmMode) {
                        if (!confirmStart) {
                          setConfirmStart(calendarDay.dateKey);
                        } else if (!confirmEnd) {
                          const start = parseDateKey(confirmStart!);
                          const picked = parseDateKey(calendarDay.dateKey);
                          if (picked < start) {
                            setConfirmEnd(confirmStart);
                            setConfirmStart(calendarDay.dateKey);
                          } else {
                            setConfirmEnd(calendarDay.dateKey);
                          }
                        } else {
                          setConfirmStart(calendarDay.dateKey);
                          setConfirmEnd(null);
                        }
                      } else {
                        toggleDate(calendarDay.dateKey);
                      }
                    }}
                    aria-pressed={isSelected}
                    className={`relative aspect-square flex flex-col items-start justify-between rounded-[8px] p-2 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      isInSelectingRange
                        ? "bg-[#dff3fb] text-[#31556b]"
                        : isSelected
                        ? "bg-[#ffe6ee] text-[#8f2947] ring-2 ring-[#f2a5ba]"
                        : "bg-white text-[#5d4640]"
                     } ${isMostOverlap ? "ring-1 ring-[#fce7ef]" : ""} ${isToday ? "outline-2 outline-offset-1 outline-[#bfe4eb]" : ""}`}>
                    {isInConfirmedRange ? (
                      <span
                        aria-hidden
                        className={`absolute inset-0 z-0 ${isConfirmedStart ? "rounded-l-[12px]" : ""} ${isConfirmedEnd ? "rounded-r-[12px]" : ""} rounded-[10px] bg-linear-to-b from-[#f8fdf6] to-[#f4fbeb] opacity-90`}
                      />
                    ) : null}
                    <div className="relative z-10 flex w-full items-center justify-between gap-2">
                      <span className="text-xs">{calendarDay.day}</span>
                      {status && status.count > 0 ? (
                        <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-[#7a5a53]">
                          {status.count}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex w-full items-end gap-1">
                      <div className="flex -space-x-1">
                        {membersOnDate.slice(0, 4).map((m, idx) => {
                          const id = m.id || m.nickname || String(idx);
                          const color = memberColorMap.get(id) ?? "bg-pink-200";

                          return (
                            <span
                              key={id}
                              title={m.nickname}
                              className={`${color} inline-block h-3 w-3 rounded-full ring-2 ring-white`}
                            />
                          );
                        })}
                        {membersOnDate.length > 4 ? (
                          <span className="ml-1 text-[11px] font-semibold text-[#6f5b56]">+{membersOnDate.length - 4}</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[8px] border border-[#ead8d0] bg-[#fff7ef]/85 p-4 shadow-sm">
            <p className="text-sm font-bold text-[#9b3f54]">친구 색상 스티커</p>
            <div className="mt-3 space-y-2">
              {Array.from(memberColorMap.entries()).map(([id, color]) => {
                const nickname = memberNameMap.get(id) ?? id;

                return (
                  <div key={id} className="flex items-center gap-3">
                    <span className={`${color} inline-block h-3 w-3 rounded-full ring-2 ring-white`} />
                    <span className="text-sm font-semibold text-[#5d4640]">{nickname}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <Button
                type="button"
                onClick={handleSaveDates}
                disabled={isSavingDates}
                className="h-12 w-full rounded-[8px] bg-[#df7f95] text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#cf6f86]"
              >
                <Check className="size-4" aria-hidden="true" />
                {isSavingDates ? "저장 중..." : "가능한 날짜 저장하기"}
              </Button>
            </div>

            <div className="mt-4 border-t border-[#f0dfe0] pt-4">
              <p className="text-sm font-semibold text-[#5d4640]">여행 기간 확정하기</p>
              <p className="mt-1 text-xs text-[#7b6a63]">시작일과 종료일을 달력에서 선택해 주세요.</p>

              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setConfirmMode((v) => !v);
                    if (!confirmMode) {
                      setConfirmStart(null);
                      setConfirmEnd(null);
                    }
                  }}
                  className={`h-10 rounded-[8px] text-sm font-bold ${confirmMode ? "bg-[#32231f] text-white" : "bg-white text-[#32231f]"}`}
                >
                  {confirmMode ? "선택 중" : "기간 선택"}
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    if (!confirmStart || !confirmEnd) {
                      setDateError("시작일과 종료일을 먼저 선택해 주세요.");
                      return;
                    }

                    try {
                      setIsSavingDates(true);
                      const response = await fetch(
                        `/api/rooms/${encodeURIComponent(roomId)}/confirmed-date`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ startDate: confirmStart, endDate: confirmEnd }),
                        },
                      );
                      const result = (await response.json()) as ApiSuccess<Room> | ApiError;

                      if (!response.ok || !result.success) {
                        throw new Error(result.success ? "확정 실패" : result.message);
                      }

                      onRoomUpdate(result.data);
                      setDateNotice("여행 기간이 확정되었어요.");
                      setConfirmMode(false);
                    } catch (err) {
                      setDateError(err instanceof Error ? err.message : String(err));
                    } finally {
                      setIsSavingDates(false);
                    }
                  }}
                  className="h-10 rounded-[8px] bg-[#f4fbeb] text-[#52613b] text-sm font-bold shadow-sm"
                >
                  확정하기
                </Button>
              </div>

              <div className="mt-3 text-sm text-[#6f5b56]">
                <div>시작: {confirmStart ?? "선택 안됨"}</div>
                <div>종료: {confirmEnd ?? "선택 안됨"}</div>
              </div>
            </div>
          </div>
        </div>

        {dateError ? (
          <p className="mt-4 rounded-[8px] border border-[#f2d4e1] bg-white p-3 text-sm font-semibold text-[#c53f5d]">
            {dateError}
          </p>
        ) : null}
        {dateNotice ? (
          <p className="mt-4 rounded-[8px] border border-[#d7eadf] bg-[#f4fbeb] p-3 text-sm font-semibold text-[#52613b]">
            {dateNotice}
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#52613b]">
              <Users className="size-4" aria-hidden="true" />
              날짜 현황
            </p>
            <h3 className="mt-1 text-xl font-bold">
              친구들이랑 가장 많이 겹치는 날
            </h3>
          </div>
        </div>

        {isLoadingDates ? (
          <div className="mt-4 rounded-[8px] border border-[#f2d4e1] bg-white p-6 text-center text-sm text-[#8b736c]">
            날짜 현황을 불러오는 중이에요.
          </div>
        ) : dateStatuses.length === 0 ? (
          <div className="mt-4 rounded-[8px] border border-[#f2d4e1] bg-white p-6 text-center">
            <p className="text-base font-bold">아직 모인 날짜가 없어요</p>
            <p className="mt-2 text-sm text-[#8b736c]">
              내가 가능한 날짜를 먼저 저장해줘.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dateStatuses.map((dateStatus) => {
              const isBestDate =
                dateStatus.count === maxCount && dateStatus.count > 0;
              const isConfirmedDate =
                room.confirmedStartDate === dateStatus.date &&
                room.confirmedEndDate === dateStatus.date;
              const memberNames = getStatusMemberNames(dateStatus);

              return (
                <article
                  key={dateStatus.date}
                  className={`rounded-[8px] border p-4 shadow-sm ${
                    isBestDate
                      ? "border-[#f2a5ba] bg-[#fff0f4]"
                      : "border-[#ead7e4] bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-[#241817]">
                        {formatDateLabel(dateStatus.date)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#6f5b56]">
                        {dateStatus.count}명 가능
                      </p>
                    </div>
                    {isBestDate ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#b94a6b]">
                        ✨ 가장 많이 가능
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {memberNames.length > 0 ? (
                      memberNames.map((name) => (
                        <span
                          key={name}
                          className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#5d4640]"
                        >
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-[#8b736c]">
                        아직 이름이 없어요.
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleConfirmDate(dateStatus.date)}
                    disabled={Boolean(confirmingDate) || isConfirmedDate}
                    className={`mt-4 h-10 w-full rounded-[8px] text-sm font-bold shadow-sm ${
                      isConfirmedDate
                        ? "bg-[#f4fbeb] text-[#52613b] hover:bg-[#f4fbeb]"
                        : "bg-[#241817] text-white hover:bg-[#3c2b28]"
                    }`}
                  >
                    {isConfirmedDate
                      ? "확정됨"
                      : confirmingDate === dateStatus.date
                        ? "확정 중..."
                        : "이 날로 떠나기"}
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;

  const [room, setRoom] = useState<Room | null>(null);
  const [member, setMember] = useState<MemberStorage | null>(null);
  const [nickname, setNickname] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("홈");
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [isEntering, setIsEntering] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [isInviteCopied, setIsInviteCopied] = useState(false);
  const [roomError, setRoomError] = useState("");
  const [entryError, setEntryError] = useState("");
  const [pins, setPins] = useState<Pin[]>([]);
  const [pinForm, setPinForm] = useState<PinForm>(defaultPinForm);
  const [myPinReactions, setMyPinReactions] = useState<
    Record<string, ReactionType>
  >({});
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [isCreatingPin, setIsCreatingPin] = useState(false);
  const [reactingPinId, setReactingPinId] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [pinError, setPinError] = useState("");
  const [pinFormError, setPinFormError] = useState("");
  const memberId = member?.memberId;

  useEffect(() => {
    let isMounted = true;

    const loadRoom = async () => {
      if (!roomId) {
        setRoomError("여행방 주소가 올바르지 않습니다.");
        setIsLoadingRoom(false);
        return;
      }

      setIsLoadingRoom(true);
      setRoomError("");
      setEntryError("");
      setInviteUrl(`${window.location.origin}/room/${roomId}`);
      setIsInviteCopied(false);

      try {
        const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
        const result = (await response.json()) as ApiSuccess<Room> | ApiError;

        if (!response.ok || !result.success) {
          throw new Error(
            result.success
              ? "여행방 정보를 불러오지 못했어요."
              : result.message,
          );
        }

        if (!isMounted) {
          return;
        }

        const storedMember = parseStoredMember(roomId);

        setRoom(result.data);
        setMember(storedMember);
        setActiveTab("홈");
        setPins([]);
        setMyPinReactions(
          storedMember
            ? parseStoredPinReactions(roomId, storedMember.memberId)
            : {},
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRoom(null);
        setMember(null);
        setPins([]);
        setMyPinReactions({});
        setRoomError(
          error instanceof Error
            ? error.message
            : "여행방 정보를 불러오지 못했어요.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingRoom(false);
        }
      }
    };

    loadRoom();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const fetchPins = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!roomId || !memberId) {
        return;
      }

      await Promise.resolve();

      if (!options.silent) {
        setIsLoadingPins(true);
      }

      setPinError("");

      try {
        const response = await fetch(
          `/api/rooms/${encodeURIComponent(roomId)}/pins`,
        );
        const result = (await response.json()) as ApiSuccess<Pin[]> | ApiError;

        if (!response.ok || !result.success) {
          throw new Error(
            result.success ? "핀 목록을 불러오지 못했어요." : result.message,
          );
        }

        setPins(result.data);
      } catch (error) {
        setPinError(
          error instanceof Error
            ? error.message
            : "핀 목록을 불러오지 못했어요.",
        );
      } finally {
        if (!options.silent) {
          setIsLoadingPins(false);
        }
      }
    },
    [memberId, roomId],
  );

  useEffect(() => {
    if (!memberId) {
      return;
    }

    const timer = window.setTimeout(() => {
      fetchPins({ silent: activeTab !== "핀보드" });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeTab, fetchPins, memberId]);

  const handleCopyInviteUrl = async () => {
    if (!roomId) {
      return;
    }

    const url = inviteUrl || `${window.location.origin}/room/${roomId}`;

    try {
      await window.navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setInviteUrl(url);
    setIsInviteCopied(true);
    window.setTimeout(() => setIsInviteCopied(false), 1800);
  };

  const handleEnterRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!roomId) {
      setEntryError("여행방 주소가 올바르지 않습니다.");
      return;
    }

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      setEntryError("친구들이 알아볼 수 있는 닉네임을 적어주세요.");
      return;
    }

    setIsEntering(true);
    setEntryError("");

    try {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nickname: trimmedNickname,
          }),
        },
      );
      const result = (await response.json()) as
        | ApiSuccess<JoinMemberResponse>
        | ApiError;

      if (!response.ok || !result.success) {
        throw new Error(
          result.success ? "여행방에 입장하지 못했어요." : result.message,
        );
      }

      const memberId = result.data.memberId ?? result.data.id;

      if (!memberId) {
        throw new Error("입장 정보를 확인하지 못했어요.");
      }

      const memberInfo: MemberStorage = {
        memberId,
        nickname: result.data.nickname,
        roomId: result.data.roomId,
      };

      window.localStorage.setItem(
        getStorageKey(roomId),
        JSON.stringify(memberInfo),
      );
      setMember(memberInfo);
      setMyPinReactions(parseStoredPinReactions(roomId, memberInfo.memberId));
      setActiveTab("홈");
      setNickname("");
    } catch (error) {
      setEntryError(
        error instanceof Error ? error.message : "잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsEntering(false);
    }
  };

  const handleCreatePin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!roomId || !memberId) {
      setPinFormError("먼저 여행방에 입장해주세요.");
      return;
    }

    const url = pinForm.url.trim();
    const memo = pinForm.memo.trim();

    if (!url) {
      setPinFormError("저장할 링크를 입력해주세요.");
      return;
    }

    if (!isHttpUrl(url)) {
      setPinFormError("http 또는 https로 시작하는 링크를 입력해주세요.");
      return;
    }

    setIsCreatingPin(true);
    setPinFormError("");

    try {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/pins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberId,
            url,
            ...(memo ? { memo } : {}),
          }),
        },
      );
      const result = (await response.json()) as ApiSuccess<Pin> | ApiError;

      if (!response.ok || !result.success) {
        throw new Error(
          result.success ? "핀을 저장하지 못했어요." : result.message,
        );
      }

      setPinForm(defaultPinForm);
      await fetchPins({ silent: true });
    } catch (error) {
      setPinFormError(
        error instanceof Error ? error.message : "핀을 저장하지 못했어요.",
      );
    } finally {
      setIsCreatingPin(false);
    }
  };

  const handleTogglePinReaction = async (
    pinId: string,
    reactionType: ReactionType,
  ) => {
    if (!roomId || !memberId) {
      setPinError("먼저 여행방에 입장해주세요.");
      return;
    }

    const currentReaction = myPinReactions[pinId];
    const nextReactionType =
      currentReaction === reactionType ? "NONE" : reactionType;

    setReactingPinId(pinId);
    setPinError("");

    try {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/pins/${encodeURIComponent(pinId)}/reaction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberId,
            reactionType: nextReactionType,
          }),
        },
      );
      const result = (await response.json()) as ApiSuccess<unknown> | ApiError;

      if (!response.ok || !result.success) {
        throw new Error(
          result.success ? "반응을 저장하지 못했어요." : result.message,
        );
      }

      const nextReactions = { ...myPinReactions };

      if (nextReactionType === "NONE") {
        delete nextReactions[pinId];
      } else {
        nextReactions[pinId] = nextReactionType;
      }

      setMyPinReactions(nextReactions);
      saveStoredPinReactions(roomId, memberId, nextReactions);
      await fetchPins({ silent: true });
    } catch (error) {
      setPinError(
        error instanceof Error ? error.message : "반응을 저장하지 못했어요.",
      );
    } finally {
      setReactingPinId(null);
    }
  };

  if (isLoadingRoom) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5 text-[#32231f]">
        <div className="tripmate-card w-full max-w-sm rounded-[8px] p-6 text-center">
          <p className="text-3xl" aria-hidden="true">
            ✈️
          </p>
          <p className="mt-4 text-lg font-bold">여행방을 찾는 중이에요</p>
          <p className="mt-2 text-sm text-[#8b736c]">잠시만 기다려주세요.</p>
        </div>
      </main>
    );
  }

  if (roomError || !room) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5 text-[#32231f]">
        <div className="tripmate-card w-full max-w-sm rounded-[8px] p-6 text-center">
          <p className="text-3xl" aria-hidden="true">
            🧳
          </p>
          <h1 className="mt-4 text-xl font-bold">여행방을 찾을 수 없어요</h1>
          <p className="mt-3 text-sm leading-6 text-[#8b736c]">
            {roomError || "초대 링크를 다시 확인해주세요."}
          </p>
        </div>
      </main>
    );
  }

  const confirmedDateLabel = formatConfirmedDate(room);
  const displayTab = activeTab;

  return (
    <main className="min-h-dvh text-[#32231f]">
      <section className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-5 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ead8d0] bg-white/80 px-4 py-2 text-sm font-bold shadow-sm backdrop-blur">
            <span aria-hidden="true">✈️</span>
            <span>TripMate</span>
          </div>
          {member ? (
            <div className="rounded-full border border-[#ead8d0] bg-[#fff7ef]/85 px-4 py-2 text-sm font-bold text-[#7b5f54] shadow-sm">
              {member.nickname} 님
            </div>
          ) : null}
        </header>

        {!member ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <div className="tripmate-paper w-full max-w-md rounded-[8px] border border-[#ead8d0] p-5 shadow-[0_24px_70px_rgba(111,75,58,0.12)] sm:p-6">
              <div className="rounded-[8px] bg-[#fff0f4] p-5 shadow-sm">
                <p className="text-sm font-bold text-[#b76478]">
                  여행 초대장
                </p>
                <h1 className="mt-2 text-2xl font-bold leading-snug">
                  {room.title}
                </h1>
                <p className="mt-3 text-sm font-medium leading-6 text-[#7b5f54]">
                  닉네임을 적고 친구들이 모으는 여행 무드보드에 들어가요.
                </p>
              </div>

              <div className="mt-4">
                <InviteLinkCard
                  inviteUrl={inviteUrl}
                  isCopied={isInviteCopied}
                  onCopy={handleCopyInviteUrl}
                />
              </div>

              <form onSubmit={handleEnterRoom} className="mt-5">
                <label
                  htmlFor="nickname"
                  className="text-sm font-semibold text-[#5d4640]"
                >
                  닉네임
                </label>
                <input
                  id="nickname"
                  value={nickname}
                  onChange={(event) => {
                    setNickname(event.target.value);
                    if (entryError) {
                      setEntryError("");
                    }
                  }}
                  placeholder="예: 유진"
                  aria-invalid={Boolean(entryError)}
                  className="mt-3 h-12 w-full rounded-[8px] border border-[#ead8d0] bg-white/85 px-4 text-base font-semibold outline-none transition placeholder:text-[#c1a69a] focus:border-[#df8aa0] focus:ring-4 focus:ring-[#ffdce5]"
                />
                {entryError ? (
                  <p
                    className="mt-3 text-sm font-medium text-[#c53f5d]"
                    role="alert"
                    aria-live="polite"
                  >
                    {entryError}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-[#8b736c]">
                    로그인 없이 이 여행방에서만 사용할 이름이에요.
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isEntering}
                  className="mt-5 h-12 w-full rounded-[8px] bg-[#df7f95] text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#cf6f86]"
                >
                  {isEntering ? "입장하는 중..." : "입장하기"}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col py-6">
            <section className="tripmate-paper rounded-[8px] border border-[#ead8d0] p-5 shadow-[0_24px_70px_rgba(111,75,58,0.11)] sm:p-7">
              <p className="inline-flex rounded-full bg-[#fff0f4] px-4 py-2 text-sm font-bold text-[#b76478]">
                travel scrapbook
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                {room.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-8 text-[#7b5f54]">
                {confirmedDateLabel
                  ? "날짜가 정해졌어요. 이제 마음에 드는 장소와 하고 싶은 순간을 같이 모아보세요."
                  : "날짜는 천천히 정해도 괜찮아요. 먼저 가고 싶은 무드를 모아보세요."}
              </p>

              {confirmedDateLabel ? (
                <div className="mt-4 inline-flex rounded-full border border-[#d7eadf] bg-[#f4fbeb] px-4 py-2">
                  <p className="text-sm font-bold text-[#52613b]">
                    📅 {confirmedDateLabel}
                  </p>
                </div>
              ) : null}

              <div className="mt-5">
                <InviteLinkCard
                  inviteUrl={inviteUrl}
                  isCopied={isInviteCopied}
                  onCopy={handleCopyInviteUrl}
                />
              </div>
            </section>

            <nav className="sticky top-3 z-10 mt-5 grid grid-cols-4 gap-2 rounded-[8px] border border-[#ead8d0] bg-white/78 p-2 shadow-[0_14px_35px_rgba(111,75,58,0.08)] backdrop-blur">
              {tabs.map((tab) => {
                return (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => setActiveTab(tab.label)}
                    aria-pressed={displayTab === tab.label}
                    className={`flex h-16 flex-col items-center justify-center rounded-[8px] text-xs font-bold transition hover:-translate-y-0.5 hover:bg-[#fff0f4] hover:text-[#b76478] ${
                      displayTab === tab.label
                        ? "bg-[#fff0f4] text-[#b76478] shadow-sm"
                        : "text-[#7b5f54]"
                    }`}
                  >
                    <span className="text-lg" aria-hidden="true">
                      {tab.emoji}
                    </span>
                    <span className="mt-1">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {displayTab === "날짜" ? (
              <DateStep
                room={room}
                roomId={roomId}
                member={member}
                onRoomUpdate={setRoom}
                onConfirmed={() => setActiveTab("홈")}
              />
            ) : displayTab === "핀보드" ? (
              <section className="mt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#b76478]">
                      <Sparkles className="size-4" aria-hidden="true" />
                      핀보드
                    </p>
                    <h2 className="mt-1 text-3xl font-black leading-tight">
                      친구들이 저장한 여행 조각
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#7b5f54]">
                      릴스, 지도, 블로그 링크를 Pinterest 보드처럼 모아봐요.
                    </p>
                  </div>
                  <div className="hidden shrink-0 rotate-[-2deg] rounded-[8px] bg-[#fff7dc] px-4 py-3 text-right text-[#76552a] shadow-sm sm:block">
                    <p className="text-xs font-black">moodboard</p>
                    <p className="mt-1 text-sm font-bold">
                      저장한 장소를 넘겨보는 중
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleCreatePin}
                  className="tripmate-paper mt-5 rounded-[8px] border border-[#ead8d0] p-4 shadow-[0_16px_50px_rgba(111,75,58,0.1)]"
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.55fr)_auto] lg:items-end">
                    <label className="text-sm font-bold text-[#5d4640]">
                      <span className="inline-flex items-center gap-1.5">
                        <LinkIcon className="size-4" aria-hidden="true" />
                        링크
                      </span>
                      <input
                        value={pinForm.url}
                        onChange={(event) => {
                          setPinForm((current) => ({
                            ...current,
                            url: event.target.value,
                          }));
                          if (pinFormError) {
                            setPinFormError("");
                          }
                        }}
                        placeholder="https://www.instagram.com/..."
                        inputMode="url"
                        autoComplete="url"
                        className="mt-2 h-12 w-full rounded-[8px] border border-[#ead8d0] bg-white/85 px-4 text-base font-semibold outline-none transition placeholder:text-[#c1a69a] focus:border-[#df8aa0] focus:ring-4 focus:ring-[#ffdce5]"
                      />
                    </label>
                    <label className="text-sm font-bold text-[#5d4640]">
                      한줄 메모
                      <input
                        value={pinForm.memo}
                        onChange={(event) => {
                          setPinForm((current) => ({
                            ...current,
                            memo: event.target.value,
                          }));
                          if (pinFormError) {
                            setPinFormError("");
                          }
                        }}
                        placeholder="여기 꼭 가고 싶음"
                        className="mt-2 h-12 w-full rounded-[8px] border border-[#ead8d0] bg-white/85 px-4 text-base font-semibold outline-none transition placeholder:text-[#c1a69a] focus:border-[#df8aa0] focus:ring-4 focus:ring-[#ffdce5]"
                      />
                    </label>

                    <Button
                      type="submit"
                      disabled={isCreatingPin}
                      className="h-12 w-full rounded-[8px] bg-[#df7f95] px-5 text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#cf6f86] lg:w-auto"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      {isCreatingPin ? "저장 중" : "저장"}
                    </Button>
                  </div>

                  {pinFormError ? (
                    <p
                      className="mt-3 text-sm font-medium text-[#c53f5d]"
                      role="alert"
                    >
                      {pinFormError}
                    </p>
                  ) : null}
                </form>

                {pinError ? (
                  <p
                    className="mt-4 rounded-[8px] border border-[#f2d4e1] bg-white p-3 text-sm font-medium text-[#c53f5d]"
                    role="alert"
                  >
                    {pinError}
                  </p>
                ) : null}

                <div className="mt-5">
                  {isLoadingPins ? (
                    <div className="tripmate-card rounded-[8px] p-6 text-center text-sm font-semibold text-[#8b736c]">
                      핀을 불러오는 중이에요.
                    </div>
                  ) : pins.length === 0 ? (
                    <div className="tripmate-card rounded-[8px] p-8 text-center">
                      <div className="mx-auto flex size-14 items-center justify-center rounded-[8px] bg-[#dff3fb] text-[#31556b]">
                        <ImageIcon className="size-6" aria-hidden="true" />
                      </div>
                      <p className="mt-4 text-base font-black">
                        아직 저장된 링크가 없어요
                      </p>
                      <p className="mt-2 text-sm font-medium text-[#8b736c]">
                        첫 여행 아이디어를 남겨보세요.
                      </p>
                    </div>
                  ) : (
                    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                      {pins.map((pin) => {
                        const myReaction = myPinReactions[pin.id];
                        const title = getPinDisplayTitle(pin);
                        const siteName = getPinSiteName(pin);
                        const savedBy = pin.member?.nickname ?? "익명";
                        const previewContent = (
                          <>
                            <div className="relative aspect-4/5 w-full overflow-hidden bg-[#e9f4f1]">
                              {pin.previewImage ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={pin.previewImage}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                />
                              ) : (
                                <div className="flex size-full flex-col items-center justify-center gap-3 px-6 text-center text-[#4b6a60]">
                                  <ImageIcon
                                    className="size-9"
                                    aria-hidden="true"
                                  />
                                  <span className="max-w-full wrap-break-word text-sm font-bold">
                                    {siteName || "link"}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="p-4">
                              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#7b6a63]">
                                <span className="min-w-0 truncate">
                                  {siteName || "link"}
                                </span>
                                {pin.url ? (
                                  <ExternalLink
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                  />
                                ) : null}
                              </div>

                              <h3 className="mt-2 wrap-break-word text-lg font-bold leading-snug text-[#241817]">
                                {title}
                              </h3>

                              {pin.previewDescription ? (
                                <p className="mt-2 line-clamp-3 wrap-break-word text-sm leading-6 text-[#6f5b56]">
                                  {pin.previewDescription}
                                </p>
                              ) : null}

                              {pin.memo ? (
                                <p className="mt-3 wrap-break-word rounded-[8px] bg-[#fff5f0] px-3 py-2 text-sm font-semibold leading-6 text-[#9b3f54]">
                                  {pin.memo}
                                </p>
                              ) : null}

                              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#8b736c]">
                                <span className="min-w-0 truncate font-semibold">
                                  {savedBy} 저장
                                </span>
                                <span className="shrink-0">
                                  {formatSavedDate(pin.createdAt)}
                                </span>
                              </div>
                            </div>
                          </>
                        );

                        return (
                          <article
                            key={pin.id}
                            className="mb-4 break-inside-avoid overflow-hidden rounded-[8px] border border-[#ead8d0] bg-white/90 shadow-[0_14px_35px_rgba(111,75,58,0.09)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(111,75,58,0.14)]"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedPin(pin)}
                              className="group block w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#ffd7e0]"
                            >
                              {previewContent}
                            </button>

                            <div className="grid grid-cols-2 gap-2 border-t border-[#f3e2e8] bg-[#fffaf7] p-3">
                              <button
                                type="button"
                                disabled={reactingPinId === pin.id}
                                aria-pressed={myReaction === "MUST"}
                                aria-label={`꼭 가고 싶어요 ${pin.reactionCounts.mustCount}개`}
                                onClick={() =>
                                  handleTogglePinReaction(pin.id, "MUST")
                                }
                                className={`h-10 rounded-[8px] text-sm font-bold transition disabled:opacity-60 ${
                                  myReaction === "MUST"
                                    ? "bg-[#ffe7a6] text-[#68470d]"
                                    : "bg-[#fff7dc] text-[#7a6220] hover:bg-[#ffefb9]"
                                }`}
                              >
                                ⭐ {pin.reactionCounts.mustCount}
                              </button>
                              <button
                                type="button"
                                disabled={reactingPinId === pin.id}
                                aria-pressed={myReaction === "WANT"}
                                aria-label={`가보고 싶어요 ${pin.reactionCounts.wantCount}개`}
                                onClick={() =>
                                  handleTogglePinReaction(pin.id, "WANT")
                                }
                                className={`h-10 rounded-[8px] text-sm font-bold transition disabled:opacity-60 ${
                                  myReaction === "WANT"
                                    ? "bg-[#ffd2df] text-[#8f2947]"
                                    : "bg-[#fff0f4] text-[#b94a6b] hover:bg-[#ffdfe8]"
                                }`}
                              >
                                ❤️ {pin.reactionCounts.wantCount}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            ) : displayTab === "버킷리스트" ? (
              <BucketListSection roomId={roomId} member={member} />
            ) : (
              <HomeTab room={room} roomId={roomId} />
            )}
          </div>
        )}
      </section>
      {selectedPin ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-[#32231f]/45 px-4 py-5 backdrop-blur-sm sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="핀 상세 보기"
          onClick={() => setSelectedPin(null)}
        >
          <div
            className="max-h-[92dvh] w-full max-w-3xl overflow-auto rounded-[8px] bg-[#fffaf4] shadow-[0_28px_90px_rgba(50,35,31,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid gap-0 sm:grid-cols-[0.9fr_1fr]">
              <div className="min-h-64 bg-[#f3eadf]">
                {selectedPin.previewImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedPin.previewImage}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full max-h-[70dvh] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-8 text-center text-[#7b5f54]">
                    <ImageIcon className="size-12" aria-hidden="true" />
                    <p className="wrap-break-word text-lg font-black">
                      {getPinSiteName(selectedPin) || "saved place"}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#b76478]">
                      saved pin
                    </p>
                    <h2 className="mt-2 wrap-break-word text-2xl font-black leading-tight text-[#32231f]">
                      {getPinDisplayTitle(selectedPin)}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPin(null)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-lg font-black text-[#7b5f54] shadow-sm transition hover:bg-[#fff0f4]"
                    aria-label="닫기"
                  >
                    ×
                  </button>
                </div>

                {selectedPin.previewDescription ? (
                  <p className="mt-4 wrap-break-word text-sm font-medium leading-7 text-[#7b5f54]">
                    {selectedPin.previewDescription}
                  </p>
                ) : null}

                {selectedPin.memo ? (
                  <p className="mt-4 wrap-break-word rounded-[8px] bg-[#fff0f4] p-4 text-sm font-bold leading-7 text-[#9b3f54]">
                    {selectedPin.memo}
                  </p>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#fff7dc] px-3 py-2 text-sm font-bold text-[#7a6220]">
                    ⭐ {selectedPin.reactionCounts.mustCount}
                  </span>
                  <span className="rounded-full bg-[#fff0f4] px-3 py-2 text-sm font-bold text-[#b76478]">
                    ❤️ {selectedPin.reactionCounts.wantCount}
                  </span>
                  <span className="rounded-full bg-[#f4fbeb] px-3 py-2 text-sm font-bold text-[#52613b]">
                    {selectedPin.member?.nickname ?? "익명"} 저장
                  </span>
                </div>

                {selectedPin.url ? (
                  <a
                    href={selectedPin.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[#df7f95] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#cf6f86]"
                  >
                    원본 링크 열기
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function BucketListSection({
  roomId,
  member,
}: {
  roomId: string;
  member: MemberStorage | null;
}) {
  const [buckets, setBuckets] = useState<BucketItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});

  const fetchMembersList = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/members`);
      const json = (await res.json()) as ApiSuccess<BucketMember[]> | ApiError;
      if (!res.ok || !json.success) return;

      const map: Record<string, string> = {};
      json.data.forEach((m) => {
        const id = m.memberId ?? m.id;
        if (id) map[id] = m.nickname ?? m.name ?? map[id] ?? "익명";
      });
      setMemberMap(map);
    } catch {
      // ignore
    }
  }, [roomId]);

  const fetchBuckets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/buckets`);
      const json = (await res.json()) as ApiSuccess<BucketItem[]> | ApiError;
      if (!res.ok || !json.success) {
        throw new Error(
          json.success ? "불러오기를 실패했어요." : json.message,
        );
      }

      setBuckets(json.data);
      await fetchMembersList();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [fetchMembersList, roomId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchBuckets();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchBuckets]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchMembersList();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchMembersList]);

  const handleAdd = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError("내용을 입력해주세요.");
      return;
    }

    if (!member) {
      setError("먼저 여행방에 입장해주세요.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/buckets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.memberId, content: trimmed }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "저장에 실패했어요.");

      setContent("");
      await fetchBuckets();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (bucketId: string) => {
    if (!member) return;
    setIsDeleting(bucketId);
    setError(null);

    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/buckets/${encodeURIComponent(bucketId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.memberId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "삭제 실패");

      await fetchBuckets();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <section className="mt-5">
      <div className="tripmate-paper rounded-[8px] border border-[#ead8d0] p-5 shadow-[0_16px_50px_rgba(111,75,58,0.1)]">
        <p className="text-sm font-bold text-[#b76478]">✨ 이번 여행에서 꼭 하고 싶은 건?</p>
        <h2 className="mt-2 text-3xl font-black leading-tight text-[#32231f]">
          우리만의 여행 스티커
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-[#7b5f54]">
          사진 찍기, 맛집 가기, 밤바다 보기처럼 친구들과 하고 싶은 걸 적어봐요.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={content}
            onChange={(e) => { setContent(e.target.value); if (error) setError(null); }}
            placeholder="예: 광안리에서 단체 사진 찍기"
            className="h-12 flex-1 rounded-[8px] border border-[#ead8d0] bg-white/85 px-4 text-sm font-semibold outline-none placeholder:text-[#c1a69a] focus:border-[#df8aa0] focus:ring-4 focus:ring-[#ffdce5]"
          />
          <Button
            type="button"
            onClick={handleAdd}
            disabled={isSaving}
            className="h-12 rounded-[8px] bg-[#df7f95] text-white font-bold shadow-sm transition hover:-translate-y-0.5 hover:bg-[#cf6f86]"
          >
            {isSaving ? "붙이는 중..." : "스티커 붙이기"}
          </Button>
        </div>

        {error ? <p className="mt-3 text-sm text-[#c53f5d]">{error}</p> : null}
      </div>

      <div className="mt-4 grid gap-3">
        {isLoading ? (
          <div className="tripmate-card rounded-[8px] p-6 text-center text-sm font-semibold text-[#8b736c]">버킷리스트를 불러오는 중이에요.</div>
        ) : buckets.length === 0 ? (
          <div className="tripmate-card rounded-[8px] p-8 text-center">
            <p className="text-base font-black">아직 붙인 스티커가 없어요</p>
            <p className="mt-2 text-sm font-medium text-[#8b736c]">친구들과 하고 싶은 걸 먼저 적어볼래요?</p>
          </div>
        ) : (
          buckets.map((b, idx) => {
            const bucketId = b.bucketId ?? b.id;
            const authorId =
              b.author?.memberId ?? b.memberId ?? b.member?.memberId ?? b.member?.id ?? null;
            const authorName =
              b.author?.nickname ??
              b.member?.nickname ??
              b.member?.name ??
              (authorId ? memberMap[authorId] : undefined) ??
              (member && member.memberId === authorId ? member.nickname : undefined) ??
              "익명";

            const keyId = bucketId ?? `bucket-${idx}`;

            return (
              <article key={keyId} className={`relative overflow-hidden rounded-[8px] p-5 shadow-[0_12px_30px_rgba(111,75,58,0.08)] transition duration-200 hover:-translate-y-0.5 ${bucketPastelColors[idx % bucketPastelColors.length]} border border-white`}>
                <p className="text-2xl" aria-hidden="true">
                  {idx % 3 === 0 ? "🌿" : idx % 3 === 1 ? "📍" : "✨"}
                </p>
                <p className="mt-3 text-lg font-black leading-snug text-[#32231f]">“{b.content}”</p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#5d4640]"><span className="font-bold">{authorName}</span>이 적었어요</p>
                    <p className="text-xs text-[#7b6a63]">{b.createdAt ? formatSavedDate(b.createdAt) : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {bucketId && member && authorId && member.memberId === authorId ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(bucketId)}
                        disabled={isDeleting === bucketId}
                        className="h-8 rounded-[8px] bg-white/70 px-3 text-xs font-bold text-[#6f5b56] shadow-sm transition hover:bg-white"
                      >
                        {isDeleting === bucketId ? "삭제중..." : "삭제"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
