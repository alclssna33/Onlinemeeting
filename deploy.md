# 개비공 v2 — Vercel 배포 가이드

> 배포 URL: https://onlinemeeting-zeta.vercel.app

---

## 배포 전: 빌드 확인

```bash
cd C:\dev\gaebigong-v2
npm run build
```

오류 없이 완료되면 배포 진행.

---

## 1. Vercel 프로젝트 생성

1. [vercel.com](https://vercel.com) → GitHub 계정으로 로그인
2. **Add New Project** → GitHub 저장소 `Onlinemeeting` → **Import**
3. 설정 기본값 그대로 (Next.js 자동 감지)

---

## 2. Vercel 환경변수 입력

**Deploy 전에** Environment Variables 섹션에 아래를 모두 입력:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
GOOGLE_CALENDAR_OWNER
GOOGLE_CALENDAR_ID
GOOGLE_CALENDAR_ID_EXPRESS
GOOGLE_CALENDAR_ID_BIDDING
GAS_WEBAPP_URL
NEXT_PUBLIC_APP_URL   ← https://onlinemeeting-zeta.vercel.app
```

값은 `C:\dev\gaebigong-v2\.env.local` 파일 참고.

**Deploy** 클릭 → 2~3분 후 배포 완료.

---

## 3. 배포 후 설정

### 3-1. Supabase 콜백 URL 등록

1. [supabase.com](https://supabase.com) → 프로젝트 → **Authentication** → **URL Configuration**
2. **Site URL**:
   ```
   https://onlinemeeting-zeta.vercel.app
   ```
3. **Redirect URLs**에 추가:
   ```
   https://onlinemeeting-zeta.vercel.app/auth/callback
   https://onlinemeeting-zeta.vercel.app/auth/vendor-callback
   ```
4. **Save**

### 3-2. Google Cloud Console — OAuth 리디렉션 URI 등록

> ⚠️ 주의: Google에 등록하는 URI는 **앱 URL이 아니라 Supabase 서버 URL**입니다.
>
> Google OAuth 흐름: 사용자 → Google 로그인 → **Supabase 서버** → 앱
> Google이 리다이렉트하는 대상은 Supabase이므로, Supabase URL을 등록해야 합니다.

1. [console.cloud.google.com](https://console.cloud.google.com) → **API 및 서비스** → **사용자 인증 정보**
2. OAuth 2.0 클라이언트 클릭
3. **승인된 리디렉션 URI**에 아래 **1개**만 추가:
   ```
   https://qfrdzwlodkdmsvoktpvq.supabase.co/auth/v1/callback
   ```
4. **저장**

---

## 자주 발생하는 오류

### `400 오류: redirect_uri_mismatch`

**원인**: Google Cloud Console에 앱 URL을 등록했을 때 발생.

**해결**: 3-2 단계에서 Supabase 콜백 URL(`...supabase.co/auth/v1/callback`) **1개만** 등록되어 있는지 확인.

---

## 환경변수 업데이트 후 재배포

환경변수를 수정한 경우:

1. Vercel → 프로젝트 → **Settings** → **Environment Variables** 수정
2. **Deployments** 탭 → 최신 배포 우클릭 → **Redeploy**
