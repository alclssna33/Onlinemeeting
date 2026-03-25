# 개비공 v2 (개원비밀공간) — 프로젝트 가이드

## 개요
병원 개원을 준비하는 원장님과 제휴 업체(인테리어, 의료기기 등)를 매칭해주는 플랫폼.
원장님이 개원 단계별 업체에 미팅을 신청하면, 업체가 시간을 확정하고 Google Meet 링크를 자동 생성한다.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) + TypeScript |
| 스타일 | Tailwind CSS v4 (`@import "tailwindcss"`, config 파일 없음) |
| DB / Auth | Supabase (PostgreSQL + RLS + Google OAuth) |
| 이메일 | Google Apps Script Web App (GAS) |
| 캘린더 | Google Calendar API (Service Account + Domain-Wide Delegation) |
| 화상미팅 | Google Meet API v2 (Service Account + DWD, Calendar와 독립) |
| 애니메이션 | framer-motion |
| 아이콘 | lucide-react |

---

## 프로젝트 경로

- 소스코드: `C:\dev\gaebigong-v2`
- 기획문서: `C:\Users\alcls\OneDrive\바탕 화면\개비&마봉\개비공자료\02.온라인미팅\`
- OneDrive 경로는 한글/공백 때문에 npm 실행 불가 → 반드시 `C:\dev`에서 개발

---

## 라우트 구조

```
app/
├── (auth)/
│   ├── login/                   # 구글 로그인 페이지
│   └── setup/                   # 신규 가입 닉네임 설정 페이지
├── auth/
│   ├── callback/route.ts        # OAuth 콜백 (일반 가입, 신규 → /setup 리다이렉트)
│   └── vendor-callback/route.ts # OAuth 콜백 (벤더 전용)
├── (dashboard)/
│   ├── doctor/                  # 원장 대시보드
│   │   ├── page.tsx
│   │   ├── DoctorDashboard.tsx      # 탭 (업체 찾기 / 내 미팅)
│   │   ├── DoctorMeetings.tsx       # 내 미팅 현황 (확정/대기/거절, 토글)
│   │   └── MeetingRequestModal.tsx  # 미팅 신청 모달
│   ├── vendor/                  # 벤더사 대시보드
│   │   ├── page.tsx
│   │   └── VendorInbox.tsx          # 미팅 수락/거절 인박스
│   └── admin/                   # 관리자 패널
│       ├── page.tsx
│       ├── AdminPanel.tsx           # 단계/업체 관리 + 계정 연결 + 캘린더 토글
│       └── MeetingMonitor.tsx       # 전체 미팅 현황 모니터링
├── join/
│   └── vendor/page.tsx          # 제휴업체 전용 가입 페이지
└── api/
    ├── admin/
    │   ├── stages/route.ts       # 개원 단계 CRUD
    │   ├── vendors/route.ts      # 제휴업체 CRUD
    │   ├── vendors/link/route.ts # 벤더사 계정 연결/해제
    │   ├── profiles/route.ts     # 연결 가능한 가입자 목록
    │   ├── meetings/route.ts     # 전체 미팅 현황 조회
    │   ├── settings/route.ts     # 앱 설정 GET/PATCH (캘린더 ON/OFF 등)
    │   └── test-calendar/route.ts # Google Meet·Calendar 연동 진단
    └── meetings/
        ├── confirm/route.ts      # 미팅 확정 (Meet 링크 생성 + 캘린더 선택적 생성)
        ├── reject/route.ts       # 미팅 거절 + 거절 사유 저장
        └── notify/route.ts       # 미팅 신청 이메일 발송
