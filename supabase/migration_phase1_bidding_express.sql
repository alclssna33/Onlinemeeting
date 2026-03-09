-- ============================================================
-- 개비공 v2 – Phase 1: 비딩 & 일사천리 시스템 마이그레이션
-- Supabase Dashboard > SQL Editor에서 전체 실행
-- ============================================================

-- ── 1. 기존 테이블 컬럼 추가 ────────────────────────────────

-- doctors: 일사천리/비딩 권한 필드
ALTER TABLE doctors
  ADD COLUMN IF NOT EXISTS auth_express BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auth_bidding BOOLEAN NOT NULL DEFAULT FALSE;

-- meeting_requests: 미팅 타입 (standard | express)
-- ※ 비딩은 별도 테이블(bidding_events/slots) 사용
ALTER TABLE meeting_requests
  ADD COLUMN IF NOT EXISTS meeting_type TEXT NOT NULL DEFAULT 'standard'
  CHECK (meeting_type IN ('standard', 'express'));

-- meeting_requests: 선정 상태 (기존 Step 5에서 추가됐을 수 있으나 IF NOT EXISTS로 안전하게)
ALTER TABLE meeting_requests
  ADD COLUMN IF NOT EXISTS vendor_note TEXT,
  ADD COLUMN IF NOT EXISTS selection_status TEXT
  CHECK (selection_status IN ('selected', 'eliminated'));

-- ── 2. 비딩 전용 벤더 테이블 (vendors와 완전 분리) ──────────

CREATE TABLE IF NOT EXISTS bidding_vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  TEXT NOT NULL,
  rep_name      TEXT,
  email         TEXT,
  phone         TEXT,
  description   TEXT,
  website       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  profile_id    UUID,              -- 가입 계정 연결 (nullable, profiles.id 참조)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bidding_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bidding_vendors: 인증 사용자 조회" ON bidding_vendors
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "bidding_vendors: admin 전체 관리" ON bidding_vendors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 3. 원장 ↔ 비딩벤더 회차별 매핑 테이블 ──────────────────

CREATE TABLE IF NOT EXISTS doctor_bidding_vendors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bidding_vendor_id UUID NOT NULL REFERENCES bidding_vendors(id) ON DELETE CASCADE,
  bidding_round     INTEGER NOT NULL DEFAULT 1
                    CHECK (bidding_round IN (1, 2, 3)),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, bidding_vendor_id, bidding_round)
);

ALTER TABLE doctor_bidding_vendors ENABLE ROW LEVEL SECURITY;

-- admin: 전체 관리
CREATE POLICY "dbv: admin 전체" ON doctor_bidding_vendors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 원장: 본인 배정 목록 조회
CREATE POLICY "dbv: 원장 조회" ON doctor_bidding_vendors
  FOR SELECT USING (doctor_id = auth.uid());

-- 비딩벤더: 자신이 배정된 레코드 조회
CREATE POLICY "dbv: 비딩벤더 조회" ON doctor_bidding_vendors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bidding_vendors
      WHERE id = bidding_vendor_id AND profile_id = auth.uid()
    )
  );

-- ── 4. 비딩 이벤트 테이블 (원장이 회차별로 오픈하는 공지) ───

CREATE TABLE IF NOT EXISTS bidding_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bidding_round INTEGER NOT NULL DEFAULT 1
                CHECK (bidding_round IN (1, 2, 3)),
  title         TEXT,                  -- 예: "1차 비딩 - 인테리어"
  note          TEXT,                  -- 원장 전달사항
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'closed', 'completed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bidding_events ENABLE ROW LEVEL SECURITY;

-- admin: 전체 관리
CREATE POLICY "be: admin 전체" ON bidding_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 원장: 본인 이벤트 전체 관리
CREATE POLICY "be: 원장 관리" ON bidding_events
  FOR ALL USING (doctor_id = auth.uid());

-- 비딩벤더: 자신이 해당 회차에 배정된 이벤트만 조회
CREATE POLICY "be: 비딩벤더 조회" ON bidding_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM doctor_bidding_vendors dbv
      JOIN bidding_vendors bv ON bv.id = dbv.bidding_vendor_id
      WHERE dbv.doctor_id = bidding_events.doctor_id
        AND dbv.bidding_round = bidding_events.bidding_round
        AND bv.profile_id = auth.uid()
    )
  );

-- ── 5. 비딩 슬롯 테이블 (5~10개 시간 조각) ──────────────────

CREATE TABLE IF NOT EXISTS bidding_slots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bidding_event_id  UUID NOT NULL REFERENCES bidding_events(id) ON DELETE CASCADE,
  proposed_time     TIMESTAMPTZ NOT NULL,
  claimed_by        UUID REFERENCES bidding_vendors(id), -- 선점한 벤더 (NULL=미선점)
  claimed_at        TIMESTAMPTZ,
  meet_link         TEXT,
  calendar_event_id TEXT,
  status            TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'claimed', 'cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bidding_slots ENABLE ROW LEVEL SECURITY;

-- admin: 전체 관리
CREATE POLICY "bs: admin 전체" ON bidding_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 원장: 본인 이벤트의 슬롯 전체 관리
CREATE POLICY "bs: 원장 관리" ON bidding_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bidding_events
      WHERE id = bidding_event_id AND doctor_id = auth.uid()
    )
  );

-- 비딩벤더: 배정된 이벤트의 슬롯 조회 (claimed_by 마스킹은 API 레이어에서 처리)
CREATE POLICY "bs: 비딩벤더 조회" ON bidding_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM bidding_events be
      JOIN doctor_bidding_vendors dbv
        ON dbv.doctor_id = be.doctor_id
       AND dbv.bidding_round = be.bidding_round
      JOIN bidding_vendors bv ON bv.id = dbv.bidding_vendor_id
      WHERE be.id = bidding_event_id
        AND bv.profile_id = auth.uid()
    )
  );

-- 비딩벤더: 본인이 선점한 슬롯 또는 미선점 슬롯 UPDATE (선점/취소)
CREATE POLICY "bs: 비딩벤더 선점·취소" ON bidding_slots
  FOR UPDATE USING (
    claimed_by IS NULL   -- 미선점 슬롯 선점
    OR claimed_by IN (   -- 본인이 선점한 슬롯 취소
      SELECT id FROM bidding_vendors WHERE profile_id = auth.uid()
    )
  );

-- ── 6. 인덱스 ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_dbv_doctor       ON doctor_bidding_vendors(doctor_id);
CREATE INDEX IF NOT EXISTS idx_dbv_vendor       ON doctor_bidding_vendors(bidding_vendor_id);
CREATE INDEX IF NOT EXISTS idx_be_doctor        ON bidding_events(doctor_id);
CREATE INDEX IF NOT EXISTS idx_be_round         ON bidding_events(doctor_id, bidding_round);
CREATE INDEX IF NOT EXISTS idx_bs_event         ON bidding_slots(bidding_event_id);
CREATE INDEX IF NOT EXISTS idx_bs_claimed_by    ON bidding_slots(claimed_by);
CREATE INDEX IF NOT EXISTS idx_mr_meeting_type  ON meeting_requests(meeting_type);
