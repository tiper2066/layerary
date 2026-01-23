-- 웰컴보드 카테고리 pageType 업데이트
-- Supabase SQL Editor에서 실행하세요

-- 웰컴보드 카테고리 pageType 설정
UPDATE categories
SET "pageType" = 'welcomeboard'
WHERE slug = 'welcome-board';

-- PPT 카테고리 pageType 확인 및 설정 (필요시)
-- 먼저 현재 상태 확인
SELECT slug, name, "pageType" FROM categories WHERE slug = 'ppt';

-- PPT도 pageType이 없다면 설정
UPDATE categories
SET "pageType" = 'ppt'
WHERE slug = 'ppt' AND "pageType" IS NULL;

-- 업데이트 결과 확인
SELECT slug, name, "pageType", type FROM categories 
WHERE slug IN ('welcome-board', 'ppt')
ORDER BY slug;
