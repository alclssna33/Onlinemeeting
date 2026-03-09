/**
 * GAS Web App을 통한 이메일 발송 유틸리티
 */

const GAS_URL = process.env.GAS_WEBAPP_URL!

type EmailType = 'meeting_request' | 'meeting_confirmed' | 'meeting_rejected' | 'vendor_selected' | 'vendor_eliminated' | 'bidding_slot_claimed' | 'bidding_slot_cancelled' | 'bidding_event_created'

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

interface VendorSelectionPayload {
  vendorEmail: string
  vendorName: string
  doctorName: string
  doctorPhone?: string | null
  stageName: string
  meetLink?: string | null
}

interface VendorEliminatedPayload {
  vendorEmail: string
  vendorName: string
  doctorName: string
  stageName: string
}

interface BiddingSlotClaimedPayload {
  doctorEmail: string
  doctorName: string
  vendorName: string
  biddingRound: number
  slotTime: string       // ISO 8601
  meetLink?: string | null
}

interface BiddingSlotCancelledPayload {
  doctorEmail: string
  doctorName: string
  vendorName: string
  biddingRound: number
  slotTime: string
}

interface BiddingEventCreatedPayload {
  vendorEmail: string
  vendorName: string
  doctorName: string
  biddingRound: number
  title: string | null
  slotsCount: number
  platformUrl: string
}

type EmailPayload =
  | { type: 'meeting_request'; data: MeetingRequestPayload }
  | { type: 'meeting_confirmed'; data: MeetingConfirmedPayload }
  | { type: 'meeting_rejected'; data: MeetingRejectedPayload }
  | { type: 'vendor_selected'; data: VendorSelectionPayload }
  | { type: 'vendor_eliminated'; data: VendorEliminatedPayload }
  | { type: 'bidding_slot_claimed'; data: BiddingSlotClaimedPayload }
  | { type: 'bidding_slot_cancelled'; data: BiddingSlotCancelledPayload }
  | { type: 'bidding_event_created'; data: BiddingEventCreatedPayload }

async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!GAS_URL) {
    console.warn('[email] GAS_WEBAPP_URL 환경변수가 없습니다.')
    return
  }
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  })

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    const text = await res.text()
    console.error('[email] GAS가 JSON이 아닌 응답 반환:', res.status, text.slice(0, 200))
    throw new Error(`GAS 응답 오류 (status: ${res.status}) — GAS 스크립트 권한 승인이 필요할 수 있습니다.`)
  }

  const result = await res.json()
  if (!result.success) {
    throw new Error(`[email] GAS 발송 실패: ${result.error}`)
  }
  console.log('[email] 발송 완료:', payload.type)
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

/** 원장이 벤더사를 선정했을 때 해당 벤더사에게 알림 */
export function notifyVendorSelected(data: VendorSelectionPayload) {
  return sendEmail({ type: 'vendor_selected', data })
}

/** 원장이 다른 벤더사를 선정하여 탈락됐을 때 해당 벤더사에게 알림 */
export function notifyVendorEliminated(data: VendorEliminatedPayload) {
  return sendEmail({ type: 'vendor_eliminated', data })
}

/** 비딩 슬롯 선점 시 원장에게 알림 */
export function notifyDoctorBiddingSlotClaimed(data: BiddingSlotClaimedPayload) {
  return sendEmail({ type: 'bidding_slot_claimed', data })
}

/** 비딩 슬롯 취소 시 원장에게 알림 */
export function notifyDoctorBiddingSlotCancelled(data: BiddingSlotCancelledPayload) {
  return sendEmail({ type: 'bidding_slot_cancelled', data })
}

/** 비딩 이벤트 등록 시 배정된 벤더사에게 알림 */
export function notifyVendorBiddingEventCreated(data: BiddingEventCreatedPayload) {
  return sendEmail({ type: 'bidding_event_created', data })
}
