// HRD Survey Pro - Gemini AI Integration
// Based on TRD specifications

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface CourseInfo {
  title: string;
  objectives: string;
  content: string;
  instructor: string;
}

// Legacy type for backward compatibility
interface LegacyGeneratedQuestion {
  type: "choice" | "text";
  category: string;
  content: string;
  order: number;
}

// New type for database-aligned questions
export interface GeneratedQuestion {
  category: "overall" | "content" | "instructor" | "facility" | "other";
  question_text: string;
  question_type: "scale" | "multiple_choice" | "text";
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  scale_labels?: { min?: string; max?: string };
  is_required?: boolean;
}

// Category labels for prompt
const CATEGORY_LABELS: Record<string, string> = {
  overall: "종합만족도",
  content: "교육내용",
  instructor: "강사만족도",
  facility: "교육환경",
  other: "기타",
};

interface TextSummary {
  summary: string;
  keywords: string[];
  positives: string[];
  improvements: string[];
  sentiment: "positive" | "neutral" | "negative";
}

interface SurveyAnalysis {
  effectiveness: {
    strengths: string[];
    weaknesses: string[];
  };
  recommendations: string[];
  considerations: string[];
  overallAssessment: string;
}

/**
 * Call Gemini API with retry logic
 */
async function callGeminiAPI<T>(
  prompt: string,
  maxRetries: number = 3
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data: GeminiResponse = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text;

      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      // Parse JSON response
      return JSON.parse(text) as T;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error("Max retries exceeded");
}

/**
 * Generate survey questions based on course information
 */
export async function generateSurveyQuestions(
  course: CourseInfo,
  scaleType: 5 | 7 | 9 | 10 = 5,
  questionCount: number = 10,
  includeTextQuestions: boolean = true
): Promise<GeneratedQuestion[]> {
  const textQuestionCount = includeTextQuestions ? 2 : 0;
  const choiceQuestionCount = questionCount - textQuestionCount;

  const prompt = `당신은 기업교육 설문조사 전문가입니다.
다음 교육과정에 대한 만족도 설문 문항을 생성해주세요.

## 교육과정 정보
- 과정명: ${course.title}
- 교육목표: ${course.objectives}
- 교육내용: ${course.content}
- 강사: ${course.instructor}

## 생성 조건
- 객관식 문항 ${choiceQuestionCount}개 (${scaleType}점 척도로 응답)
- 서술식 문항 ${textQuestionCount}개
- 카테고리: 강사만족도, 교육내용, 교육환경, 업무적용도, 종합만족도 중에서 균형있게 배분

## 문항 작성 가이드
- 객관식 문항은 "${scaleType}점 척도"로 응답할 수 있도록 작성 (1점: 매우 불만족 ~ ${scaleType}점: 매우 만족)
- 서술식 문항은 구체적인 피드백을 이끌어낼 수 있도록 작성
- 교육과정의 특성을 반영한 구체적인 문항 작성

## 출력 형식
다음 JSON 배열 형식으로 출력하세요:
{
  "questions": [
    {"type": "choice", "category": "카테고리명", "content": "문항 내용", "order": 1},
    {"type": "text", "category": "카테고리명", "content": "문항 내용", "order": 10}
  ]
}`;

  const result = await callGeminiAPI<{ questions: GeneratedQuestion[] }>(
    prompt
  );
  return result.questions;
}

/**
 * Summarize text responses from survey
 */
export async function summarizeTextResponses(
  responses: string[],
  questionContent: string
): Promise<TextSummary> {
  if (responses.length === 0) {
    return {
      summary: "응답이 없습니다.",
      keywords: [],
      positives: [],
      improvements: [],
      sentiment: "neutral",
    };
  }

  const prompt = `다음은 교육 설문의 서술형 응답들입니다.
핵심 내용을 요약하고, 주요 키워드와 개선 제안을 추출해주세요.

## 질문
${questionContent}

## 응답 목록
${responses.map((r, i) => `${i + 1}. ${r}`).join("\n")}

## 출력 형식
다음 JSON 형식으로 출력하세요:
{
  "summary": "전체 요약 (2-3문장)",
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "positives": ["긍정적 피드백 요약 1", "긍정적 피드백 요약 2"],
  "improvements": ["개선 제안 요약 1", "개선 제안 요약 2"],
  "sentiment": "positive 또는 neutral 또는 negative"
}`;

  return callGeminiAPI<TextSummary>(prompt);
}

/**
 * Analyze complete survey results
 */