```

---

## DB 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `profiles` | auth.users 확장, role: admin/doctor/vendor |
| `doctors` | 원장 추가정보 (clinic_name 등) |
| `vendors` | 제휴업체 (profile_id로 가입 계정 연결) |
| `stages` | 개원 단계 12개 (name, color, order_index) |
| `meeting_requests` | 미팅 요청 (proposed_times[], status, confirmed_time, meet_link, vendor_note, calendar_event_id) |
| `app_settings` | 앱 설정 key-value (calendar_enabled 등) |

### 필수 마이그레이션 (Supabase SQL Editor에서 실행)
`supabase/migration_fix_vendor_fk.sql` 파일 전체 실행 (vendor_id FK 수정 + RLS 재설정 + app_settings 테이블 생성 포함)

---

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GOOGLE_SERVICE_ACCOUNT_EMAIL=          # 서비스 계정 이메일 (xxx@project.iam.gserviceaccount.com)
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=    # 서비스 계정 private key ("-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n")
GOOGLE_CALENDAR_OWNER=                 # DWD subject — 워크스페이스 사용자 이메일 (절대 변경 안 함)
GOOGLE_CALENDAR_ID=                    # 이벤트가 등록될 캘린더 ID (기본: 위와 동일, 별도 캘린더면 group.calendar.google.com 주소)

GAS_WEBAPP_URL=                        # Apps Script 이메일 Web App URL

CRON_SECRET=                           # Cron 무단 호출 방지 시크릿 (임의 문자열)

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **GOOGLE_CALENDAR_OWNER vs GOOGLE_CALENDAR_ID 차이**
> - `GOOGLE_CALENDAR_OWNER`: DWD로 가장할 워크스페이스 사용자 이메일. **절대 변경 금지.**
> - `GOOGLE_CALENDAR_ID`: 실제 이벤트가 등록될 캘린더 ID. 별도 캘린더를 만들면 이것만 바꾸면 됨.
> - 처음 설정 시 둘 다 같은 이메일로 설정해도 됨.

---

## 완료 단계

### ✅ Step 1 — 프로젝트 세팅 + DB 설계
- Next.js 프로젝트 생성, 디자인 시스템 (Glassmorphism, 다크모드, 브랜드 컬러 #16a34a)
- Supabase 스키마 설계 및 RLS 설정

### ✅ Step 2 — 구글 로그인 + 역할별 라우팅
- Google OAuth 연동
- 역할(admin/doctor/vendor)에 따른 대시보드 분기

### ✅ Step 3 — 원장 대시보드 + 미팅 신청 UI
- 개원 단계별 업체 카드 목록
- 미팅 신청 모달: 5개 빈 슬롯에 datetime-local picker로 직접 선택

### ✅ Step 4 — 벤더사 인박스 + 이메일 알림 + 계정 연결
- 벤더사 인박스 UI: 수락(확정 일시 선택) / 거절(사유 입력)
- GAS Web App으로 이메일 발송 (신청 알림 → 벤더, 확정/거절 알림 → 원장)
- 관리자 패널: 벤더사 계정 연결 UI (드롭다운으로 가입자 선택)
- 제휴업체 전용 가입 경로: `/join/vendor` → `/auth/vendor-callback`

### ✅ Step 5 — Google Calendar + Meet 링크 + 미팅 모니터링
- Service Account + Domain-Wide Delegation으로 지정 캘린더에 일정 자동 생성
- 미팅 확정 시 Google Meet 링크 자동 생성 후 DB 저장 (Calendar와 완전히 독립)
- 관리자 "📅 미팅 현황" 탭: 통계 카드 + 상태 필터 + 검색 + 테이블
- 관리자 캘린더 ON/OFF 토글 + 🔍 진단 버튼 (API 연결 상태 단계별 진단)

### ✅ Step 6 — UX 개선 + 버그픽스
- 신규 원장 구글 가입 시 닉네임 + 전화번호 입력 페이지(`/setup`)로 자동 이동
- `profiles.name`, `profiles.phone` 함께 저장
- 원장 대시보드 "📅 내 미팅" 탭: 확정/대기/거절 섹션 토글 방식으로 확인
- meeting_requests.vendor_id FK 버그 수정 (profiles → vendors 참조로 변경)
- RLS 정책 수정: vendor_id로 profile_id 서브쿼리 조회
- 벤더 인박스 원장 닉네임 표시 수정 (adminClient로 RLS 우회)
- notify/confirm/admin-meetings API 모두 adminClient로 RLS 우회하여 정확한 데이터 조회

### ✅ Step 7 — 미니 캘린더 + 자동 삭제 Cron
- `app/components/MiniCalendar.tsx` 공용 컴포넌트 생성
  - 월 탐색, 확정 미팅 날짜 컬러 점 표시, 호버 툴팁, 이번 달 목록
- 원장 "내 미팅" 탭, 벤더 인박스, 관리자 미팅현황 우측에 캘린더 배치
- `/api/cron/cleanup`: 7일 지난 미팅 자동 삭제 (확정: confirmed_time 기준, 기타: created_at 기준)
- `vercel.json`: 매일 자정(UTC) Cron 실행 설정
- `CRON_SECRET` 환경변수로 무단 호출 차단

### ✅ Step 8 — [개원비밀공간-일사천리] 개원가이드 이식
- `_reference_opening_guide.html`: 원본 단일 HTML 파일 (gitignore, 로컬 참조용)
- `scripts/extract-guide-data.cjs`: 원본 HTML에서 JS 데이터 추출 스크립트
- `lib/opening-guide-data.ts`: 25개 Step + 17개 Google Docs 본문 + 6개 페이즈 TypeScript 데이터 (146KB)
- `app/(dashboard)/doctor/opening-guide/`: 3탭 페이지
  - `page.tsx`: 헤더(뒤로가기 포함) + 탭 전환
  - `GuideTimeline.tsx`: 단계별 가이드 타임라인 + 모달 (핵심 포인트, 상세 가이드 문서, 도구, 개비공 서비스)
  - `GuideGantt.tsx`: D-120~D-day 준비 일정표 Gantt 차트
  - `GuideChecklist.tsx`: 체크리스트 (인쇄/PDF 지원)
  - `useOpeningProgress.ts`: 체크 진행 상태 공용 훅 (서버 로드 + 300ms debounce 저장)
- `app/api/opening-guide/progress/route.ts`: GET/PATCH — 진행 상태 서버 저장
- `supabase/migration_guide_progress.sql`: `doctor_guide_progress` 테이블 + RLS (**이미 Supabase에 실행 완료**)
- 원장 대시보드에 `📋 개원가이드` 링크 버튼 추가

---

## Google Meet + Calendar 완전 가이드

### 전체 아키텍처

```
서비스 계정 (id-50-55@onlinemeeting-489607.iam.gserviceaccount.com)
    │
    ├─ DWD로 GOOGLE_CALENDAR_OWNER 계정 가장
    │
    ├─ Google Meet API → meet.google.com 링크 생성 (Calendar 무관)
    │
    └─ Google Calendar API → GOOGLE_CALENDAR_ID 캘린더에 일정 등록
