/**
 * GAS Web App을 통한 이메일 발송 유틸리티
 */

const GAS_URL = process.env.GAS_WEBAPP_URL!

type EmailType = 'meeting_request' | 'meeting_confirmed' | 'meeting_rejected'

interface MeetingRequestPayload {
  vendorEmail: string
  vendorName: string
  doctorName: string
  stageName: string
  proposedTimes: string[]
}

interface MeetingConfirmedPayload {
  doctorEmail: string
  doctorName: string
  vendorName: string
  stageName: string
  confirmedTime: string
  meetLink?: string | null
}

interface MeetingRejectedPayload {
  doctorEmail: string
  doctorName: string
  vendorName: string
  stageName: string
}

type EmailPayload =
  | { type: 'meeting_request'; data: MeetingRequestPayload }
  | { type: 'meeting_confirmed'; data: MeetingConfirmedPayload }
  | { type: 'meeting_rejected'; data: MeetingRejectedPayload }

async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!GAS_URL) {
    console.warn('[email] GAS_WEBAPP_URL 환경변수가 없습니다.')
    return
  }
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const result = await res.json()
  if (!result.success) {
    throw new Error(`[email] GAS 발송 실패: ${result.error}`)
  }
}

/** 원장 → 벤더사 미팅 요청 시 벤더사에게 알림 */
export function notifyVendorMeetingRequest(data: MeetingRequestPayload) {
  return sendEmail({ type: 'meeting_request', data })
}

/** 벤더사 확정 시 원장에게 알림 */
export function notifyDoctorMeetingConfirmed(data: MeetingConfirmedPayload) {
  return sendEmail({ type: 'meeting_confirmed', data })
}

/** 벤더사 거절 시 원장에게 알림 */
export function notifyDoctorMeetingRejected(data: MeetingRejectedPayload) {
  return sendEmail({ type: 'meeting_rejected', data })
}
