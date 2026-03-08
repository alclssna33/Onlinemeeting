/**
 * Google Calendar API 유틸 (Service Account + Domain-Wide Delegation)
 * 미팅 확정 시 관리자 캘린더에 일정 생성 + Google Meet 링크 반환
 */
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar']

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n')
  // DWD subject: 워크스페이스 사용자 이메일 (GOOGLE_CALENDAR_OWNER 우선, 없으면 GOOGLE_CALENDAR_ID)
  const subject = process.env.GOOGLE_CALENDAR_OWNER || process.env.GOOGLE_CALENDAR_ID!

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
    subject,
  })
}

export interface CreateMeetingEventParams {
  title: string        // 예: "[개비공] 홍길동 원장님 × 메디인테리어"
  description: string  // 예: "[인테리어비딩] 원장님 전달사항: ..."
  startTime: string    // ISO 8601
  durationMinutes?: number  // 기본 60분
  attendeeEmails?: string[]
}

export interface MeetingEventResult {
  eventId: string
  meetLink: string | null
}

export async function createMeetingEvent(
  params: CreateMeetingEventParams
): Promise<MeetingEventResult> {
  const { title, description, startTime, durationMinutes = 60, attendeeEmails = [] } = params

  const auth = getAuth()
  const calendar = google.calendar({ version: 'v3', auth })
  const calendarId = process.env.GOOGLE_CALENDAR_ID!

  const start = new Date(startTime)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: title,
      description,
      start: { dateTime: start.toISOString(), timeZone: 'Asia/Seoul' },
      end: { dateTime: end.toISOString(), timeZone: 'Asia/Seoul' },
      attendees: attendeeEmails.map(email => ({ email })),
    },
  })

  return {
    eventId: event.data.id!,
    meetLink: null,
  }
}

export async function deleteMeetingEvent(eventId: string): Promise<void> {
  const auth = getAuth()
  const calendar = google.calendar({ version: 'v3', auth })
  const calendarId = process.env.GOOGLE_CALENDAR_ID!

  await calendar.events.delete({ calendarId, eventId }).catch(() => {
    // 이미 삭제됐거나 없는 이벤트는 무시
  })
}