```

---

### Step 1. Google Cloud Console

프로젝트 ID: `1062615070613`

활성화해야 할 API (둘 다 필수):
- **Google Meet API** (`meet.googleapis.com`)
- **Google Calendar API** (`calendar-json.googleapis.com`)

서비스 계정 정보:
- 이메일: `id-50-55@onlinemeeting-489607.iam.gserviceaccount.com`
- 클라이언트 ID (숫자): `109654456063098325165`

---

### Step 2. Google Workspace 관리 콘솔 DWD 설정

[admin.google.com](https://admin.google.com) → 보안 → API 제어 → 도메인 수준 위임 관리

클라이언트 ID `109654456063098325165` 에 아래 두 범위를 **콤마로 구분하여 한 줄에** 등록:

```
https://www.googleapis.com/auth/calendar,https://www.googleapis.com/auth/meetings.space.created
```

> ⚠️ 하나라도 빠지면 해당 API가 403 오류. Meet만 쓰고 Calendar는 별도 설정해도 DWD는 항상 두 범위 모두 필요.

---

### Step 3. 환경변수 설정

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=id-50-55@onlinemeeting-489607.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_OWNER=gabi0@mabongopen.kr   # DWD 가장 대상 (변경 금지)
GOOGLE_CALENDAR_ID=gabi0@mabongopen.kr      # 이벤트 등록 캘린더 (변경 가능)
```

> `PRIVATE_KEY`는 반드시 큰따옴표로 감싸고, 줄바꿈을 `\n` 문자로 표현해야 함.

---

### 트러블슈팅 — 실제로 겪은 문제와 해결

