/**
 * 개비공 v2 – Supabase Database Types
 * 기존 GAS 시트(Doctors, Stages, Vendors_Master, Scheduling, Meetings)를
 * PostgreSQL 관계형 모델로 재설계
 */

export type UserRole = 'admin' | 'doctor' | 'vendor'
export type MeetingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled'
export type StageStatus = 'not_started' | 'in_progress' | 'completed'
export type MeetingType = 'standard' | 'express'
export type SelectionStatus = 'selected' | 'eliminated'
export type BiddingRound = 1 | 2 | 3
export type BiddingEventStatus = 'open' | 'closed' | 'completed'
export type BiddingSlotStatus = 'available' | 'claimed' | 'cancelled'

export type Database = {
  public: {
    Tables: {
      // ── 사용자 프로필 (Supabase Auth users 테이블 확장) ──
      profiles: {
        Row: {
          id: string             // auth.users.id
          role: UserRole
          name: string
          email: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }

      // ── 벤더사(Vendor) 추가 정보 ──
      vendors: {
        Row: {
          id: string             // profiles.id
          company_name: string
          rep_name: string | null    // 담당자명
          category_id: number        // 해당 개원 단계 카테고리
          description: string | null
          website: string | null
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['vendors']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['vendors']['Insert']>
      }

      // ── 개원 단계 카테고리 (기존 Stages 시트) ──
      stages: {
        Row: {
          id: number
          name: string           // e.g. '인테리어', '의료기기', '세무/회계'
          description: string | null
          order_index: number    // 표시 순서
          color: string | null   // 카테고리 색상 (hex)
          icon: string | null    // lucide icon name
        }
        Insert: Omit<Database['public']['Tables']['stages']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['stages']['Insert']>
      }

      // ── 개원 프로세스 타임라인 항목 (기존 시트1/Process_Timeline) ──
      process_items: {
        Row: {
          id: number
          stage_id: number
          title: string
          description: string | null
          guide: string | null       // 세부 가이드라인
          order_index: number
          typical_timing: string | null  // e.g. '개원 6개월 전'
        }
        Insert: Omit<Database['public']['Tables']['process_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['process_items']['Insert']>
      }

      // ── 원장별 프로세스 진행 상태 (기존 Process_Status) ──
      doctor_progress: {
        Row: {
          id: number
          doctor_id: string
          process_item_id: number
          status: StageStatus
          completed_at: string | null
          note: string | null
        }
        Insert: Omit<Database['public']['Tables']['doctor_progress']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['doctor_progress']['Insert']>
      }

      doctor_guide_progress: {
        Row: {
          profile_id: string
          completed_steps: number[]
          updated_at: string
        }
        Insert: {
          profile_id: string
          completed_steps?: number[]
          updated_at?: string
        }
        Update: {
          completed_steps?: number[]
          updated_at?: string
        }
      }

      // ── 미팅 요청 (기존 Scheduling + Meetings 통합) ──
      meeting_requests: {
        Row: {
          id: string             // UUID
          doctor_id: string
          vendor_id: string
          stage_id: number
          status: MeetingStatus
          meeting_type: MeetingType  // 'standard' | 'express'
          proposed_times: string[]   // ISO 8601 날짜/시간 배열 (최대 5개)
          confirmed_time: string | null
          meet_link: string | null   // Google Meet URL
          calendar_event_id: string | null
          note: string | null
          vendor_note: string | null
          selection_status: SelectionStatus | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['meeting_requests']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['meeting_requests']['Insert']>
      }

      // ── 원장 정보 (doctors) — auth_express/bidding 포함 ──
      doctors: {
        Row: {
          id: string             // profiles.id
          clinic_name: string | null
          clinic_address: string | null
          specialty: string | null
          open_target_date: string | null
          note: string | null
          auth_express: boolean
          auth_bidding: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['doctors']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['doctors']['Insert']>
      }

      // ── 비딩 전용 벤더 (vendors와 완전 분리) ──
      bidding_vendors: {
        Row: {
          id: string
          company_name: string
          rep_name: string | null
          email: string | null
          phone: string | null
          description: string | null
          website: string | null
          is_active: boolean
          profile_id: string | null  // profiles.id (로그인 계정 연결)
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bidding_vendors']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['bidding_vendors']['Insert']>
      }

      // ── 원장 ↔ 비딩벤더 회차별 매핑 ──
      doctor_bidding_vendors: {
        Row: {
          id: string
          doctor_id: string
          bidding_vendor_id: string
          bidding_round: BiddingRound
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['doctor_bidding_vendors']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['doctor_bidding_vendors']['Insert']>
      }

      // ── 비딩 이벤트 (원장이 회차별 공지) ──
      bidding_events: {
        Row: {
          id: string
          doctor_id: string
          bidding_round: BiddingRound
          title: string | null
          note: string | null
          status: BiddingEventStatus
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bidding_events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['bidding_events']['Insert']>
      }

      // ── 비딩 슬롯 (5~10개 시간 조각) ──
      bidding_slots: {
        Row: {
          id: string
          bidding_event_id: string
          proposed_time: string
          claimed_by: string | null      // bidding_vendors.id
          claimed_at: string | null
          meet_link: string | null
          calendar_event_id: string | null
          status: BiddingSlotStatus
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bidding_slots']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['bidding_slots']['Insert']>
      }
    }

    Views: {}
    Functions: {}
    Enums: {
      user_role: UserRole
      meeting_status: MeetingStatus
      stage_status: StageStatus
    }
  }
}

// ── 편의 타입 별칭 ──
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Doctor = Database['public']['Tables']['doctors']['Row']
export type Vendor = Database['public']['Tables']['vendors']['Row']
export type Stage = Database['public']['Tables']['stages']['Row']
export type ProcessItem = Database['public']['Tables']['process_items']['Row']
export type DoctorProgress = Database['public']['Tables']['doctor_progress']['Row']
export type MeetingRequest = Database['public']['Tables']['meeting_requests']['Row']
export type BiddingVendor = Database['public']['Tables']['bidding_vendors']['Row']
export type DoctorBiddingVendor = Database['public']['Tables']['doctor_bidding_vendors']['Row']
export type BiddingEvent = Database['public']['Tables']['bidding_events']['Row']
export type BiddingSlot = Database['public']['Tables']['bidding_slots']['Row']

// ── JOIN 결과 타입 ──
export type MeetingRequestWithDetails = MeetingRequest & {
  doctor: Profile & { doctors: Doctor }
  vendor: Profile & { vendors: Vendor }
  stage: Stage
}

export type BiddingSlotForVendor = Omit<BiddingSlot, 'claimed_by' | 'calendar_event_id'> & {
  is_mine: boolean   // 내가 선점한 슬롯 여부
  is_taken: boolean  // 다른 업체가 선점 여부 (블라인드)
}

export type BiddingEventWithSlots = BiddingEvent & {
  slots: BiddingSlot[]
  doctor: Profile
}