export async function analyzeSurveyResults(
  courseInfo: string,
  overallAverage: number,
  categoryAverages: Record<string, number>,
  responseCount: number,
  textSummaries: TextSummary[]
): Promise<SurveyAnalysis> {
  const prompt = `다음 교육 설문 결과를 종합 분석하여 인사이트를 제공해주세요.

## 교육과정 정보
${courseInfo}

## 정량 결과
- 전체 평균: ${overallAverage.toFixed(2)}점
- 카테고리별 평균: ${JSON.stringify(categoryAverages)}
- 응답자 수: ${responseCount}명

## 서술형 응답 요약
${textSummaries.map((s) => `- ${s.summary}`).join("\n")}

## 분석 요청
1. 교육 효과성 평가 (강점과 약점)
2. 구체적이고 실행 가능한 개선 권고사항
3. 다음 교육 시 고려사항
4. 종합 평가 (한 문장)

## 출력 형식
다음 JSON 형식으로 출력하세요:
{
  "effectiveness": {
    "strengths": ["강점 1", "강점 2", "강점 3"],
    "weaknesses": ["약점 1", "약점 2"]
  },
  "recommendations": ["권고사항 1", "권고사항 2", "권고사항 3"],
  "considerations": ["고려사항 1", "고려사항 2"],
  "overallAssessment": "종합 평가 한 문장"
}`;

  return callGeminiAPI<SurveyAnalysis>(prompt);
}

/**
 * Generate questions based on course information (new API)
 */
export interface GenerateQuestionsParams {
  courseTitle: string;
  courseObjectives?: string | null;
  courseContent?: string | null;
  instructor?: string | null;
  categories: ("overall" | "content" | "instructor" | "facility" | "other")[];
  scaleQuestionCount: number;
  textQuestionCount: number;
}

export async function generateQuestions(
  params: GenerateQuestionsParams
): Promise<GeneratedQuestion[]> {
  const {
    courseTitle,
    courseObjectives,
    courseContent,
    instructor,
    categories,
    scaleQuestionCount,
    textQuestionCount,
  } = params;

  const categoryLabels = categories.map((c) => CATEGORY_LABELS[c]).join(", ");

  const prompt = `당신은 기업교육 설문조사 전문가입니다.
다음 교육과정에 대한 만족도 설문 문항을 생성해주세요.

## 교육과정 정보
- 과정명: ${courseTitle}
${courseObjectives ? `- 교육목표: ${courseObjectives}` : ""}
${courseContent ? `- 교육내용: ${courseContent}` : ""}
${instructor ? `- 강사: ${instructor}` : ""}

## 생성 조건
- 카테고리: ${categoryLabels}
- 5점 척도(객관식) 문항: 정확히 ${scaleQuestionCount}개 (선택한 카테고리에 골고루 분배)
${textQuestionCount > 0 ? `- 서술형 문항: 정확히 ${textQuestionCount}개 (overall 또는 other 카테고리)` : "- 서술형 문항: 없음"}

## 카테고리 설명
- overall: 교육 전반에 대한 종합적인 만족도
- content: 교육 내용의 전문성, 실용성, 체계성
- instructor: 강사의 전달력, 전문성, 열정
- facility: 교육 환경, 시설, 교재 등
- other: 기타 교육 관련 의견

## 문항 작성 가이드
- 5점 척도 문항: "~에 만족한다", "~이 적절했다" 등 평가 가능한 형태
- 서술형 문항: 구체적인 피드백을 이끌어낼 수 있도록 개방형 질문
- 교육과정의 특성을 반영한 구체적인 문항 작성
- 각 카테고리에 해당하는 내용만 포함
- 반드시 요청된 개수만큼 정확히 생성할 것

## 출력 형식 (JSON)
{
  "questions": [
    {
      "category": "content",
      "question_text": "교육 내용이 실무에 적용하기에 적합했다.",
      "question_type": "scale",
      "scale_min": 1,
      "scale_max": 5,
      "scale_labels": {"min": "매우 불만족", "max": "매우 만족"},
      "is_required": true
    },
    {
      "category": "overall",
      "question_text": "교육에서 가장 인상 깊었던 부분이나 개선이 필요한 점이 있다면 자유롭게 작성해 주세요.",
      "question_type": "text",
      "is_required": false
    }
  ]
}

중요:
1. 반드시 유효한 JSON 형식으로만 출력하세요. 다른 설명 없이 JSON만 출력하세요.
2. 5점 척도 문항 ${scaleQuestionCount}개 + 서술형 문항 ${textQuestionCount}개 = 총 ${scaleQuestionCount + textQuestionCount}개를 정확히 생성하세요.`;

  const result = await callGeminiAPI<{ questions: GeneratedQuestion[] }>(
    prompt
  );

  // Validate and normalize the response
  return result.questions.map((q) => ({
    category: q.category,
    question_text: q.question_text,
    question_type: q.question_type,
    options: q.options,
    scale_min: q.question_type === "scale" ? (q.scale_min ?? 1) : undefined,
    scale_max: q.question_type === "scale" ? (q.scale_max ?? 5) : undefined,
    scale_labels:
      q.question_type === "scale"
        ? (q.scale_labels ?? { min: "매우 불만족", max: "매우 만족" })
        : undefined,
    is_required: q.is_required ?? true,
  }));
}

/**
 * Generic function to call Gemini API with any prompt
 * Returns raw text response
 */
export async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data: GeminiResponse = await response.json();
  const text = data.candidates[0]?.content?.parts[0]?.text;

  if (!text) {
    throw new Error("Empty response from Gemini API");
  }

  return text;
}

// Export types for use in other files
export type {
  CourseInfo,
  LegacyGeneratedQuestion as LegacyQuestion,
  TextSummary,
  SurveyAnalysis,
};
