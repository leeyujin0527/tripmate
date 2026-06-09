"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

type PinCategory =
  | "PHOTO_SPOT"
  | "CAFE"
  | "RESTAURANT"
  | "TOUR"
  | "ACCOMMODATION"
  | "ACTIVITY"
  | "ETC";

type PinSort = "latest" | "popular" | "must" | "want";

type ReactionType = "MUST" | "WANT";

type ActiveTab = "홈" | "날짜" | "핀보드" | "버킷리스트";

type Pin = {
  id: string;
  roomId: string;
  memberId: string;
  title: string;
  category: PinCategory;
  url: string | null;
  memo: string | null;
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
  title: string;
  category: PinCategory;
  url: string;
  memo: string;
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

const tabs: TabItem[] = [
  { label: "홈", emoji: "🏠" },
  { label: "날짜", emoji: "🗓️" },
  { label: "핀보드", emoji: "📌" },
  { label: "버킷리스트", emoji: "📝" },
];

const pinCategories: { value: PinCategory; label: string; emoji: string }[] = [
  { value: "PHOTO_SPOT", label: "포토스팟", emoji: "📸" },
  { value: "CAFE", label: "카페", emoji: "☕️" },
  { value: "RESTAURANT", label: "맛집", emoji: "🍽️" },
  { value: "TOUR", label: "관광", emoji: "🗺️" },
  { value: "ACCOMMODATION", label: "숙소", emoji: "🛏️" },
  { value: "ACTIVITY", label: "액티비티", emoji: "🎟️" },
  { value: "ETC", label: "기타", emoji: "✨" },
];

const pinSortOptions: { value: PinSort; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "popular", label: "인기순" },
  { value: "must", label: "⭐ 많은 순" },
  { value: "want", label: "❤️ 많은 순" },
];

const defaultPinForm: PinForm = {
  title: "",
  category: "PHOTO_SPOT",
  url: "",
  memo: "",
};

const getStorageKey = (roomId: string) => `tripmate_member_${roomId}`;

const getPinReactionStorageKey = (roomId: string, memberId: string) =>
  `tripmate_pin_reactions_${roomId}_${memberId}`;

const getCategoryMeta = (category: PinCategory) =>
  pinCategories.find((item) => item.value === category) ?? pinCategories[6];

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

