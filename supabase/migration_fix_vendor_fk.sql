-- ================================================================
-- Fix: meeting_requests.vendor_id FK → vendors(id) 로 수정
-- + RLS 정책 업데이트
-- Supabase SQL Editor에서 실행
-- ================================================================

-- 1. 기존 잘못된 FK 삭제 (profiles(id) 참조)
ALTER TABLE meeting_requests
  DROP CONSTRAINT meeting_requests_vendor_id_fkey;

-- 2. vendors(id) 참조로 새 FK 추가
ALTER TABLE meeting_requests
  ADD CONSTRAINT meeting_requests_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES vendors(id);

-- 3. vendor_note, calendar_event_id 컬럼 추가 (없으면)
ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS vendor_note TEXT;
ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- 4. RLS 정책 수정 (vendor_id가 vendors.id를 참조하므로 subquery로)
DROP POLICY IF EXISTS "meeting_requests: 당사자 조회" ON meeting_requests;
DROP POLICY IF EXISTS "meeting_requests: vendor 상태 변경" ON meeting_requests;

CREATE POLICY "meeting_requests: 당사자 조회" ON meeting_requests
  FOR SELECT USING (
    auth.uid() = doctor_id
    OR auth.uid() = (SELECT profile_id FROM vendors WHERE id = vendor_id)
  );

CREATE POLICY "meeting_requests: vendor 상태 변경" ON meeting_requests
  FOR UPDATE USING (
    auth.uid() = (SELECT profile_id FROM vendors WHERE id = vendor_id)
  );

-- 5. app_settings 테이블 (캘린더 연동 ON/OFF 설정)
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (key, value)
VALUES ('calendar_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
