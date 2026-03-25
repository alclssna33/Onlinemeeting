-- 개원가이드 체크리스트 진행 상태 (원장 1명 = 1행)
CREATE TABLE IF NOT EXISTS doctor_guide_progress (
  profile_id      UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  completed_steps INTEGER[] NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE doctor_guide_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guide_progress: 본인 조회"
  ON doctor_guide_progress FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "guide_progress: 본인 수정"
  ON doctor_guide_progress FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "guide_progress: admin 전체 조회"
  ON doctor_guide_progress FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_guide_progress_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER guide_progress_updated_at
  BEFORE UPDATE ON doctor_guide_progress
  FOR EACH ROW EXECUTE FUNCTION update_guide_progress_updated_at();
