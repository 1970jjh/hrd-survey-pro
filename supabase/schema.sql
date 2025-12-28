-- HRD Survey Pro Database Schema
-- Version: 1.0
-- Based on TRD specifications

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. admins (관리자) 테이블
-- =============================================
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    company VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admins_email ON admins(email);

-- =============================================
-- 2. courses (교육과정) 테이블
-- =============================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    objectives TEXT,
    content TEXT,
    instructor VARCHAR(100),
    training_date DATE,
    target_participants INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_courses_admin ON courses(admin_id);
CREATE INDEX idx_courses_date ON courses(training_date DESC);

-- =============================================
-- 3. surveys (설문) 테이블
-- =============================================
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
    unique_code VARCHAR(20) UNIQUE NOT NULL,
    scale_type INT DEFAULT 5 CHECK (scale_type IN (5, 7, 9, 10)),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_surveys_admin ON surveys(admin_id);
CREATE INDEX idx_surveys_code ON surveys(unique_code);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_surveys_course ON surveys(course_id);

-- =============================================
-- 4. questions (설문문항) 테이블
-- =============================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('choice', 'text')),
    category VARCHAR(50),
    content TEXT NOT NULL,
    order_num INT NOT NULL,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_questions_survey ON questions(survey_id);
CREATE INDEX idx_questions_order ON questions(survey_id, order_num);

-- =============================================
-- 5. responses (응답 세션) 테이블
-- =============================================
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    device_info JSONB,
    ip_hash VARCHAR(64),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_responses_survey ON responses(survey_id);
CREATE INDEX idx_responses_session ON responses(session_id);
CREATE UNIQUE INDEX idx_responses_unique ON responses(survey_id, session_id);

-- =============================================
-- 6. answers (개별 응답) 테이블
-- =============================================
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    score_value INT,
    text_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_answers_response ON answers(response_id);
CREATE INDEX idx_answers_question ON answers(question_id);
CREATE INDEX idx_answers_stats ON answers(question_id, score_value);

-- =============================================
-- 7. survey_templates (설문 템플릿) 테이블 - P1
-- =============================================
CREATE TABLE survey_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_templates_admin ON survey_templates(admin_id);

-- =============================================
-- 통계 조회용 뷰
-- =============================================
CREATE VIEW survey_stats AS
SELECT
    q.survey_id,
    q.id as question_id,
    q.category,
    q.content as question_content,
    COUNT(a.id) as response_count,
    AVG(a.score_value) as average,
    STDDEV(a.score_value) as std_dev
FROM questions q
LEFT JOIN answers a ON q.id = a.question_id
WHERE q.type = 'choice'
GROUP BY q.survey_id, q.id, q.category, q.content;

-- =============================================
-- updated_at 자동 업데이트 트리거
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Realtime 구독 설정
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE responses;
ALTER PUBLICATION supabase_realtime ADD TABLE answers;
