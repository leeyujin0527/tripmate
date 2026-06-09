"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type CreateRoomSuccessResponse = {
  success: true;
  data: {
    roomId?: string;
    id?: string;
    title: string;
    inviteUrl?: string;
    createdAt?: string;
  };
};

type CreateRoomErrorResponse = {
  success: false;
  message: string;
};

type CreateRoomResponse = CreateRoomSuccessResponse | CreateRoomErrorResponse;

const samplePins = [
  {
    emoji: "🌊",
    label: "바다뷰 카페",
    note: "친구들이 저장한 릴스",
    tone: "bg-[#e8f6ff] text-[#17455f]",
  },
  {
    emoji: "🍓",
    label: "디저트 맛집",
    note: "꼭 가고 싶음 4",
    tone: "bg-[#ffe9ef] text-[#6b2636]",
  },
  {
    emoji: "📍",
    label: "네이버지도 핀",
    note: "동선에 맞춰 보기",
    tone: "bg-[#eff7df] text-[#374b18]",
  },
];

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setErrorMessage("여행방 이름을 먼저 적어주세요.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
        }),
      });

      const result = (await response.json()) as CreateRoomResponse;

      if (!response.ok || !result.success) {
        throw new Error(
          result.success ? "여행방을 만들지 못했어요." : result.message,
        );
      }

      const roomId = result.data.roomId ?? result.data.id;

      if (!roomId) {
        throw new Error("생성된 여행방 정보를 확인하지 못했어요.");
      }

      router.push(`/room/${encodeURIComponent(roomId)}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "잠시 후 다시 시도해주세요.",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[#fffafd] text-[#241817]">
      <section className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:grid lg:grid-cols-[1fr_0.92fr] lg:items-center lg:gap-12 lg:py-10">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f3cfe0] bg-white/85 px-3 py-2 text-sm font-semibold shadow-sm">
            <span aria-hidden="true">✈️</span>
            <span>TripMate</span>
          </div>
          <div className="hidden rounded-full border border-[#d9ead1] bg-[#f4fbeb] px-3 py-2 text-sm font-medium text-[#52613b] sm:block">
            링크 하나로 같이 준비하기
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10 lg:py-0">
          <div className="max-w-xl">
            <p className="mb-4 inline-flex rounded-full bg-[#fff0f4] px-3 py-1.5 text-sm font-semibold text-[#b94a6b]">
              여행 전 설렘을 한곳에
            </p>
            <h1 className="text-4xl font-bold leading-tight text-[#241817] sm:text-5xl lg:text-6xl">
              친구들과 여행을 가장 설레게 준비하는 공간
            </h1>
            <p className="mt-5 text-base leading-7 text-[#6f5b56] sm:text-lg">
              링크 하나로 친구들을 초대하고, 릴스·틱톡·맛집·카페 정보를
              한곳에 모아보세요.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-8 rounded-[8px] border border-[#f2d4e1] bg-white p-4 shadow-[0_18px_60px_rgba(114,61,85,0.13)] sm:max-w-lg sm:p-5"
          >
            <label
              htmlFor="room-title"
              className="text-sm font-semibold text-[#5d4640]"
            >
              여행방 이름
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                id="room-title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (errorMessage) {
                    setErrorMessage("");
                  }
                }}
                placeholder="예: 부산 여름 여행 🌊"
                aria-invalid={Boolean(errorMessage)}
                className="h-12 min-w-0 flex-1 rounded-[8px] border border-[#ead2df] bg-[#fffdfd] px-4 text-base outline-none transition focus:border-[#ec7896] focus:ring-4 focus:ring-[#ffd7e0]"
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded-[8px] bg-[#f26788] px-5 text-base font-bold text-white shadow-sm hover:bg-[#de5879]"
              >
                {isSubmitting ? "만드는 중..." : "여행방 만들기"}
              </Button>
            </div>
            {errorMessage ? (
              <p
                className="mt-3 text-sm font-medium text-[#c53f5d]"
                role="alert"
                aria-live="polite"
              >
                {errorMessage}
              </p>
            ) : (
              <p className="mt-3 text-sm text-[#8b736c]">
                로그인 없이 바로 만들고 친구들에게 링크를 공유할 수 있어요.
              </p>
            )}
          </form>
        </div>

        <div className="pb-8 lg:pb-0">
          <div className="relative mx-auto max-w-md rounded-[8px] border border-[#ead7e4] bg-[#f9ddea] p-4 shadow-[0_24px_70px_rgba(98,61,82,0.16)]">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[8px] bg-white p-3 shadow-sm">
                <div className="aspect-[4/5] rounded-[8px] bg-[#ccecf6] p-3">
                  <div className="flex h-full flex-col justify-between rounded-[8px] border border-white/70 bg-white/55 p-3">
                    <span className="text-3xl" aria-hidden="true">
                      🏖️
                    </span>
                    <span className="text-sm font-bold text-[#31556b]">
                      바다 앞 숙소 후보
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold text-[#4b3934]">
                  부산 여름 여행
                </p>
                <p className="mt-1 text-xs text-[#8b736c]">
                  7월 둘째 주 · 5명
                </p>
              </div>

              <div className="space-y-3 pt-6">
                {samplePins.map((pin) => (
                  <div
                    key={pin.label}
                    className="rounded-[8px] bg-white p-3 shadow-sm"
                  >
                    <div
                      className={`mb-3 inline-flex size-10 items-center justify-center rounded-[8px] text-xl ${pin.tone}`}
                      aria-hidden="true"
                    >
                      {pin.emoji}
                    </div>
                    <p className="text-sm font-bold text-[#3a2925]">
                      {pin.label}
                    </p>
                    <p className="mt-1 text-xs text-[#8b736c]">{pin.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-[8px] bg-white px-3 py-4 text-center shadow-sm">
                <p className="text-xl" aria-hidden="true">
                  ⭐
                </p>
                <p className="mt-2 text-xs font-semibold text-[#5d4640]">
                  꼭 가고 싶음
                </p>
              </div>
              <div className="rounded-[8px] bg-white px-3 py-4 text-center shadow-sm">
                <p className="text-xl" aria-hidden="true">
                  ❤️
                </p>
                <p className="mt-2 text-xs font-semibold text-[#5d4640]">
                  가고 싶음
                </p>
              </div>
              <div className="rounded-[8px] bg-white px-3 py-4 text-center shadow-sm">
                <p className="text-xl" aria-hidden="true">
                  📝
                </p>
                <p className="mt-2 text-xs font-semibold text-[#5d4640]">
                  버킷리스트
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
