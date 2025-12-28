-- HRD Survey Pro - Row Level Security Policies
-- Version: 1.0

-- =============================================
-- Enable RLS on all tables
-- =============================================
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;

-- =============================================
-- admins 테이블 정책
-- =============================================
-- 관리자는 자신의 프로필만 조회 가능
CREATE POLICY "Admin can view own profile"
ON admins FOR SELECT
USING (auth.uid() = id);

-- 관리자는 자신의 프로필만 수정 가능
CREATE POLICY "Admin can update own profile"
ON admins FOR UPDATE
USING (auth.uid() = id);

-- =============================================
-- courses 테이블 정책
-- =============================================
-- 관리자는 자신의 교육과정만 조회 가능
CREATE POLICY "Admin can view own courses"
ON courses FOR SELECT
USING (auth.uid() = admin_id);

-- 관리자는 자신의 교육과정만 생성 가능
CREATE POLICY "Admin can create own courses"
ON courses FOR INSERT
WITH CHECK (auth.uid() = admin_id);

-- 관리자는 자신의 교육과정만 수정 가능
CREATE POLICY "Admin can update own courses"
ON courses FOR UPDATE
USING (auth.uid() = admin_id);

-- 관리자는 자신의 교육과정만 삭제 가능
CREATE POLICY "Admin can delete own courses"
ON courses FOR DELETE
USING (auth.uid() = admin_id);

-- =============================================
-- surveys 테이블 정책
-- =============================================
-- 관리자는 자신의 설문만 전체 접근 가능
CREATE POLICY "Admin can manage own surveys"
ON surveys FOR ALL
USING (auth.uid() = admin_id);

-- 공개 설문 조회 (응답자용 - active 상태만)
CREATE POLICY "Public can view active surveys"
ON surveys FOR SELECT
USING (status = 'active');

-- =============================================
-- questions 테이블 정책
-- =============================================
-- 관리자는 자신의 설문 문항만 관리 가능
CREATE POLICY "Admin can manage own questions"
ON questions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM surveys
        WHERE surveys.id = questions.survey_id
        AND surveys.admin_id = auth.uid()
    )
);

-- 공개 설문의 문항은 누구나 조회 가능
CREATE POLICY "Public can view questions of active surveys"
ON questions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM surveys
        WHERE surveys.id = questions.survey_id
        AND surveys.status = 'active'
    )
);

-- =============================================
-- responses 테이블 정책
-- =============================================
-- 관리자는 자신의 설문에 대한 응답만 조회 가능
CREATE POLICY "Admin can view responses to own surveys"
ON responses FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM surveys
        WHERE surveys.id = responses.survey_id
        AND surveys.admin_id = auth.uid()
    )
);

-- 누구나 active 설문에 응답 제출 가능
CREATE POLICY "Public can submit responses to active surveys"
ON responses FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM surveys
        WHERE surveys.id = responses.survey_id
        AND surveys.status = 'active'
    )
);

-- =============================================
-- answers 테이블 정책
-- =============================================
-- 관리자는 자신의 설문에 대한 답변만 조회 가능
CREATE POLICY "Admin can view answers to own surveys"
ON answers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM responses r
        JOIN surveys s ON s.id = r.survey_id
        WHERE r.id = answers.response_id
        AND s.admin_id = auth.uid()
    )
);

-- 응답과 함께 답변 제출 가능
CREATE POLICY "Public can submit answers"
ON answers FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM responses r
        JOIN surveys s ON s.id = r.survey_id
        WHERE r.id = answers.response_id
        AND s.status = 'active'
    )
);

-- =============================================
-- survey_templates 테이블 정책
-- =============================================
-- 관리자는 자신의 템플릿만 관리 가능
CREATE POLICY "Admin can manage own templates"
ON survey_templates FOR ALL
USING (auth.uid() = admin_id);

-- =============================================
-- Storage 버킷 정책 (참고용)
-- =============================================
-- 아래는 Supabase Dashboard에서 Storage 설정 시 사용

-- QR 코드 버킷
-- CREATE POLICY "Admin can upload QR codes"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');

-- CREATE POLICY "Public can view QR codes"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'qr-codes');

-- PDF 리포트 버킷
-- CREATE POLICY "Admin can manage PDFs"
-- ON storage.objects FOR ALL
-- USING (bucket_id = 'reports' AND auth.role() = 'authenticated');
