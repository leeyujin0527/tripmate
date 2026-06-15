# TripMate

친구들과 여행을 가장 설레게 준비하는 공간 ✈️

TripMate는 친구들과 국내 여행을 준비할 때 발생하는 정보 분산 문제를 해결하기 위한 협업형 여행 준비 서비스입니다.

카카오톡, 인스타그램, 틱톡, 블로그, 지도 앱 등을 오가며 여행을 계획하는 대신 하나의 공간에서 여행 날짜를 조율하고, 여행 장소를 공유하며, 버킷리스트를 작성할 수 있습니다.

---

## 서비스 주소

https://tripmate-rgwb-git-main-leeyujin0527s-projects.vercel.app

---

## 주요 기능

### 여행방 생성

* 여행방 생성
* 링크 공유
* 친구 초대

### 여행방 참여

* 로그인 없이 닉네임으로 입장
* localStorage 기반 사용자 식별

### 여행 날짜 조율

* 가능한 날짜 다중 선택
* 참여자별 날짜 확인
* 여행 기간 확정

### 핀보드

* 여행 관련 링크 저장
* 장소 공유
* 여행 정보 수집

### 장소 반응

* ⭐ 꼭 가고 싶음
* ❤️ 가고 싶음

### 버킷리스트

* 여행 중 하고 싶은 활동 작성
* 친구들과 공유

### 홈 화면

* 여행 정보 확인
* 참여자 확인
* 여행 준비 현황 확인

---

## 기술 스택

### Frontend

* Next.js
* TypeScript
* TailwindCSS

### Backend

* Next.js Route Handler

### Database

* PostgreSQL

### ORM

* Prisma

### Deployment

* Vercel

---

## 프로젝트 구조

```text
src/
├── app/
├── components/
├── lib/

prisma/
├── schema.prisma

public/
```

---

## 실행 방법

### 패키지 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

### Prisma 마이그레이션

```bash
npx prisma migrate dev
```

### Prisma Studio

```bash
npx prisma studio
```

---

## AI 활용 내역

본 프로젝트는 인공지능을 활용하여 개발을 진행하였습니다.

### 사용 도구

* ChatGPT
* OpenAI Codex

### 활용 내용

* 서비스 기획
* 사용자 흐름 설계
* 기능 명세 작성
* API 설계
* 데이터베이스 설계
* UI/UX 개선 아이디어 도출
* 테스트 시나리오 작성