#### ❌ 문제 1: Google Meet 링크가 생성되지 않음
**원인**: Google Cloud Console에서 Meet API, Calendar API 둘 다 비활성화 상태였음.
**해결**: Cloud Console에서 두 API 모두 "사용 설정" 버튼 클릭.
**확인 방법**: 관리자 패널 → 🔍 캘린더 진단 버튼 → 단계별 결과 확인.

#### ❌ 문제 2: Meet 링크는 생성되는데 Calendar에 이벤트가 등록되지 않음
**원인**: `google-calendar.ts`에서 Calendar 이벤트 생성 시 `conferenceData`(Google Meet 링크 중복 생성 요청)를 함께 보내고 있었음. Meet 링크는 이미 `google-meet.ts`에서 별도로 생성하는데, Calendar API에 또 Meet 생성을 요청하면 워크스페이스 정책이나 서비스 계정 권한에 따라 이벤트 생성 자체가 실패함.
**해결**: `google-calendar.ts`에서 `conferenceData` 블록 완전 제거. 이제 Calendar는 순수하게 일정만 등록하고, Meet 링크는 `google-meet.ts`에서 독립적으로 생성.

#### ❌ 문제 3: 원장 닉네임이 "알 수 없음"으로 표시/발송됨
**원인**: Supabase RLS 정책으로 인해 벤더 세션 또는 다른 유저 세션에서 `profiles` 테이블의 다른 유저 데이터를 조회하면 null 반환됨.
**해결**: `notify/route.ts`, `confirm/route.ts`, `vendor/page.tsx` 모두 `createAdminClient()` (서비스 롤, RLS 우회)로 `profiles` 직접 조회.

#### ❌ 문제 4: 캘린더에 이벤트가 안 보임
**원인**: 이벤트는 정상 생성됐으나 사용자의 기본 캘린더 이름이 "마봉이"로 되어 있어 다른 캘린더로 오해함.
**해결**: Google Calendar 검색창에 `개비공` 검색하면 이벤트 확인 가능. 이벤트가 어느 캘린더에 있는지와 무관하게 정상 동작.

---

### 별도 캘린더 추가하는 방법

나중에 다른 용도(예: 업체별, 단계별)로 별도 캘린더를 만들고 싶을 때:

