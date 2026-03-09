# 개비공 v2 — 온라인 미팅 시스템 가이드

> **개비공(개원비밀공간)** : 병원 개원을 준비하는 원장님과 제휴 업체(인테리어, 의료기기 등)를 매칭하는 B2B 플랫폼
>
> 마지막 업데이트: 2026-03-09 / Step 1~5 완료 기준

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [사용자 역할 & 인증 흐름](#4-사용자-역할--인증-흐름)
5. [페이지 라우트](#5-페이지-라우트)
6. [핵심 기능 플로우](#6-핵심-기능-플로우)
7. [API 라우트 목록](#7-api-라우트-목록)
8. [데이터베이스 스키마](#8-데이터베이스-스키마)
9. [주요 컴포넌트](#9-주요-컴포넌트)
10. [외부 서비스 연동](#10-외부-서비스-연동)
11. [CSS 디자인 시스템](#11-css-디자인-시스템)
12. [환경변수 목록](#12-환경변수-목록)
13. [개발 & 배포 명령어](#13-개발--배포-명령어)
14. [완료 단계 요약](#14-완료-단계-요약)

---

## 1. 프로젝트 개요

### 소스코드 경로
```
C:\dev\gaebigong-v2
```
> OneDrive 경로(한글/공백)에서는 npm 실행 불가 → 반드시 `C:\dev`에서 개발

### 3가지 사용자 역할

| 역할 | 대시보드 | 주요 행동 |
|------|---------|---------|
| **원장** (doctor) | `/doctor` | 개원 단계별 업체 검색 → 미팅 신청 → 벤더 선정 |
| **벤더사** (vendor) | `/vendor` | 미팅 인박스 확인 → 수락/거절 → Google Meet 링크 생성 |
| **관리자** (admin) | `/admin` | 전체 업체/원장/미팅 관리 + Google Calendar 연동 설정 |

---

## 2. 기술 스택

| 구분 | 내용 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) + TypeScript 5 |
| 스타일링 | Tailwind CSS v4 (`@import "tailwindcss"`, config 파일 없음) |
| UI 라이브러리 | framer-motion, lucide-react, clsx, tailwind-merge |
| 데이터베이스 | Supabase (PostgreSQL + RLS) |
| 인증 | Supabase Auth (Google OAuth) |
| 캘린더 | Google Calendar API (Service Account + Domain-Wide Delegation) |
| 화상회의 | Google Meet API v2 |
| 이메일 | Google Apps Script (GAS) Web App |

---

## 3. 디렉토리 구조

```
C:\dev\gaebigong-v2/
├── app/
│   ├── (auth)/                       # 인증 관련 페이지
│   │   ├── login/page.tsx            # Google 로그인
│   │   ├── setup/page.tsx            # 신규 가입 후 프로필 설정
│   │   └── join/vendor/page.tsx      # 벤더사 전용 가입
│   ├── (dashboard)/                  # 역할별 대시보드 (middleware로 보호)
│   │   ├── layout.tsx                # 공통 레이아웃 (auth 체크)
│   │   ├── doctor/
│   │   │   ├── page.tsx
│   │   │   ├── DoctorDashboard.tsx   # 원장 메인 (벤더 검색 + 미팅)
│   │   │   ├── DoctorMeetings.tsx    # 원장 미팅 목록
│   │   │   ├── MeetingRequestModal.tsx
│   │   │   └── bidding/
│   │   │       ├── page.tsx
│   │   │       └── DoctorBiddingBoard.tsx
│   │   ├── vendor/
│   │   │   ├── page.tsx
│   │   │   ├── VendorInbox.tsx       # 벤더 미팅 인박스
│   │   │   └── bidding/
│   │   │       ├── page.tsx
│   │   │       └── VendorBiddingBoard.tsx
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── AdminPanel.tsx        # 관리자 메인 패널
│   │       ├── MeetingMonitor.tsx
│   │       ├── BiddingMeetingMonitor.tsx
│   │       └── DoctorBiddingAssigner.tsx
│   ├── auth/
│   │   ├── callback/route.ts         # 일반 로그인 OAuth 콜백
│   │   └── vendor-callback/route.ts  # 벤더 로그인 콜백
│   ├── api/                          # API 라우트 (21개)
│   │   ├── meetings/
│   │   │   ├── confirm/route.ts
│   │   │   ├── select/route.ts
│   │   │   ├── reject/route.ts
│   │   │   └── notify/route.ts
│   │   ├── bidding/
│   │   │   ├── events/route.ts
│   │   │   └── slots/
│   │   │       ├── route.ts
│   │   │       ├── claim/route.ts
│   │   │       └── cancel/route.ts
│   │   ├── admin/
│   │   │   ├── stages/route.ts
│   │   │   ├── vendors/route.ts
│   │   │   ├── vendors/link/route.ts
│   │   │   ├── bidding-vendors/route.ts
│   │   │   ├── bidding-vendors/link/route.ts
│   │   │   ├── doctors/route.ts
│   │   │   ├── profiles/route.ts
│   │   │   ├── meetings/route.ts
│   │   │   ├── settings/route.ts
│   │   │   ├── test-calendar/route.ts
│   │   │   └── doctor-bidding/route.ts
│   │   └── cron/
│   │       └── cleanup/route.ts
│   ├── components/
│   │   ├── MiniCalendar.tsx          # 확정 미팅 표시 달력
│   │   └── Toast.tsx                 # 알림 토스트
│   ├── layout.tsx                    # 루트 레이아웃
│   ├── page.tsx                      # 홈 (로그인 상태면 리다이렉트)
│   └── globals.css                   # 디자인 시스템 CSS 변수
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # 클라이언트용 Supabase
│   │   ├── server.ts                 # 서버용 Supabase (SSR)
│   │   └── admin.ts                  # Service Role (RLS 우회)
│   ├── email.ts                      # GAS 이메일 발송 (8가지 타입)
│   ├── google-calendar.ts            # Calendar 일정 생성/삭제
│   ├── google-meet.ts                # Meet 스페이스 생성
│   └── utils.ts                      # cn(), formatDate(), formatDateTime()
├── types/
│   └── database.ts                   # 전체 DB 타입 정의
├── supabase/
│   ├── schema.sql                    # 메인 스키마 + RLS 정책
│   ├── migration_*.sql               # 마이그레이션 스크립트
│   └── seed_*.sql                    # 초기 데이터
├── middleware.ts                     # 라우트 보호 + 역할별 리다이렉트
├── .env.local                        # 환경변수 (실제 값)
├── .env.local.example                # 환경변수 템플릿
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
└── package.json
```

---

## 4. 사용자 역할 & 인증 흐름

### 가입 경로

```
일반 사용자 (원장 기본값)
  /login → Google OAuth → /auth/callback → role=doctor 부여 → /setup (프로필 설정) → /doctor

벤더사 전용
  /join/vendor → Google OAuth → /auth/vendor-callback → role=vendor 부여 → /vendor
```

### Middleware 보호 규칙 (`middleware.ts`)

```
PUBLIC_ROUTES = ['/', '/login', '/auth/callback', '/auth/vendor-callback', '/join/vendor']

비로그인 + 보호 경로 접근   →  /login 리다이렉트
로그인 + /login 접근        →  역할별 대시보드 리다이렉트
  admin  →  /admin
  doctor →  /doctor
  vendor →  /vendor
```

### 역할별 권한

| 기능 | admin | doctor | vendor |
|------|:-----:|:------:|:------:|
| 단계/업체 관리 | ✅ | - | - |
| 원장 목록 관리 | ✅ | - | - |
| 벤더 계정 연결 | ✅ | - | - |
| Google Calendar 설정 | ✅ | - | - |
| 업체 검색 + 미팅 신청 | - | ✅ | - |
| 벤더 선정/탈락 처리 | - | ✅ | - |
| 비딩 이벤트 생성 | - | ✅ | - |
| 미팅 인박스 (수락/거절) | - | - | ✅ |
| 비딩 슬롯 선점 | - | - | ✅ |

---

## 5. 페이지 라우트

### 인증 페이지

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `app/page.tsx` | 홈 (로그인 상태면 대시보드 리다이렉트) |
| `/login` | `(auth)/login/page.tsx` | Google OAuth 로그인 버튼 |
| `/setup` | `(auth)/setup/page.tsx` | 이름/전화번호 입력 (최초 1회) |
| `/join/vendor` | `(auth)/join/vendor/page.tsx` | 벤더사 전용 가입 안내 + 로그인 |
| `/auth/callback` | `auth/callback/route.ts` | 일반 OAuth 콜백 처리 |
| `/auth/vendor-callback` | `auth/vendor-callback/route.ts` | 벤더 OAuth 콜백 처리 |

### 대시보드 페이지

| 경로 | 접근 가능 역할 | 주요 기능 |
|------|:------------:|---------|
| `/doctor` | doctor | 업체 검색 탭 / 미팅 목록 탭 / 비딩 탭 |
| `/doctor/bidding` | doctor | 비딩 이벤트 생성 + 슬롯 관리 |
| `/vendor` | vendor | 미팅 인박스 (수락/거절/확정) |
| `/vendor/bidding` | vendor | 배정된 비딩 슬롯 선점 |
| `/admin` | admin | 단계/업체/원장/미팅 전체 관리 |

---

## 6. 핵심 기능 플로우

### 6-1. 원장의 미팅 신청 플로우

```
1. 원장 로그인 → /doctor
2. "업체찾기" 탭 → 개원 단계 선택
3. 단계에 등록된 벤더사 목록 표시 (category_id 기반)
4. 벤더 카드 클릭 → MeetingRequestModal 열기
5. 제안 시간 최대 5개 입력
6. 신청 버튼 → POST /api/meetings/notify
   ├── DB: meeting_requests 생성 (status='pending')
   └── 이메일: 벤더에게 미팅 신청 알림 발송

결과: 벤더사 인박스에 새 미팅 요청 표시
```

### 6-2. 벤더의 미팅 확정 플로우

```
1. 벤더 로그인 → /vendor
2. VendorInbox에서 pending 미팅 확인
3. 제안 시간 5개 중 1개 선택 → 확정 버튼
4. POST /api/meetings/confirm 호출
   ├── Google Meet 스페이스 생성 → meet_link 저장
   ├── Google Calendar 일정 생성 (calendar_enabled=true 시)
   ├── DB: meeting_requests 업데이트
   │   ├── status = 'confirmed'
   │   ├── confirmed_time = 선택한 시간
   │   ├── meet_link = Meet URL
   │   └── calendar_event_id = 캘린더 이벤트 ID
   └── 이메일: 원장에게 미팅 확정 알림 (Meet 링크 포함)

결과: 원장 대시보드 Realtime 감지 → 토스트 알림
```

### 6-3. 원장의 벤더 선정 플로우

```
1. 원장: 확정된 미팅들 중 1개 선택 → "선정" 버튼
2. POST /api/meetings/select 호출
   ├── 선정 미팅: selection_status = 'selected'
   ├── 같은 doctor+stage의 다른 미팅들: selection_status = 'eliminated'
   ├── 이메일: 선정 벤더에게 선정 알림 (원장 연락처 포함)
   └── 이메일: 탈락 벤더들에게 탈락 알림

결과: 벤더 인박스에 선정됨/탈락 배너 표시
```

### 6-4. 비딩 시스템 플로우

```
[원장]
1. /doctor/bidding → 비딩 이벤트 생성
2. 비딩 회차(1/2/3) 선택 + 미팅 시간 슬롯 5~10개 설정
3. 이벤트 상태 open → 배정된 벤더사에게 공개

[벤더]
1. /vendor/bidding → 배정된 비딩 이벤트 확인
2. 열린 슬롯 선택 → POST /api/bidding/slots/claim
   ├── Google Meet 스페이스 생성
   ├── Google Calendar 일정 생성 (BIDDING 캘린더)
   └── 슬롯 상태: available → claimed

[관리자]
- 원장별 비딩 벤더 배정 관리
- 비딩 이벤트 현황 모니터링
```

---

## 7. API 라우트 목록

### 미팅 API

| 메서드 | 경로 | 역할 | 설명 |
|--------|------|------|------|
| POST | `/api/meetings/notify` | doctor | 미팅 신청 + 벤더에게 이메일 |
| POST | `/api/meetings/confirm` | vendor | 미팅 확정 + Meet/Calendar 생성 |
| POST | `/api/meetings/reject` | vendor | 미팅 거절 + 사유 저장 |
| POST | `/api/meetings/select` | doctor | 벤더 선정/탈락 처리 + 이메일 |

### 비딩 API

| 메서드 | 경로 | 역할 | 설명 |
|--------|------|------|------|
| GET | `/api/bidding/events` | doctor | 내 비딩 이벤트 + 슬롯 목록 |
| POST | `/api/bidding/events` | doctor | 비딩 이벤트 + 슬롯 생성 |
| PATCH | `/api/bidding/events` | doctor | 이벤트 상태 변경 (open/closed/completed) |
| GET | `/api/bidding/slots` | vendor | 배정된 슬롯 목록 (블라인드 처리) |
| POST | `/api/bidding/slots/claim` | vendor | 슬롯 선점 + Meet/Calendar 생성 |
| POST | `/api/bidding/slots/cancel` | vendor | 슬롯 선점 취소 |

### 관리자 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET/POST/PATCH | `/api/admin/stages` | 개원 단계 CRUD |
| GET/POST/PATCH | `/api/admin/vendors` | 벤더사 CRUD |
| POST/DELETE | `/api/admin/vendors/link` | 가입자 계정 → 벤더 매핑 |
| GET/POST | `/api/admin/bidding-vendors` | 비딩 벤더 관리 |
| POST/DELETE | `/api/admin/bidding-vendors/link` | 비딩 벤더 계정 연결 |
| GET/PATCH | `/api/admin/doctors` | 원장 목록 + 권한 토글 |
| GET | `/api/admin/profiles` | 가입자 목록 (계정 연결용) |
| GET | `/api/admin/meetings` | 전체 미팅 현황 |
| GET | `/api/admin/doctor-bidding` | 원장-비딩벤더 배정 관리 |
| GET/PATCH | `/api/admin/settings` | 앱 설정 (calendar_enabled 등) |
| POST | `/api/admin/test-calendar` | Google Calendar/Meet 연동 진단 |
| POST | `/api/admin/bidding/overview` | 비딩 통계 |

### 배경 작업

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/cron/cleanup` | 만료된 데이터 정리 |

---

## 8. 데이터베이스 스키마

### 핵심 테이블 (10개)

#### `profiles` — Supabase Auth 확장
```sql
id          UUID (FK → auth.users)
role        ENUM('admin', 'doctor', 'vendor')
name        TEXT
email       TEXT
phone       TEXT  -- 원장 선정 시 벤더에게 공개
created_at  TIMESTAMPTZ
```

#### `doctors` — 원장 추가 정보
```sql
id               UUID (FK → profiles)
clinic_name      TEXT
specialty        TEXT
open_target_date DATE
auth_express     BOOLEAN  -- 일사천리 기능 허용
auth_bidding     BOOLEAN  -- 비딩 기능 허용
```

#### `vendors` — 일반 벤더사
```sql
id           UUID
company_name TEXT
category_id  UUID (FK → stages)  -- 담당 개원 단계
profile_id   UUID NULLABLE (FK → profiles)  -- admin이 나중에 연결
description  TEXT
contact      TEXT
```

#### `stages` — 개원 단계 (12개)
```sql
id          UUID
name        TEXT   -- e.g. '인테리어', '의료기기'
color       TEXT   -- 테마 컬러 (HEX)
icon        TEXT   -- lucide 아이콘 이름
order_index INT
```

#### `process_items` — 단계별 세부 항목
```sql
id       UUID
stage_id UUID (FK → stages)
title    TEXT
guide    TEXT
```

#### `doctor_progress` — 원장별 진행 상태
```sql
doctor_id       UUID (FK → doctors)
process_item_id UUID (FK → process_items)
status          ENUM('not_started', 'in_progress', 'completed')
```

#### `meeting_requests` — 미팅 요청 (핵심 테이블)
```sql
id               UUID
doctor_id        UUID (FK → profiles)
vendor_id        UUID (FK → vendors)
status           ENUM('pending', 'confirmed', 'rejected', 'cancelled')
selection_status ENUM('selected', 'eliminated') NULLABLE
proposed_times   TIMESTAMPTZ[]  -- 원장이 제안한 시간 (최대 5개)
confirmed_time   TIMESTAMPTZ    -- 벤더가 선택한 확정 시간
meet_link        TEXT           -- Google Meet URL
calendar_event_id TEXT          -- Google Calendar 이벤트 ID
reject_reason    TEXT           -- 거절 사유
meeting_type     TEXT           -- 'standard' | 'express'
created_at       TIMESTAMPTZ
```

#### `bidding_vendors` — 비딩 전용 벤더
```sql
id           UUID
company_name TEXT
profile_id   UUID NULLABLE (FK → profiles)
is_active    BOOLEAN
```

#### `bidding_events` — 원장이 생성한 비딩
```sql
id            UUID
doctor_id     UUID (FK → profiles)
bidding_round ENUM(1, 2, 3)
status        ENUM('open', 'closed', 'completed')
created_at    TIMESTAMPTZ
```

#### `bidding_slots` — 비딩 슬롯
```sql
id               UUID
bidding_event_id UUID (FK → bidding_events)
proposed_time    TIMESTAMPTZ
status           ENUM('available', 'claimed', 'cancelled')
claimed_by       UUID NULLABLE (FK → bidding_vendors)
meet_link        TEXT
calendar_event_id TEXT
```

### RLS 정책 요약

| 테이블 | 조회 | 수정 |
|--------|------|------|
| `profiles` | 본인 + admin | 본인 |
| `vendors` | 인증 사용자 전체 | 본인 + admin |
| `meeting_requests` | 당사자(doctor/vendor) + admin | 당사자별 + admin |
| `stages`, `process_items` | 인증 사용자 전체 | admin |
| `doctor_progress` | 본인 원장 | 본인 원장 |

---

## 9. 주요 컴포넌트

### DoctorDashboard.tsx
- **위치**: `app/(dashboard)/doctor/DoctorDashboard.tsx`
- **탭 구조**: 업체찾기 / 내 미팅 / 일사천리 / 비딩
- **주요 기능**:
  - 개원 단계 선택 → 벤더사 카드 목록 표시
  - 미팅 신청 모달 (최대 5개 시간 제안)
  - Supabase Realtime 구독: 미팅 상태 변경 시 토스트 표시
  - 확정 미팅 선정/탈락 처리 버튼
  - 미팅 상태 배지: 진행중 / 거절 / 확정 / 선정됨 / 탈락

### VendorInbox.tsx
- **위치**: `app/(dashboard)/vendor/VendorInbox.tsx`
- **주요 기능**:
  - 미팅 요청 목록 (상태별 필터: pending / confirmed / rejected)
  - 제안 시간 중 1개 선택 → 수락 (Meet 링크 자동 생성)
  - 거절 + 거절 사유 입력
  - Supabase Realtime 구독: 실시간 상태 반영
  - 선정됨/탈락 배너 표시
  - 선정 시 원장 연락처(profiles.phone) 표시

### AdminPanel.tsx
- **위치**: `app/(dashboard)/admin/AdminPanel.tsx`
- **탭 구조**: 단계 / 업체 / 원장 / 비딩벤더 / 비딩배정 / 미팅현황 / 일사천리 / 비딩미팅
- **주요 기능**:
  - 개원 단계(stages) CRUD
  - 벤더사 CRUD + 계정 연결 모달 (이메일 검색 → profile_id 연결)
  - 원장 목록 + `auth_express` / `auth_bidding` 토글
  - Google Calendar/Meet 연동 진단 (test-calendar)
  - 전체 미팅 현황 모니터링

### DoctorBiddingBoard.tsx / VendorBiddingBoard.tsx
- **위치**: `app/(dashboard)/doctor/bidding/` / `app/(dashboard)/vendor/bidding/`
- 원장: 비딩 이벤트 생성 + 슬롯 시간 설정 + 상태 관리
- 벤더: 배정된 이벤트 확인 + 슬롯 선점 (블라인드 경쟁)

### MiniCalendar.tsx
- **위치**: `app/components/MiniCalendar.tsx`
- 월별 달력 (좌/우 네비게이션)
- 확정 미팅 날짜 색상 마킹
- 날짜 호버 시 미팅 상세 팝업

### Toast.tsx
- **위치**: `app/components/Toast.tsx`
- framer-motion 슬라이드 애니메이션
- 미팅 확정/거절 실시간 알림 (6초 자동 소멸)

---

## 10. 외부 서비스 연동

### Google OAuth (인증)
- Supabase Auth의 Google Provider 사용
- Client ID / Secret → Supabase 대시보드에 등록
- 콜백 URL: `/auth/callback`, `/auth/vendor-callback`

### Google Calendar API (`lib/google-calendar.ts`)
```typescript
createMeetingEvent(params)   // 일정 생성 → calendar_event_id 반환
deleteMeetingEvent(eventId)  // 일정 삭제
```
- **인증**: Service Account + Domain-Wide Delegation (DWD)
- **3가지 캘린더**:
  - `GOOGLE_CALENDAR_ID` — 일반 미팅
  - `GOOGLE_CALENDAR_ID_EXPRESS` — 일사천리 전용
  - `GOOGLE_CALENDAR_ID_BIDDING` — 비딩 전용
- **활성화 조건**: Admin 패널 → `calendar_enabled = true`

### Google Meet API (`lib/google-meet.ts`)
```typescript
createMeetSpace()  // Meet 스페이스 생성 → meet.google.com/xxx-xxxx-xxx
```
- Meet API v2 사용
- Service Account로 독립적 스페이스 생성

### GAS 이메일 발송 (`lib/email.ts`)
```typescript
notifyVendorMeetingRequest()        // 원장 → 벤더: 미팅 신청 알림
notifyDoctorMeetingConfirmed()      // 벤더 → 원장: 미팅 확정 알림 (Meet 링크)
notifyVendorSelected()              // 원장 → 벤더: 선정 알림 (원장 연락처 포함)
notifyVendorEliminated()            // 원장 → 벤더: 탈락 알림
notifyDoctorBiddingSlotClaimed()    // 벤더 → 원장: 비딩 슬롯 선점 알림
// ... 총 8가지 타입
```
- `GAS_WEBAPP_URL` 환경변수에 등록된 Google Apps Script Web App으로 POST 요청
- GAS 코드 변경 시 **script.google.com에서 반드시 재배포** 필요

### Supabase Realtime
- `DoctorDashboard.tsx`, `VendorInbox.tsx`에서 채널 구독
- `meeting_requests` 테이블 변경 감지 → 즉시 UI 업데이트 + 토스트

---

## 11. CSS 디자인 시스템

### 파일 위치: `app/globals.css`

### 브랜드 컬러
```css
--brand-primary:   #16a34a  /* green-600 */
--brand-secondary: #15803d
--brand-accent:    #4ade80
```

### 상태 컬러
```css
--status-pending:   #f59e0b  /* amber */
--status-confirmed: #16a34a  /* green */
--status-rejected:  #ef4444  /* red */
```

### Glass 컴포넌트
```css
.glass        /* Glassmorphism (blur: 16px, bg: rgba(255,255,255,0.65)) */
.glass-strong /* 강한 glass (blur: 24px) */
.gradient-bg  /* 배경 그래디언트 */
```

### 다크모드 지원
- `@media (prefers-color-scheme: dark)` 기반
- 모든 CSS 변수 다크 값 별도 정의

---

## 12. 환경변수 목록

### `.env.local` 필수 항목

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://qfrdzwlodkdmsvoktpvq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<legacy anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

# Google OAuth
GOOGLE_CLIENT_ID=<Google OAuth Client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth Client Secret>

# Google Service Account (Calendar + Meet)
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account@project.iam.gserviceaccount.com>
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=<-----BEGIN RSA PRIVATE KEY----->
GOOGLE_CALENDAR_OWNER=<admin@yourdomain.com>  # DWD subject (선택)

# Google Calendar ID
GOOGLE_CALENDAR_ID=<일반 미팅 캘린더 ID>
GOOGLE_CALENDAR_ID_EXPRESS=<일사천리 캘린더 ID>
GOOGLE_CALENDAR_ID_BIDDING=<비딩 캘린더 ID>

# 이메일 (GAS)
GAS_WEBAPP_URL=<Google Apps Script Web App URL>

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Supabase 프로젝트 정보 (참고)
- **Project URL**: `https://qfrdzwlodkdmsvoktpvq.supabase.co`
- **Anon Key**: 메모리 파일 참조
- **Service Role Key**: 메모리 파일 참조

---

## 13. 개발 & 배포 명령어

### 로컬 개발

```bash
# 경로 이동 (반드시 C:\dev에서)
cd C:\dev\gaebigong-v2

# 개발 서버 실행
npm run dev
# → http://localhost:3000

# 빌드 확인
npm run build

# 린트 검사
npm run lint
```

### 기존 프로세스 종료 후 재시작 (Windows)

```powershell
# 포트 확인
netstat -ano | findstr :3000

# 프로세스 종료 (PowerShell)
Stop-Process -Id <PID> -Force

# 재시작
cd C:\dev\gaebigong-v2 && npm run dev
```

### Vercel 배포 (Step 6 예정)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경변수는 Vercel 대시보드에서 설정
# NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## 14. 완료 단계 요약

| Step | 상태 | 주요 내용 |
|------|:----:|---------|
| **Step 1** | ✅ | 프로젝트 세팅 (Next.js + Tailwind CSS v4 + Supabase 설정) + DB 스키마 설계 |
| **Step 2** | ✅ | Google OAuth 로그인 + 역할별 라우팅 + Middleware 보호 |
| **Step 3** | ✅ | 원장 대시보드 (업체 검색 + 미팅 신청 모달) + Admin 패널 기본 |
| **Step 4** | ✅ | 벤더사 인박스 (수락/거절/확정) + GAS 이메일 알림 + Admin 계정 연결 |
| **Step 5** | ✅ | Google Calendar/Meet 연동 + 비딩 시스템 + Admin 모니터링 대시보드 + 선정/탈락 처리 |
| **Step 6** | ⏳ | Vercel 배포 |

### Step 5 세부 추가 기능
- `meeting_requests.selection_status` 컬럼 추가 (selected/eliminated)
- `/api/meetings/select` — 선정/탈락 처리 API
- 벤더 인박스: Realtime 구독 + 선정/탈락 배너 + 원장 연락처 표시
- 이메일: `vendor_selected` (원장 phone 포함), `vendor_eliminated` 추가
- 비딩 시스템 전체 (events + slots + 블라인드 선점)
- Admin 비딩 벤더 배정 관리

---

## 주요 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| **이메일 발송** | GAS Web App | 무료 + 자유로운 HTML 템플릿 |
| **캘린더** | Google Calendar API (Service Account) | 관리자가 통합 관리 가능 |
| **벤더 가입** | `/join/vendor` 전용 경로 | `role=vendor` 자동 부여 |
| **vendors 테이블** | `profile_id` nullable | Admin이 나중에 계정 연결 (유연성) |
| **미팅 확정 알림** | 벤더에게 이메일 안 보냄 | 인박스에서 직접 확인 |
| **비딩 블라인드** | 다른 벤더 선점 여부만 표시 | 공정한 경쟁 유도 |
| **Realtime** | Supabase 채널 구독 | 실시간 상태 변경 → 즉시 토스트 |
| **RLS** | 당사자 + admin 구조 | 데이터 프라이버시 + admin 권한 분리 |
