-- ============================================================
-- 개비공 v2 – Supabase PostgreSQL Schema
-- 실행 순서: Supabase Dashboard > SQL Editor에서 전체 실행
-- ============================================================

-- ENUM 타입 정의
CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'vendor');
CREATE TYPE meeting_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled');
CREATE TYPE stage_status AS ENUM ('not_started', 'in_progress', 'completed');

-- ── 1. profiles (Supabase Auth 확장) ──────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'doctor',
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 신규 가입 시 profiles 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'doctor')::user_role,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. doctors ────────────────────────────────────────────
CREATE TABLE doctors (
  id                UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_name       TEXT,
  clinic_address    TEXT,
  specialty         TEXT,
  open_target_date  DATE,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. stages (개원 단계 카테고리) ──────────────────────────
CREATE TABLE stages (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  order_index  INTEGER NOT NULL DEFAULT 0,
  color        TEXT DEFAULT '#16a34a',
  icon         TEXT DEFAULT 'building-2'
);

-- 기존 GAS 시스템 카테고리 기본 데이터 삽입
INSERT INTO stages (name, description, order_index, color, icon) VALUES
  ('사전준비',       '개원 전 기본 계획 수립 단계',             1,  '#6366f1', 'clipboard-list'),
  ('입지/건물',      '개원 장소 선정 및 계약',                   2,  '#0ea5e9', 'map-pin'),
  ('인테리어',       '의원 설계 및 인테리어 공사',               3,  '#f59e0b', 'hammer'),
  ('의료기기',       '진료용 의료기기 구매 및 설치',             4,  '#ec4899', 'stethoscope'),
  ('의료IT/소프트웨어', 'EMR, 예약시스템, 의료 소프트웨어',     5,  '#8b5cf6', 'monitor'),
  ('인력채용',       '의료진 및 스태프 채용',                    6,  '#14b8a6', 'users'),
  ('인허가/법무',    '의원 개설 인허가 및 법무',                 7,  '#f97316', 'scale'),
  ('세무/회계',      '세무 대리인 선정 및 개원 회계',            8,  '#22c55e', 'calculator'),
  ('금융/대출',      '개원 자금 조달 및 대출',                   9,  '#06b6d4', 'landmark'),
  ('마케팅',         '개원 홍보 및 마케팅 전략',                 10, '#ef4444', 'megaphone'),
  ('보험/복지',      '4대보험 및 직원 복리후생',                 11, '#a855f7', 'shield-check'),
  ('기타',           '기타 개원 관련 사항',                      12, '#78716c', 'more-horizontal');

-- ── 4. vendors (벤더사) ───────────────────────────────────
CREATE TABLE vendors (
  id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name  TEXT NOT NULL,
  rep_name      TEXT,
  category_id   INTEGER NOT NULL REFERENCES stages(id),
  description   TEXT,
  website       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. process_items (개원 프로세스 타임라인 항목) ────────
CREATE TABLE process_items (
  id              SERIAL PRIMARY KEY,
  stage_id        INTEGER NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  guide           TEXT,
  order_index     INTEGER NOT NULL DEFAULT 0,
  typical_timing  TEXT  -- e.g. '개원 6개월 전'
);

-- ── 6. doctor_progress (원장별 프로세스 진행 상태) ─────────
CREATE TABLE doctor_progress (
  id               SERIAL PRIMARY KEY,
  doctor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  process_item_id  INTEGER NOT NULL REFERENCES process_items(id) ON DELETE CASCADE,
  status           stage_status NOT NULL DEFAULT 'not_started',
  completed_at     TIMESTAMPTZ,
  note             TEXT,
  UNIQUE(doctor_id, process_item_id)
);

-- ── 7. meeting_requests (미팅 요청) ──────────────────────
CREATE TABLE meeting_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id           UUID NOT NULL REFERENCES profiles(id),
  vendor_id           UUID NOT NULL REFERENCES profiles(id),
  stage_id            INTEGER NOT NULL REFERENCES stages(id),
  status              meeting_status NOT NULL DEFAULT 'pending',
  proposed_times      TIMESTAMPTZ[] NOT NULL,   -- 최대 5개
  confirmed_time      TIMESTAMPTZ,
  meet_link           TEXT,
  calendar_event_id   TEXT,
  note                TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER meeting_requests_updated_at
  BEFORE UPDATE ON meeting_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 인덱스 ───────────────────────────────────────────────
CREATE INDEX idx_meeting_requests_doctor   ON meeting_requests(doctor_id);
CREATE INDEX idx_meeting_requests_vendor   ON meeting_requests(vendor_id);
CREATE INDEX idx_meeting_requests_status   ON meeting_requests(status);
CREATE INDEX idx_doctor_progress_doctor    ON doctor_progress(doctor_id);
CREATE INDEX idx_vendors_category          ON vendors(category_id);

-- ── Row Level Security (RLS) ──────────────────────────────
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requests  ENABLE ROW LEVEL SECURITY;

-- profiles: 본인 조회/수정, admin 전체 조회
CREATE POLICY "profiles: 본인 조회" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: 본인 수정" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles: admin 전체 조회" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- stages, process_items: 전체 인증 사용자 조회 가능
CREATE POLICY "stages: 인증 사용자 조회" ON stages
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "process_items: 인증 사용자 조회" ON process_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- vendors: 인증 사용자 조회, 본인 수정
CREATE POLICY "vendors: 인증 사용자 조회" ON vendors
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "vendors: 본인 수정" ON vendors
  FOR UPDATE USING (auth.uid() = id);

-- doctor_progress: 본인 원장 조회/수정
CREATE POLICY "doctor_progress: 본인 조회" ON doctor_progress
  FOR SELECT USING (auth.uid() = doctor_id);
CREATE POLICY "doctor_progress: 본인 수정" ON doctor_progress
  FOR ALL USING (auth.uid() = doctor_id);

-- meeting_requests: 관련 당사자(doctor/vendor) 조회, 생성
CREATE POLICY "meeting_requests: 당사자 조회" ON meeting_requests
  FOR SELECT USING (auth.uid() = doctor_id OR auth.uid() = vendor_id);
CREATE POLICY "meeting_requests: doctor 생성" ON meeting_requests
  FOR INSERT WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "meeting_requests: vendor 상태 변경" ON meeting_requests
  FOR UPDATE USING (auth.uid() = vendor_id);
CREATE POLICY "meeting_requests: admin 전체" ON meeting_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
