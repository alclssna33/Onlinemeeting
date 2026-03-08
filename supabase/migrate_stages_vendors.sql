-- ============================================================
-- 개비공 v2 – 단계/벤더사 구조 재설계
-- Supabase SQL Editor에서 전체 실행
-- ============================================================

-- 1. 기존 데이터 초기화
DELETE FROM meeting_requests;
DELETE FROM vendors;
DELETE FROM stages;
DELETE FROM profiles WHERE role = 'vendor';

-- 2. vendors 테이블 재설계 (profiles FK 의존성 제거)
--    admin이 직접 벤더사를 추가/삭제할 수 있도록
DROP TABLE IF EXISTS vendors CASCADE;

CREATE TABLE vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  TEXT NOT NULL,
  rep_name      TEXT,
  email         TEXT,
  phone         TEXT,
  category_id   INTEGER NOT NULL,  -- stages.id 참조 (FK는 나중에)
  description   TEXT,
  website       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  profile_id    UUID,              -- 구글 로그인 후 연결될 계정 ID
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors: 인증 사용자 조회" ON vendors
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "vendors: admin 전체 관리" ON vendors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. 올바른 개원 단계 데이터 삽입
INSERT INTO stages (name, description, order_index, color, icon) VALUES
  ('대출상담사',          '개원 자금 대출 상담 및 금융 컨설팅',       1,  '#06b6d4', 'landmark'),
  ('인테리어비딩',        '의원 설계 및 인테리어 업체 비교/선정',      2,  '#f59e0b', 'hammer'),
  ('세무사',             '개원 세무 대리인 선정 및 회계',              3,  '#22c55e', 'calculator'),
  ('노무사',             '직원 노무 관리 및 4대보험 처리',             4,  '#a855f7', 'scale'),
  ('의료장비',           '진료용 의료기기 구매 및 설치',               5,  '#ec4899', 'stethoscope'),
  ('마케팅업체 미팅',    '병원 개원 홍보 및 마케팅 전략',              6,  '#ef4444', 'megaphone'),
  ('직원구인 준비',      '의료진 및 스태프 채용',                      7,  '#14b8a6', 'users'),
  ('약제/소모품 미팅',   '의약품 및 의료 소모품 공급업체 선정',        8,  '#8b5cf6', 'package'),
  ('EMR업체 미팅',       '전자의무기록(EMR) 및 예약시스템 선정',       9,  '#6366f1', 'monitor'),
  ('PC/네트워크업체 미팅', '의원 IT 인프라 및 네트워크 구축',          10, '#0ea5e9', 'wifi'),
  ('폐기물업체 미팅',    '의료폐기물 처리 업체 계약',                  11, '#78716c', 'trash-2'),
  ('유니폼/린넨 업체 미팅', '스태프 유니폼 및 린넨 공급 업체',         12, '#f97316', 'shirt'),
  ('카드단말기 업체 미팅', '카드결제 단말기 및 POS 시스템 도입',       13, '#16a34a', 'credit-card'),
  ('화재보험 미팅',      '의원 화재보험 및 의료배상책임보험 가입',      14, '#dc2626', 'shield-check');

-- 4. 시드 벤더사 데이터 (테스트용)
INSERT INTO vendors (company_name, rep_name, email, phone, category_id, description) VALUES
  ('KB국민은행 개원대출팀', '김대출', 'loan@kb.com', '02-1234-1001', 1, 'KB국민은행 의원 개원 전문 대출 상품. 최저금리 1.9%부터 상담 가능.'),
  ('우리은행 의료금융팀',   '이금융', 'loan@woori.com', '02-1234-1002', 1, '우리은행 의사 전용 대출 패키지. 한도 최대 10억원.'),
  ('메디인테리어',          '박인테', 'design@medi.com', '02-1234-2001', 2, '병원 전문 인테리어 설계 및 시공. 시공 실적 300개 이상.'),
  ('클리닉디자인',          '최디자', 'clinic@design.com', '02-1234-2002', 2, '의원 특화 인테리어. 공간 설계부터 시공 감리까지 원스톱.'),
  ('한국의료세무법인',      '정세무', 'tax@medical.com', '02-1234-3001', 3, '의원 개원 특화 세무. 절세 전략부터 기장까지 원스톱 제공.'),
  ('삼성의료기기',          '강의료', 'medical@samsung.com', '02-1234-5001', 5, '최신 의료기기 공급 및 AS 보장. 초음파, X-ray 등 전 품목.'),
  ('클라우드EMR',           '박소프', 'emr@cloud.com', '02-1234-9001', 9, '클라우드 기반 EMR 시스템. 월 구독형 합리적 가격.'),
  ('메디마케팅',            '한마케', 'mkt@medi.com', '02-1234-6001', 6, '병원 개원 마케팅 전문. SNS, 블로그, 온라인광고 패키지.');