function InviteLinkCard({ inviteUrl, isCopied, onCopy }: InviteLinkCardProps) {
  return (
    <div className="rounded-[8px] border border-[#f2d4e1] bg-[#fffafd] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#b94a6b]">초대 링크</p>
          <p className="mt-1 truncate text-sm font-medium text-[#5d4640]">
            {inviteUrl || "초대 링크를 준비 중이에요"}
          </p>
        </div>
        <Button
          type="button"
          onClick={onCopy}
          disabled={!inviteUrl}
          className="h-10 shrink-0 rounded-[8px] bg-[#f26788] px-3 text-sm font-bold text-white shadow-sm hover:bg-[#de5879]"
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
  const [pinCategoryFilter, setPinCategoryFilter] = useState<
    "ALL" | PinCategory
  >("ALL");
  const [pinSort, setPinSort] = useState<PinSort>("latest");
  const [pinForm, setPinForm] = useState<PinForm>(defaultPinForm);
  const [myPinReactions, setMyPinReactions] = useState<
    Record<string, ReactionType>
  >({});
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [isCreatingPin, setIsCreatingPin] = useState(false);
  const [reactingPinId, setReactingPinId] = useState<string | null>(null);
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
        const searchParams = new URLSearchParams();

        if (pinCategoryFilter !== "ALL") {
          searchParams.set("category", pinCategoryFilter);
        }

        searchParams.set("sort", pinSort);

        const response = await fetch(
          `/api/rooms/${encodeURIComponent(roomId)}/pins?${searchParams.toString()}`,
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
    [memberId, pinCategoryFilter, pinSort, roomId],
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

    const title = pinForm.title.trim();
    const url = pinForm.url.trim();
    const memo = pinForm.memo.trim();

    if (!title) {
      setPinFormError("핀 제목을 입력해주세요.");
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
            title,
            category: pinForm.category,
            ...(url ? { url } : {}),
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
      <main className="flex min-h-dvh items-center justify-center bg-[#fffafd] px-5 text-[#241817]">
        <div className="w-full max-w-sm rounded-[8px] border border-[#f2d4e1] bg-white p-6 text-center shadow-[0_18px_60px_rgba(114,61,85,0.13)]">
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
      <main className="flex min-h-dvh items-center justify-center bg-[#fffafd] px-5 text-[#241817]">
        <div className="w-full max-w-sm rounded-[8px] border border-[#f2d4e1] bg-white p-6 text-center shadow-[0_18px_60px_rgba(114,61,85,0.13)]">
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

  return (
    <main className="min-h-dvh bg-[#fffafd] text-[#241817]">
      <section className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f3cfe0] bg-white/85 px-3 py-2 text-sm font-semibold shadow-sm">
            <span aria-hidden="true">✈️</span>
            <span>TripMate</span>
          </div>
          {member ? (
            <div className="rounded-full border border-[#d9ead1] bg-[#f4fbeb] px-3 py-2 text-sm font-semibold text-[#52613b]">
              {member.nickname} 님
            </div>
          ) : null}
        </header>

        {!member ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-md rounded-[8px] border border-[#f2d4e1] bg-white p-5 shadow-[0_20px_70px_rgba(114,61,85,0.14)] sm:p-6">
              <div className="rounded-[8px] bg-[#f9ddea] p-4">
                <p className="text-sm font-semibold text-[#b94a6b]">
                  초대받은 여행방
                </p>
                <h1 className="mt-2 text-2xl font-bold leading-snug">
                  {room.title}
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#6f5b56]">
                  닉네임만 적으면 바로 친구들과 여행 준비를 시작할 수 있어요.
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
                  className="mt-3 h-12 w-full rounded-[8px] border border-[#ead2df] bg-[#fffdfd] px-4 text-base outline-none transition focus:border-[#ec7896] focus:ring-4 focus:ring-[#ffd7e0]"
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
                  className="mt-5 h-12 w-full rounded-[8px] bg-[#f26788] text-base font-bold text-white shadow-sm hover:bg-[#de5879]"
                >
                  {isEntering ? "입장하는 중..." : "입장하기"}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col py-8">
            <section className="rounded-[8px] border border-[#f2d4e1] bg-white p-5 shadow-[0_20px_70px_rgba(114,61,85,0.12)] sm:p-7">
              <p className="inline-flex rounded-full bg-[#fff0f4] px-3 py-1.5 text-sm font-semibold text-[#b94a6b]">
                여행방 홈
              </p>
              <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                {room.title}
              </h1>
              <p className="mt-3 text-base leading-7 text-[#6f5b56]">
                친구들과 여행 준비를 시작해보세요.
              </p>

              <div className="mt-5">
                <InviteLinkCard
                  inviteUrl={inviteUrl}
                  isCopied={isInviteCopied}
                  onCopy={handleCopyInviteUrl}
                />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-[8px] bg-[#e8f6ff] p-4">
                  <p className="text-xs font-semibold text-[#31556b]">
                    참여자 수
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#17455f]">1명</p>
                </div>
                <div className="rounded-[8px] bg-[#fff0f4] p-4">
                  <p className="text-xs font-semibold text-[#b94a6b]">
                    저장된 핀
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#7a2f48]">
                    {pins.length}개
                  </p>
                </div>
                <div className="rounded-[8px] bg-[#f4fbeb] p-4">
                  <p className="text-xs font-semibold text-[#52613b]">
                    버킷리스트
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#374b18]">0개</p>
                </div>
              </div>
            </section>

            <nav className="mt-5 grid grid-cols-4 gap-2 rounded-[8px] border border-[#f2d4e1] bg-white p-2 shadow-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(tab.label)}
                  aria-pressed={activeTab === tab.label}
                  className={`flex h-16 flex-col items-center justify-center rounded-[8px] text-xs font-bold transition hover:bg-[#fff0f4] hover:text-[#b94a6b] ${
                    activeTab === tab.label
                      ? "bg-[#fff0f4] text-[#b94a6b]"
                      : "text-[#6f5b56]"
                  }`}
                >
                  <span className="text-lg" aria-hidden="true">
                    {tab.emoji}
                  </span>
                  <span className="mt-1">{tab.label}</span>
                </button>
              ))}
            </nav>

            {activeTab === "핀보드" ? (
              <section className="mt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#b94a6b]">
                      핀보드
                    </p>
                    <h2 className="mt-1 text-2xl font-bold">
                      가고 싶은 곳을 모아보세요
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[#6f5b56]">
                      릴스, 지도, 블로그 링크와 메모를 함께 저장할 수 있어요.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:w-80">
                    <label className="text-xs font-semibold text-[#6f5b56]">
                      카테고리
                      <select
                        value={pinCategoryFilter}
                        onChange={(event) =>
                          setPinCategoryFilter(
                            event.target.value as "ALL" | PinCategory,
                          )
                        }
                        className="mt-1 h-10 w-full rounded-[8px] border border-[#ead2df] bg-white px-3 text-sm outline-none focus:border-[#ec7896] focus:ring-4 focus:ring-[#ffd7e0]"
                      >
                        <option value="ALL">전체</option>
                        {pinCategories.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.emoji} {category.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold text-[#6f5b56]">
                      정렬
                      <select
                        value={pinSort}
                        onChange={(event) =>
                          setPinSort(event.target.value as PinSort)
                        }
                        className="mt-1 h-10 w-full rounded-[8px] border border-[#ead2df] bg-white px-3 text-sm outline-none focus:border-[#ec7896] focus:ring-4 focus:ring-[#ffd7e0]"
                      >
                        {pinSortOptions.map((sortOption) => (
                          <option
                            key={sortOption.value}
                            value={sortOption.value}
                          >
                            {sortOption.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <form
                  onSubmit={handleCreatePin}
                  className="mt-5 rounded-[8px] border border-[#f2d4e1] bg-white p-4 shadow-[0_16px_50px_rgba(114,61,85,0.1)]"
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                    <label className="text-sm font-semibold text-[#5d4640]">
                      핀 제목
                      <input
                        value={pinForm.title}
                        onChange={(event) => {
                          setPinForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }));
                          if (pinFormError) {
                            setPinFormError("");
                          }
                        }}
                        placeholder="예: 광안리 야경"
                        className="mt-2 h-12 w-full rounded-[8px] border border-[#ead2df] bg-[#fffdfd] px-4 text-base outline-none transition focus:border-[#ec7896] focus:ring-4 focus:ring-[#ffd7e0]"
                      />
                    </label>
                    <label className="text-sm font-semibold text-[#5d4640]">
                      카테고리
                      <select
                        value={pinForm.category}
                        onChange={(event) =>
                          setPinForm((current) => ({
                            ...current,
                            category: event.target.value as PinCategory,
                          }))
                        }
                        className="mt-2 h-12 w-full rounded-[8px] border border-[#ead2df] bg-[#fffdfd] px-4 text-base outline-none transition focus:border-[#ec7896] focus:ring-4 focus:ring-[#ffd7e0]"
                      >
                        {pinCategories.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.emoji} {category.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-[#5d4640]">
                      링크
                      <input
                        value={pinForm.url}
                        onChange={(event) =>
                          setPinForm((current) => ({
                            ...current,
                            url: event.target.value,
                          }))
                        }
                        placeholder="https://..."
                        className="mt-2 h-12 w-full rounded-[8px] border border-[#ead2df] bg-[#fffdfd] px-4 text-base outline-none transition focus:border-[#ec7896] focus:ring-4 focus:ring-[#ffd7e0]"
                      />
                    </label>
                    <label className="text-sm font-semibold text-[#5d4640]">
                      메모
                      <input
                        value={pinForm.memo}
                        onChange={(event) =>
                          setPinForm((current) => ({
                            ...current,
                            memo: event.target.value,
                          }))
                        }
                        placeholder="예: 야경 사진 예쁨"
                        className="mt-2 h-12 w-full rounded-[8px] border border-[#ead2df] bg-[#fffdfd] px-4 text-base outline-none transition focus:border-[#ec7896] focus:ring-4 focus:ring-[#ffd7e0]"
                      />
                    </label>
                  </div>

                  {pinFormError ? (
                    <p
                      className="mt-3 text-sm font-medium text-[#c53f5d]"
                      role="alert"
                    >
                      {pinFormError}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isCreatingPin}
                    className="mt-4 h-12 w-full rounded-[8px] bg-[#f26788] text-base font-bold text-white shadow-sm hover:bg-[#de5879] sm:w-auto sm:px-6"
                  >
                    {isCreatingPin ? "저장하는 중..." : "핀 저장하기"}
                  </Button>
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
                    <div className="rounded-[8px] border border-[#f2d4e1] bg-white p-6 text-center text-sm text-[#8b736c]">
                      핀을 불러오는 중이에요.
                    </div>
                  ) : pins.length === 0 ? (
                    <div className="rounded-[8px] border border-[#f2d4e1] bg-white p-6 text-center">
                      <p className="text-3xl" aria-hidden="true">
                        📌
                      </p>
                      <p className="mt-3 text-base font-bold">
                        아직 저장된 핀이 없어요
                      </p>
                      <p className="mt-2 text-sm text-[#8b736c]">
                        친구들이랑 가고 싶은 장소를 첫 핀으로 남겨보세요.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {pins.map((pin) => {
                        const category = getCategoryMeta(pin.category);
                        const myReaction = myPinReactions[pin.id];

                        return (
                          <article
                            key={pin.id}
                            className="rounded-[8px] border border-[#f2d4e1] bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="rounded-full bg-[#fff0f4] px-3 py-1 text-xs font-bold text-[#b94a6b]">
                                {category.emoji} {category.label}
                              </span>
                              <span className="text-xs text-[#8b736c]">
                                {pin.member?.nickname ?? "익명"}
                              </span>
                            </div>

                            <h3 className="mt-4 text-lg font-bold leading-snug">
                              {pin.title}
                            </h3>
                            {pin.memo ? (
                              <p className="mt-2 text-sm leading-6 text-[#6f5b56]">
                                {pin.memo}
                              </p>
                            ) : null}
                            {pin.url ? (
                              <a
                                href={pin.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex max-w-full truncate rounded-full bg-[#e8f6ff] px-3 py-1.5 text-xs font-bold text-[#17455f] hover:bg-[#d7eef9]"
                              >
                                링크 열기
                              </a>
                            ) : null}

                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={reactingPinId === pin.id}
                                onClick={() =>
                                  handleTogglePinReaction(pin.id, "MUST")
                                }
                                className={`h-10 rounded-[8px] text-sm font-bold transition disabled:opacity-60 ${
                                  myReaction === "MUST"
                                    ? "bg-[#ffe9a8] text-[#6b5012]"
                                    : "bg-[#fff8db] text-[#7a6220] hover:bg-[#ffefb9]"
                                }`}
                              >
                                ⭐ {pin.reactionCounts.mustCount}
                              </button>
                              <button
                                type="button"
                                disabled={reactingPinId === pin.id}
                                onClick={() =>
                                  handleTogglePinReaction(pin.id, "WANT")
                                }
                                className={`h-10 rounded-[8px] text-sm font-bold transition disabled:opacity-60 ${
                                  myReaction === "WANT"
                                    ? "bg-[#ffd4df] text-[#8f2947]"
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
            ) : (
              <section className="mt-5 rounded-[8px] border border-[#ead7e4] bg-[#f9ddea] p-5">
                <p className="text-sm font-semibold text-[#b94a6b]">
                  {activeTab === "홈"
                    ? "여행방 홈"
                    : `${activeTab} 준비 중`}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6f5b56]">
                  {activeTab === "홈"
                    ? "핀보드 탭에서 릴스, 지도, 블로그 링크를 먼저 모아보세요."
                    : `${activeTab} 기능은 다음 단계에서 이어서 사용할 수 있어요.`}
                </p>
              </section>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
