# Google Calendar & Google Meet 연동 가이드

> 이 문서는 **개비공 v2** 프로젝트에서 Google Calendar 일정 자동 생성과 Google Meet 링크 자동 생성을 구현하는 방법을 처음부터 설명합니다.
>
> 대상 독자: 이 기능을 처음 세팅하는 개발자

---

## 목차

1. [전체 구조 이해](#1-전체-구조-이해)
2. [Google Cloud 프로젝트 생성](#2-google-cloud-프로젝트-생성)
3. [API 활성화](#3-api-활성화)
4. [Service Account 생성](#4-service-account-생성)
5. [Domain-Wide Delegation (DWD) 설정](#5-domain-wide-delegation-dwd-설정)
6. [Google Calendar 설정](#6-google-calendar-설정)
7. [환경변수 설정](#7-환경변수-설정)
8. [코드 구현](#8-코드-구현)
9. [사용 예시 (실제 API 라우트)](#9-사용-예시-실제-api-라우트)
10. [연동 진단 (테스트 방법)](#10-연동-진단-테스트-방법)
11. [자주 발생하는 오류 & 해결법](#11-자주-발생하는-오류--해결법)

---

## 1. 전체 구조 이해

### 왜 Service Account를 사용하나?

일반 OAuth는 **사용자가 직접 로그인**해야 토큰이 발급됩니다.
하지만 미팅 확정 시 **백엔드에서 자동으로** 캘린더 일정을 만들어야 하므로, 사용자 개입 없이 동작하는 **Service Account**를 사용합니다.

### 전체 흐름

```
벤더가 미팅 확정 버튼 클릭
      ↓
POST /api/meetings/confirm
      ↓
  ┌─────────────────────────────────────┐
  │  1. Google Meet API                 │
  │     Service Account으로 스페이스 생성 │
  │     → meet.google.com/xxx-xxxx-xxx  │
  └─────────────────────────────────────┘
      ↓
  ┌─────────────────────────────────────┐
  │  2. Google Calendar API             │
  │     Service Account으로 일정 생성    │
  │     → 관리자 캘린더에 일정 추가      │
  └─────────────────────────────────────┘
      ↓
  DB 업데이트 (meet_link, calendar_event_id)
      ↓
  원장에게 이메일 발송 (Meet 링크 포함)
```

### 핵심 개념: Domain-Wide Delegation (DWD)

Service Account는 기본적으로 자신의 캘린더만 조작할 수 있습니다.
**DWD**를 설정하면 Service Account가 **Google Workspace 도메인 내 특정 사용자(관리자)를 가장(impersonate)** 해서 그 사용자의 캘린더에 일정을 생성할 수 있습니다.

```
Service Account
    ↓ (가장: impersonate)
관리자 Google 계정 (admin@yourdomain.com)
    ↓
관리자의 Google Calendar에 일정 추가
```

> **Google Workspace 계정이 필요합니다.** 일반 Gmail(@gmail.com)은 DWD를 지원하지 않습니다.

---

## 2. Google Cloud 프로젝트 생성

### 2-1. Google Cloud Console 접속

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 상단 프로젝트 선택 드롭다운 → **새 프로젝트**

### 2-2. 프로젝트 설정

```
프로젝트 이름: gaebigong-v2 (원하는 이름)
위치: (기본값 그대로)
```

3. **만들기** 클릭 → 프로젝트 생성 완료

---

## 3. API 활성화

생성한 프로젝트에서 아래 2가지 API를 활성화해야 합니다.

### 3-1. Google Calendar API

1. Google Cloud Console → 상단 검색창에 **"Google Calendar API"** 입력
2. **Google Calendar API** 클릭 → **사용** 버튼 클릭

### 3-2. Google Meet API

1. 검색창에 **"Google Meet API"** 입력
2. **Google Meet API** 클릭 → **사용** 버튼 클릭

> **확인**: 왼쪽 메뉴 **API 및 서비스 > 사용 설정된 API 및 서비스**에서 두 API가 목록에 있으면 완료

---

## 4. Service Account 생성

### 4-1. Service Account 생성

1. 왼쪽 메뉴 → **IAM 및 관리자** → **서비스 계정**
2. **서비스 계정 만들기** 클릭
3. 아래 정보 입력:

```
서비스 계정 이름: gaebigong-calendar
서비스 계정 ID:   gaebigong-calendar (자동 완성됨)
설명: 개비공 Google Calendar/Meet 연동용
```

4. **만들고 계속하기** → 역할 설정은 **건너뛰기** → **완료**

### 4-2. JSON 키 파일 다운로드

1. 생성된 서비스 계정 클릭
2. **키** 탭 → **키 추가** → **새 키 만들기**
3. 키 유형: **JSON** 선택 → **만들기**
4. JSON 파일이 자동 다운로드됨 → **안전한 곳에 보관** (공개 저장소에 절대 올리지 마세요)

### 4-3. JSON 파일 내용 확인

다운로드된 JSON 파일을 열면 아래와 같은 구조입니다:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n",
  "client_email": "gaebigong-calendar@your-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

필요한 값:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL` 환경변수에 사용
- `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` 환경변수에 사용

---

## 5. Domain-Wide Delegation (DWD) 설정

> **Google Workspace 관리자 권한**이 필요합니다.
> 일반 Gmail 계정은 이 단계를 수행할 수 없습니다.

### 5-1. Service Account에 DWD 활성화

1. Google Cloud Console → **IAM 및 관리자** → **서비스 계정**
2. 생성한 서비스 계정 클릭 → **세부정보** 탭
3. **도메인 전체 위임** 섹션에서 **도메인 전체 위임 수정** 클릭
4. **G Suite 도메인 전체 위임 사용 설정** 체크
5. **저장**

### 5-2. Google Workspace 관리 콘솔에서 API 범위 승인

1. [admin.google.com](https://admin.google.com) → Google Workspace 관리자로 로그인
2. **보안** → **액세스 및 데이터 제어** → **API 제어**
3. **도메인 전체 위임 관리** 클릭
4. **새로 추가** 클릭

```
클라이언트 ID: <서비스 계정의 클라이언트 ID>  ← JSON의 client_id 값
OAuth 범위 (쉼표로 구분):
  https://www.googleapis.com/auth/calendar,
  https://www.googleapis.com/auth/meetings.space.created
```

5. **승인** 클릭

> **클라이언트 ID 찾는 방법**: JSON 파일의 `client_id` 값 또는
> Google Cloud Console → 서비스 계정 → **고유 ID** 열의 숫자

---

## 6. Google Calendar 설정

### 6-1. 캘린더 생성

Google Calendar에서 용도별로 캘린더를 새로 만듭니다 (기존 캘린더 사용 가능).

1. [calendar.google.com](https://calendar.google.com) → 관리자 계정 로그인
2. 왼쪽 **다른 캘린더** 옆 **+** 클릭 → **새 캘린더 만들기**
3. 이름 설정:
   - `개비공 - 일반 미팅`
   - `개비공 - 일사천리`
   - `개비공 - 비딩`

4. 각각 **캘린더 만들기** 클릭

### 6-2. 캘린더 ID 확인

1. 캘린더 이름 옆 **점 3개** 메뉴 → **설정 및 공유**
2. **캘린더 통합** 섹션 → **캘린더 ID** 복사

```
예시 형식:
abc123xyz@group.calendar.google.com   (새로 만든 캘린더)
admin@yourdomain.com                   (기본 캘린더)
```

### 6-3. Service Account에 캘린더 공유

Service Account가 캘린더에 일정을 추가하려면 **편집 권한**이 있어야 합니다.

1. 캘린더 **설정 및 공유** 페이지
2. **특정 사용자 또는 그룹과 공유** 섹션 → **사용자 추가**
3. 이메일: `gaebigong-calendar@your-project.iam.gserviceaccount.com` (서비스 계정 이메일)
4. 권한: **일정 변경 및 공유 관리** 선택
5. **보내기** 클릭

> 캘린더 3개 모두 동일하게 반복합니다.

---

## 7. 환경변수 설정

프로젝트 루트의 `.env.local` 파일에 추가:

```bash
# ── Google API (Calendar + Meet) ──────────────────────────

# Service Account 이메일 (JSON의 client_email)
GOOGLE_SERVICE_ACCOUNT_EMAIL=gaebigong-calendar@your-project.iam.gserviceaccount.com

# Service Account Private Key (JSON의 private_key, 따옴표 포함)
# \n을 그대로 유지해야 합니다 (줄바꿈 문자)
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"

# DWD 주체: 가장할 Workspace 사용자 이메일 (관리자 계정)
# 이 사용자의 이름으로 캘린더 일정이 생성됩니다
GOOGLE_CALENDAR_OWNER=admin@yourdomain.com

# 캘린더 ID (각 용도별로 분리)
GOOGLE_CALENDAR_ID=abc123@group.calendar.google.com           # 일반 미팅용
GOOGLE_CALENDAR_ID_EXPRESS=def456@group.calendar.google.com  # 일사천리 전용
GOOGLE_CALENDAR_ID_BIDDING=ghi789@group.calendar.google.com  # 비딩 전용
```

### Private Key 입력 시 주의사항

JSON 파일의 `private_key`는 아래처럼 생겼습니다:
```
"-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

`.env.local`에 넣을 때:
- 바깥 큰따옴표 포함해서 그대로 붙여넣기
- `\n`은 **그대로 유지** (실제 줄바꿈으로 바꾸면 안 됨)

---

## 8. 코드 구현

### 패키지 설치

```bash
npm install googleapis
```

### 8-1. Google Meet 스페이스 생성 (`lib/google-meet.ts`)

```typescript
/**
 * Google Meet API — 미팅 스페이스 생성
 * 필요한 DWD 범위: https://www.googleapis.com/auth/meetings.space.created
 */
import { google } from 'googleapis'

function getMeetAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n')
  // DWD subject: Workspace 사용자 이메일 (이 사용자를 가장해서 Meet 생성)
  const subject = process.env.GOOGLE_CALENDAR_OWNER || process.env.GOOGLE_CALENDAR_ID!

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/meetings.space.created'],
    subject,
  })
}

/**
 * Google Meet 스페이스 생성 → meet.google.com/xxx-xxxx-xxx 반환
 * 실패 시 null 반환 (non-blocking 사용 권장)
 */
export async function createMeetSpace(): Promise<string | null> {
  try {
    const auth = getMeetAuth()
    const meet = google.meet({ version: 'v2', auth })
    const res = await (meet.spaces as any).create({ requestBody: {} })
    const meetingUri = res.data?.meetingUri ?? null
    console.log('[google-meet] Meet 스페이스 생성 완료:', meetingUri)
    return meetingUri
  } catch (err: any) {
    console.error('[google-meet] Meet 스페이스 생성 실패:', err.message ?? err)
    return null
  }
}
```

### 8-2. Google Calendar 일정 생성 (`lib/google-calendar.ts`)

```typescript
/**
 * Google Calendar API 유틸 (Service Account + Domain-Wide Delegation)
 * 필요한 DWD 범위: https://www.googleapis.com/auth/calendar
 */
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar']

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n')
  // DWD subject: GOOGLE_CALENDAR_OWNER 우선, 없으면 GOOGLE_CALENDAR_ID
  const subject = process.env.GOOGLE_CALENDAR_OWNER || process.env.GOOGLE_CALENDAR_ID!

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
    subject,
  })
}

// ── 타입 정의 ───────────────────────────────────────────────

export interface CreateMeetingEventParams {
  title: string         // 예: "[개비공] 홍길동 원장님 × 메디인테리어"
  description: string   // 예: "개원 단계: 인테리어\n참석: 홍길동 원장님, 메디인테리어"
  startTime: string     // ISO 8601 형식 (예: "2025-03-15T14:00:00+09:00")
  durationMinutes?: number  // 기본값: 60분
  attendeeEmails?: string[] // 참석자 이메일 목록 (선택)
}

export interface MeetingEventResult {
  eventId: string       // Google Calendar 이벤트 ID (삭제 시 필요)
  meetLink: string | null
}

// ── 일정 생성 ────────────────────────────────────────────────

/**
 * Google Calendar에 일정 생성
 * @param params 일정 정보
 * @param calendarIdOverride 특정 캘린더 ID (없으면 GOOGLE_CALENDAR_ID 사용)
 */
export async function createMeetingEvent(
  params: CreateMeetingEventParams,
  calendarIdOverride?: string
): Promise<MeetingEventResult> {
  const { title, description, startTime, durationMinutes = 60, attendeeEmails = [] } = params

  const auth = getAuth()
  const calendar = google.calendar({ version: 'v3', auth })
  const calendarId = calendarIdOverride ?? process.env.GOOGLE_CALENDAR_ID!

  const start = new Date(startTime)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: title,
      description,
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Seoul' },
      end:   { dateTime: end.toISOString(),   timeZone: 'Asia/Seoul' },
      attendees: attendeeEmails.map(email => ({ email })),
    },
  })

  return {
    eventId: event.data.id!,
    meetLink: null,  // Calendar API로는 Meet 링크를 생성하지 않음 (google-meet.ts 사용)
  }
}

// ── 일정 삭제 ────────────────────────────────────────────────

/**
 * Google Calendar에서 일정 삭제
 * 이미 삭제됐거나 없는 이벤트는 에러 없이 무시
 */
export async function deleteMeetingEvent(eventId: string): Promise<void> {
  const auth = getAuth()
  const calendar = google.calendar({ version: 'v3', auth })
  const calendarId = process.env.GOOGLE_CALENDAR_ID!

  await calendar.events.delete({ calendarId, eventId }).catch(() => {
    // 이미 삭제됐거나 없는 이벤트는 무시
  })
}
```

---

## 9. 사용 예시 (실제 API 라우트)

### 9-1. 미팅 확정 시 Meet + Calendar 생성

```typescript
// app/api/meetings/confirm/route.ts (핵심 부분만 발췌)
import { createMeetSpace } from '@/lib/google-meet'
import { createMeetingEvent } from '@/lib/google-calendar'

// ── 1. Google Meet 링크 생성 ────────────────────────────────
let meetLink: string | null = null
meetLink = await createMeetSpace()  // 실패 시 null 반환 (미팅 자체는 계속 진행)

// ── 2. Google Calendar 일정 생성 (설정에 따라 선택적) ──────
let calendarEventId: string | null = null

// admin_settings 테이블에서 calendar_enabled 여부 확인
const { data: calSetting } = await adminClient
  .from('app_settings')
  .select('value')
  .eq('key', 'calendar_enabled')
  .single()

const calendarEnabled = calSetting?.value !== 'false'

if (calendarEnabled) {
  try {
    const { eventId } = await createMeetingEvent({
      title: `[개비공] ${doctorName} 원장님 × ${vendorName}`,
      description: `개원 단계: ${stageName}\n참석: ${doctorName} 원장님, ${vendorName}`,
      startTime: confirmedTime,        // ISO 8601 문자열
      durationMinutes: 60,
      attendeeEmails: [doctorEmail, vendorEmail].filter(Boolean),
    })
    calendarEventId = eventId
  } catch (calErr: any) {
    // 캘린더 생성 실패해도 미팅 확정은 계속 진행 (non-blocking)
    console.error('[confirm] 캘린더 생성 실패:', calErr.message)
  }
}

// ── 3. DB에 저장 ────────────────────────────────────────────
await supabase
  .from('meeting_requests')
  .update({
    status: 'confirmed',
    confirmed_time: confirmedTime,
    meet_link: meetLink,               // null이어도 저장
    calendar_event_id: calendarEventId, // null이어도 저장
  })
  .eq('id', requestId)
```

### 9-2. 비딩 슬롯 선점 시 비딩 전용 캘린더에 생성

```typescript
// app/api/bidding/slots/claim/route.ts (핵심 부분만 발췌)

// Meet 링크 생성
const meetLink = await createMeetSpace()

// 비딩 전용 캘린더에 일정 생성
const biddingCalendarId = process.env.GOOGLE_CALENDAR_ID_BIDDING
if (biddingCalendarId) {
  const { eventId } = await createMeetingEvent(
    {
      title: `[개비공 비딩 ${round}차] ${doctorName} × ${vendorName}`,
      description: `비딩 회차: ${round}차\nGoogle Meet: ${meetLink}`,
      startTime: slot.proposed_time,
      durationMinutes: 60,
      attendeeEmails: [doctorEmail],
    },
    biddingCalendarId  // 두 번째 인자로 캘린더 ID 전달
  )
  calendarEventId = eventId
}
```

### 9-3. 캘린더 ID별 용도 분기 패턴

```typescript
// 미팅 타입에 따라 다른 캘린더 사용
let calendarIdToUse: string | undefined

if (meetingType === 'express') {
  // 일사천리 미팅 → 일사천리 전용 캘린더 (항상 생성)
  calendarIdToUse = process.env.GOOGLE_CALENDAR_ID_EXPRESS

} else if (meetingType === 'bidding') {
  // 비딩 미팅 → 비딩 전용 캘린더
  calendarIdToUse = process.env.GOOGLE_CALENDAR_ID_BIDDING

} else {
  // 일반 미팅 → admin 설정에 따라 선택적 생성
  calendarIdToUse = process.env.GOOGLE_CALENDAR_ID
}

if (calendarIdToUse) {
  const { eventId } = await createMeetingEvent(params, calendarIdToUse)
}
```

---

## 10. 연동 진단 (테스트 방법)

### 10-1. 진단 API 구현

```typescript
// app/api/admin/test-calendar/route.ts
import { NextResponse } from 'next/server'
import { createMeetSpace } from '@/lib/google-meet'
import { createMeetingEvent, deleteMeetingEvent } from '@/lib/google-calendar'

export async function GET() {
  // (인증/권한 체크 생략)

  const steps: { step: string; status: 'ok' | 'fail'; detail?: string }[] = []

  // ── Step 1. 환경변수 확인 ─────────────────────────────────
  const envCheck = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL:    !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    GOOGLE_CALENDAR_ID:              !!process.env.GOOGLE_CALENDAR_ID,
  }
  const envOk = Object.values(envCheck).every(Boolean)
  steps.push({
    step: '환경변수 확인',
    status: envOk ? 'ok' : 'fail',
    detail: JSON.stringify(envCheck),
  })
  if (!envOk) return NextResponse.json({ ok: false, steps })

  // ── Step 2. Google Meet 스페이스 생성 테스트 ──────────────
  try {
    const meetUri = await createMeetSpace()
    steps.push({
      step: 'Google Meet 스페이스 생성',
      status: meetUri ? 'ok' : 'fail',
      detail: meetUri ?? 'meetingUri가 null로 반환됨',
    })
  } catch (err: any) {
    steps.push({ step: 'Google Meet 스페이스 생성', status: 'fail', detail: err.message })
  }

  // ── Step 3. Google Calendar 이벤트 생성 테스트 ───────────
  let eventId: string | null = null
  try {
    const startTime = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
    const result = await createMeetingEvent({
      title: '[테스트] 캘린더 연동 확인',
      description: '테스트용 이벤트. 자동 삭제됩니다.',
      startTime,
      durationMinutes: 30,
      attendeeEmails: [],
    })
    eventId = result.eventId
    steps.push({ step: 'Google Calendar 이벤트 생성', status: 'ok', detail: `eventId: ${result.eventId}` })
  } catch (err: any) {
    steps.push({ step: 'Google Calendar 이벤트 생성', status: 'fail', detail: err.message })
  }

  // ── Step 4. 테스트 이벤트 삭제 ───────────────────────────
  if (eventId) {
    try {
      await deleteMeetingEvent(eventId)
      steps.push({ step: '테스트 이벤트 삭제', status: 'ok' })
    } catch {
      steps.push({ step: '테스트 이벤트 삭제', status: 'fail', detail: '수동 삭제 필요' })
    }
  }

  const allOk = steps.every(s => s.status === 'ok')
  return NextResponse.json({ ok: allOk, steps })
}
```

### 10-2. 진단 실행

앱이 실행 중인 상태에서:

```bash
# 브라우저 또는 curl로 접속 (관리자 로그인 상태에서)
GET http://localhost:3000/api/admin/test-calendar
```

**성공 응답 예시:**
```json
{
  "ok": true,
  "steps": [
    { "step": "환경변수 확인",              "status": "ok", "detail": "{...}" },
    { "step": "Google Meet 스페이스 생성",  "status": "ok", "detail": "https://meet.google.com/abc-defg-hij" },
    { "step": "Google Calendar 이벤트 생성","status": "ok", "detail": "eventId: abc123xyz" },
    { "step": "테스트 이벤트 삭제",         "status": "ok" }
  ]
}
```

**실패 응답 예시:**
```json
{
  "ok": false,
  "steps": [
    { "step": "환경변수 확인", "status": "ok", "detail": "{...}" },
    { "step": "Google Meet 스페이스 생성", "status": "fail",
      "detail": "Error: insufficient authentication scopes" }
  ]
}
```

---

## 11. 자주 발생하는 오류 & 해결법

### 오류 1: `insufficient authentication scopes`

**의미**: Service Account에 필요한 권한 범위가 없음
**원인**: Google Workspace 관리 콘솔에서 API 범위 승인이 안 됨
**해결**:
1. [admin.google.com](https://admin.google.com) → 보안 → API 제어 → 도메인 전체 위임 관리
2. 클라이언트 ID 확인 (JSON의 `client_id`)
3. 아래 범위가 모두 등록되었는지 확인:
   ```
   https://www.googleapis.com/auth/calendar
   https://www.googleapis.com/auth/meetings.space.created
   ```

---

### 오류 2: `Not Authorized to access this resource/api`

**의미**: Service Account가 해당 캘린더에 접근 권한 없음
**원인**: 캘린더 공유 설정에 서비스 계정 이메일이 없거나 권한 부족
**해결**:
1. Google Calendar → 해당 캘린더 설정 및 공유
2. 서비스 계정 이메일 추가 → 권한: **일정 변경 및 공유 관리**

---

### 오류 3: `invalid_grant` 또는 `unauthorized_client`

**의미**: DWD 주체(subject) 설정 오류
**원인**: `GOOGLE_CALENDAR_OWNER`가 Workspace 도메인 사용자가 아님, 또는 DWD 미활성화
**해결**:
1. `GOOGLE_CALENDAR_OWNER` 값이 **Google Workspace 계정 이메일**인지 확인 (일반 Gmail 불가)
2. Google Cloud Console → 서비스 계정 → **도메인 전체 위임 사용 설정** 체크 여부 확인

---

### 오류 4: Private Key 파싱 오류

**의미**: `private_key` 형식이 잘못됨
**원인**: `.env.local`에서 `\n` 처리가 안 됨
**해결**: 코드에서 아래 처리가 반드시 필요:
```typescript
const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n')
//                                                                  ^^^^^^^^^^^^^^^^^^^^^^
//                                                        환경변수의 리터럴 \n → 실제 줄바꿈
```

---

### 오류 5: Meet API `meet.spaces.create is not a function`

**의미**: googleapis 패키지 버전이 낮아 Meet API를 지원하지 않음
**해결**:
```bash
npm install googleapis@latest
```
코드에서 타입 오류 방지용 캐스팅 사용:
```typescript
const res = await (meet.spaces as any).create({ requestBody: {} })
```

---

### 오류 6: `PERMISSION_DENIED: The caller does not have permission`

**의미**: Calendar API가 프로젝트에서 활성화되지 않음
**해결**:
1. Google Cloud Console → API 및 서비스 → 사용 설정된 API
2. **Google Calendar API**, **Google Meet API** 모두 활성화 확인

---

## 체크리스트

세팅 완료 여부를 아래 목록으로 확인하세요:

```
Google Cloud 설정
  [ ] Google Cloud 프로젝트 생성
  [ ] Google Calendar API 활성화
  [ ] Google Meet API 활성화
  [ ] Service Account 생성
  [ ] Service Account JSON 키 다운로드
  [ ] Service Account에 DWD 활성화

Google Workspace 설정
  [ ] 관리 콘솔에서 DWD 범위 승인 (calendar + meetings.space.created)

Google Calendar 설정
  [ ] 캘린더 3개 생성 (일반 / 일사천리 / 비딩)
  [ ] 각 캘린더에 Service Account 공유 (편집 권한)
  [ ] 각 캘린더 ID 복사

환경변수 설정
  [ ] GOOGLE_SERVICE_ACCOUNT_EMAIL
  [ ] GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  [ ] GOOGLE_CALENDAR_OWNER
  [ ] GOOGLE_CALENDAR_ID
  [ ] GOOGLE_CALENDAR_ID_EXPRESS
  [ ] GOOGLE_CALENDAR_ID_BIDDING

코드 설치
  [ ] npm install googleapis
  [ ] lib/google-meet.ts 작성
  [ ] lib/google-calendar.ts 작성

최종 확인
  [ ] GET /api/admin/test-calendar → ok: true 확인
```