#### 1. 새 캘린더 만들기
`gabi0@mabongopen.kr` 계정으로 [calendar.google.com](https://calendar.google.com) 접속
→ 좌측 "다른 캘린더" 옆 **+** 버튼 → "새 캘린더 만들기"
→ 이름 입력 (예: `개비공 미팅`) → 만들기

#### 2. 캘린더 ID 확인
새로 만든 캘린더 이름 옆 **⋮** → "설정 및 공유"
→ 스크롤 내려서 **"캘린더 통합"** 섹션 → **캘린더 ID** 복사
→ 형식: `abc123def456@group.calendar.google.com`

#### 3. 환경변수 변경
`.env.local`에서 `GOOGLE_CALENDAR_ID`만 새 캘린더 ID로 교체:

```
GOOGLE_CALENDAR_OWNER=gabi0@mabongopen.kr              # 그대로 유지
GOOGLE_CALENDAR_ID=abc123def456@group.calendar.google.com  # 새 캘린더 ID로 변경
```

서버 재시작하면 이후 미팅 확정부터 새 캘린더에 등록됨.

> **공유 설정이 필요 없는 이유**: DWD는 서비스 계정이 `gabi0@mabongopen.kr` 본인으로 "변장"하는 방식.
> `gabi0@mabongopen.kr` 계정으로 만든 캘린더는 소유자가 동일하므로, DWD로 이미 모든 권한을 가짐.
> 별도 공유 설정 없이 캘린더 ID만 바꾸면 바로 작동함.

---

## 주요 설계 결정

| 항목 | 결정 |
|------|------|
| 이메일 발송 | Resend 대신 GAS Web App 사용 (워크스페이스 일 1,500건) |
| 캘린더 권한 | 워크스페이스 정책으로 캘린더 공유 불가 → Domain-Wide Delegation으로 해결 |
| Meet vs Calendar | Google Meet 링크는 Meet API로 독립 생성, Calendar는 일정만 등록 (서로 무관) |
| 역할 관리 | 관리자 패널에서 UI로 직접 연결 (Supabase Table Editor 직접 편집 불필요) |
| 계정 연결 | 벤더사 담당자가 `/join/vendor`로 가입 → 관리자가 드롭다운으로 선택하여 연결 |
| 미팅 날짜 선택 | 고정 슬롯 대신 빈 5개 슬롯 + datetime-local picker |
| RLS 우회 | 타 유저 profiles 조회 필요 시 항상 createAdminClient() 사용 |

---

## 로컬 개발 실행

```bash
cd C:\dev\gaebigong-v2
npm run dev
# → http://localhost:3000
```

---

## 개원가이드 내용 수정 방법

개원가이드의 텍스트 내용은 **`lib/opening-guide-data.ts`** 한 파일에 집중되어 있습니다.

### 구조 한눈에 보기

```
lib/opening-guide-data.ts
├── PH[]        — 6개 페이즈 (준비기/구축기/인력기/사전준비/인허가/D-day)
├── S[]         — 25개 Step (각 Step의 제목·팁·링크 목록)
└── DOCS{}      — 17개 Google Docs 상세 가이드 본문 (HTML)
```

### Step 내용 수정 (제목, 팁, 링크)

`S[]` 배열에서 해당 Step의 객체를 찾아 수정합니다.

```typescript
// lib/opening-guide-data.ts → S[] 배열
{
  "id": 0,
  "d": "D-120 이전",      // 타이밍 뱃지
  "n": "01",              // Step 번호
  "t": "구상 및 입지분석 …", // 카드/체크리스트에 표시되는 제목
  "tip": "단순히 유동 인구가 …", // 모달 '핵심 포인트' (HTML 가능)
  "det": [ … ],           // 상세 가이드 링크 목록
  "tls": [ … ],           // 외부 도구 링크 목록
  "gb":  [ … ]            // 개비공 서비스 링크 목록
}
```

### 상세 가이드 문서 본문 수정

`DOCS{}` 객체에서 해당 키를 찾아 `html` 값을 수정합니다.

```typescript
// lib/opening-guide-data.ts → DOCS 객체
"loc1": {
  "title": "입지분석 1편",
  "html": "<h3>…</h3><ul><li>…</li></ul>"  // ← 이 HTML을 직접 수정
}
```

> **키 매핑** (Step의 `det[].dk` 값 → DOCS 키):
> `loc1/loc2`(입지분석), `loan`(대출), `tax`(임대차/세무사), `interior`(인테리어),
> `network`(PC/네트워크), `salary`(장비/급여), `labor`(노무사), `hire1~5`(직원구인),
> `univ`(대학병원), `health`(보건소), `hira`(심평원), `uniform`(유니폼), `rehearsal`(리허설)

### Step 추가 / 삭제

1. `S[]`에 객체 추가 또는 제거
2. `PH[]`에서 해당 페이즈의 `s: [인덱스 배열]` 수정
3. Step `id`는 `S[]`의 배열 인덱스와 일치해야 함 (0부터 순서대로)

### 원본 HTML에서 재추출이 필요한 경우

원본 `_reference_opening_guide.html`이 업데이트된 경우:
```bash
cd C:\dev\gaebigong-v2
node scripts/extract-guide-data.cjs
# → lib/opening-guide-data.ts 자동 덮어쓰기
```

---

## 다음 단계

### Step 9 — 추가 기능 (예정)
- 개원가이드 내용 보완 (미연결 단계: 06·11~16·20~21·23번 Google Docs 연결)
- 기타 기능 확장

### ✅ Step 8 — Vercel 배포 (완료)
- Vercel GitHub 연동 자동 배포 설정 완료
- 환경변수 전체 설정 완료
- Cron은 Vercel Pro 플랜 이상에서 지원 (`vercel.json` 이미 설정 완료)
- 로컬 Cron 테스트: `GET /api/cron/cleanup?secret={CRON_SECRET}`

#### Vercel 환경변수 주의사항
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: Vercel 입력창에서 실제 줄바꿈(Enter)으로 입력 (`\n` 문자 아님)
- `CRON_SECRET`: Vercel에도 동일한 값 설정 필요
