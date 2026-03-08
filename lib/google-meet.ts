/**
 * Google Meet API — 미팅 스페이스 생성
 * Google Calendar와 무관하게 meet.google.com 링크를 생성합니다.
 *
 * 필요한 DWD 범위:
 *   https://www.googleapis.com/auth/meetings.space.created
 */
import { google } from 'googleapis'

function getMeetAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n')
  const subject = process.env.GOOGLE_CALENDAR_ID! // Workspace 사용자 이메일 (DWD subject)

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/meetings.space.created'],
    subject,
  })
}

/**
 * Google Meet 스페이스 생성 → meet.google.com/xxx-xxxx-xxx 반환
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
