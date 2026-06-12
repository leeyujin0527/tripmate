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

const scrapbookItems = [
  {
    emoji: "🌊",
    title: "광안리 밤바다",
    note: "다 같이 산책하기",
    className: "bg-[#dff3fb] text-[#31556b] aspect-[4/5]",
  },
  {
    emoji: "🍓",
    title: "딸기 케이크 카페",
    note: "사진 예쁘게 나옴",
    className: "bg-[#ffe6ee] text-[#7a2f48] aspect-square",
  },
  {
    emoji: "🧺",
    title: "피크닉 매트 챙기기",
    note: "버킷리스트",
    className: "bg-[#fff2d8] text-[#76552a] aspect-[5/4]",
  },
  {
    emoji: "🏡",
    title: "감성 숙소 후보",
    note: "wishlist",
    className: "bg-[#eee7ff] text-[#574878] aspect-[3/4]",
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
      setErrorMessage("여행 이름을 먼저 적어주세요.");
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
    <main className="min-h-dvh overflow-hidden text-[#32231f]">
      <section className="mx-auto grid min-h-dvh w-full max-w-6xl gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-10">
        <div className="flex items-center justify-between lg:col-span-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ead8d0] bg-white/80 px-4 py-2 text-sm font-bold shadow-sm backdrop-blur">
            <span aria-hidden="true">✈️</span>
            <span>TripMate</span>
          </div>
          <div className="hidden rounded-full border border-[#ead8d0] bg-[#fff7ef]/80 px-4 py-2 text-sm font-semibold text-[#7b5f54] shadow-sm sm:block">
            여행 전 설렘을 모으는 공간
          </div>
        </div>

        <div className="order-2 pb-8 lg:order-1 lg:pb-0">
          <div className="columns-2 gap-3 sm:gap-4">
            {scrapbookItems.map((item, index) => (
              <article
                key={item.title}
                className={`tripmate-sticker mb-3 break-inside-avoid rounded-[8px] p-4 transition duration-200 hover:-translate-y-1 sm:mb-4 ${item.className} ${
                  index % 2 === 0 ? "translate-y-3" : ""
                }`}
              >
                <div className="flex h-full flex-col justify-between gap-6">
                  <span className="text-4xl" aria-hidden="true">
                    {item.emoji}
                  </span>
                  <div>
                    <p className="wrap-break-word text-lg font-bold leading-snug">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm font-semibold opacity-75">
                      {item.note}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="tripmate-card mt-6 rounded-[8px] p-4">
            <p className="text-sm font-bold text-[#b76478]">saved mood</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["맛집", "바다", "숙소", "카페", "사진스팟"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#fff2f6] px-3 py-1.5 text-xs font-bold text-[#8f4a5c]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="order-1 flex flex-col justify-center lg:order-2">
          <p className="mb-4 inline-flex w-fit rounded-full bg-[#fff0f4] px-4 py-2 text-sm font-bold text-[#b76478] shadow-sm">
            Pinterest처럼 모으고, 친구들과 같이 설레기
          </p>
          <h1 className="max-w-xl text-4xl font-black leading-tight text-[#32231f] sm:text-5xl lg:text-6xl">
            여행 가기 전의 설렘을
            <br />
            한 장의 무드보드로.
          </h1>
          <p className="mt-5 max-w-lg text-base font-medium leading-8 text-[#7b5f54] sm:text-lg">
            릴스, 블로그, 지도 링크와 하고 싶은 순간들을 친구들과 같이
            저장해요. TripMate는 계획표보다 여행 다이어리에 가까워요.
          </p>

          <form
            onSubmit={handleSubmit}
            className="tripmate-paper mt-8 rounded-[8px] border border-[#ead8d0] p-4 shadow-[0_22px_70px_rgba(111,75,58,0.12)] sm:p-5"
          >
            <label
              htmlFor="room-title"
              className="text-sm font-bold text-[#5e463e]"
            >
              이번 여행 이름
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
                className="h-12 min-w-0 flex-1 rounded-[8px] border border-[#ead8d0] bg-white/80 px-4 text-base font-semibold outline-none transition placeholder:text-[#c1a69a] focus:border-[#df8aa0] focus:ring-4 focus:ring-[#ffdce5]"
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 rounded-[8px] bg-[#df7f95] px-5 text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#cf6f86]"
              >
                {isSubmitting ? "만드는 중..." : "여행방 만들기"}
              </Button>
            </div>
            {errorMessage ? (
              <p
                className="mt-3 text-sm font-bold text-[#c65c71]"
                role="alert"
                aria-live="polite"
              >
                {errorMessage}
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold text-[#8b6d62]">
                로그인 없이 만들고, 초대 링크로 친구들을 불러올 수 있어요.
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
