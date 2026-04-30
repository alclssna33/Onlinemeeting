-- ================================================================
-- 삼성메디슨 초음파 대리점 미팅 섹션 추가
-- Supabase SQL Editor에서 실행
-- ================================================================

-- 1. stages에 stage_type 컬럼 추가
ALTER TABLE stages ADD COLUMN IF NOT EXISTS stage_type TEXT DEFAULT 'standard';

-- 2. vendors에 region 컬럼 추가 (삼성메디슨 대리점에 사용)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS region TEXT;

-- 3. meeting_requests에 product_name 컬럼 추가 (삼성메디슨 제품명)
ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS product_name TEXT;

-- 4. 의료장비(order_index=5) 이후 스테이지 order_index +1 (자리 확보)
UPDATE stages SET order_index = order_index + 1 WHERE order_index >= 6;

-- 5. 삼성메디슨 스테이지 삽입 (order_index=6, 의료장비 바로 다음)
INSERT INTO stages (name, description, order_index, color, icon, stage_type)
VALUES (
  '삼성메디슨',
  '삼성메디슨 초음파 장비 지역 담당 대리점 미팅',
  6,
  '#1d4ed8',
  'radio',
  'samsung_medison'
);
