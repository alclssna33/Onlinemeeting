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
│   └── login/                  # 구글 로그인 페이지
├── auth/
│   ├── callback/route.ts        # OAuth 콜백 (일반 가입)
│   └── vendor-callback/route.ts # OAuth 콜백 (벤더 전용)
├── (dashboard)/
│   ├── doctor/                  # 원장 대시보드
│   │   ├── page.tsx
│   │   └── MeetingRequestModal.tsx  # 미팅 신청 모달
│   ├── vendor/                  # 벤더사 대시보드
│   │   ├── page.tsx
│   │   └── VendorInbox.tsx          # 미팅 수락/거절 인박스
│   └── admin/                   # 관리자 패널
│       ├── page.tsx
│       ├── AdminPanel.tsx           # 단계/업체 관리 + 계정 연결
│       └── MeetingMonitor.tsx       # 전체 미팅 현황 모니터링
├── join/
│   └── vendor/page.tsx          # 제휴업체 전용 가입 페이지
└── api/
    ├── admin/
    │   ├── stages/route.ts       # 개원 단계 CRUD
    │   ├── vendors/route.ts      # 제휴업체 CRUD
    │   ├── vendors/link/route.ts # 벤더사 계정 연결/해제
    │   ├── profiles/route.ts     # 연결 가능한 가입자 목록
    │   └── meetings/route.ts     # 전체 미팅 현황 조회
    └── meetings/
        ├── confirm/route.ts      # 미팅 확정 (캘린더 생성 포함)
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

### 필수 마이그레이션 (Supabase SQL Editor에서 실행)
```sql
ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS vendor_note TEXT;
ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
```

---

## 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
GOOGLE_CALENDAR_ID=          # 관리자 워크스페이스 이메일

GAS_WEBAPP_URL=              # Apps Script 이메일 Web App URL

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

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
- Service Account + Domain-Wide Delegation으로 관리자 캘린더에 일정 자동 생성
- 미팅 확정 시 Google Meet 링크 자동 생성 후 DB 저장
- 관리자 "📅 미팅 현황" 탭: 통계 카드 + 상태 필터 + 검색 + 테이블

---

## 다음 단계

### Step 6 — Vercel 배포
- Vercel에 GitHub 연동 배포
- 환경변수 설정 (GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY 줄바꿈 주의)
- `NEXT_PUBLIC_APP_URL` 프로덕션 URL로 변경

---

## 주요 설계 결정

| 항목 | 결정 |
|------|------|
| 이메일 발송 | Resend 대신 GAS Web App 사용 (워크스페이스 일 1,500건) |
| 캘린더 권한 | 워크스페이스 정책으로 캘린더 공유 불가 → Domain-Wide Delegation으로 해결 |
| 역할 관리 | 관리자 패널에서 UI로 직접 연결 (Supabase Table Editor 직접 편집 불필요) |
| 계정 연결 | 벤더사 담당자가 `/join/vendor`로 가입 → 관리자가 드롭다운으로 선택하여 연결 |
| 미팅 날짜 선택 | 고정 슬롯 대신 빈 5개 슬롯 + datetime-local picker |

---

## 로컬 개발 실행

```bash
cd C:\dev\gaebigong-v2
npm run dev
# → http://localhost:3000
```

## Google Calendar Domain-Wide Delegation 설정

1. Google Cloud Console → 서비스 계정 키 생성 (JSON)
2. Google Workspace 관리 콘솔 → 보안 → API 제어 → 도메인 수준 위임
3. 클라이언트 ID: `109654456063098325165`
4. OAuth 범위: `https://www.googleapis.com/auth/calendar`
