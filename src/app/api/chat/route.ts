// HRD Survey Pro - Admin AI Chatbot API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSurveys,
  getCourses,
  getResponses,
  getQuestions,
} from "@/lib/firebase";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const chatSchema = z.object({
  message: z.string().min(1, "메시지를 입력해주세요"),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

// System prompt with app knowledge
const SYSTEM_PROMPT = `당신은 HRD Survey Pro 시스템의 AI 어시스턴트입니다.
이 시스템은 기업교육(HRD) 설문조사 관리 플랫폼으로, 다음과 같은 기능을 제공합니다:

## 시스템 개요
HRD Survey Pro는 기업교육 후 교육 효과를 측정하고 분석하기 위한 설문조사 시스템입니다.
- Next.js 14 (App Router) + TypeScript로 구축
- Firebase Firestore를 데이터베이스로 사용
- Gemini AI를 활용한 설문 문항 자동 생성 및 결과 분석

## 주요 기능
1. **교육과정 관리**: 교육과정 정보(제목, 목표, 내용, 강사, 일정, 참가자 수) 등록/관리
2. **설문조사 생성**: AI가 교육과정 정보를 기반으로 맞춤형 설문 문항 자동 생성
3. **설문 유형**: 무기명/기명 설문 선택 가능
4. **설문 배포**: 고유 URL 코드로 응답자에게 설문 배포
5. **응답 수집**: 모바일 최적화된 설문 응답 페이지
6. **결과 분석**: 정량 분석(평균, 표준편차, 분포) + AI 기반 정성 분석
7. **리포트 생성**: PDF 형식의 상세 분석 리포트 생성

## 설문 카테고리
- **overall**: 종합만족도 - 교육 전반에 대한 만족도
- **content**: 교육내용 - 교육 내용의 전문성, 실용성, 체계성
- **instructor**: 강사만족도 - 강사의 전달력, 전문성, 열정
- **facility**: 교육환경 - 교육 시설, 환경, 교재 등
- **other**: 기타 - 기타 의견 및 제안

## 설문 문항 유형
- **scale**: 5/7/9/10점 척도 문항 (정량 평가)
- **text**: 서술형 문항 (정성 평가)

## 설문 상태
- **draft**: 임시저장 - 문항 편집 가능, 응답 불가
- **active**: 진행중 - 응답 수집 중
- **closed**: 종료 - 응답 마감, 결과 분석 가능

## 분석 지표
- **평균 (Average)**: 전체 응답의 평균 점수
- **표준편차 (Std Deviation)**: 응답의 편차, 낮을수록 일관된 평가
- **응답률**: (응답자 수 / 목표 참가자 수) × 100

## 결과 해석 가이드
- 4.0점 이상: 매우 우수
- 3.5~4.0점: 우수
- 3.0~3.5점: 보통
- 3.0점 미만: 개선 필요

## 당신의 역할
1. 시스템 사용법 안내
2. 설문 결과 분석 및 해석
3. 교육 효과성 평가 및 피드백
4. 더 나은 교육과정 설계를 위한 조언
5. 설문 문항 작성 팁 제공

응답할 때 규칙:
- 친절하고 전문적인 어조를 사용하세요
- 마크다운 형식을 활용하여 가독성을 높이세요 (볼드, 리스트, 줄바꿈 등)
- 구체적인 수치나 데이터가 있다면 해석을 제공하세요
- 필요시 개선 방안이나 다음 단계를 제안하세요`;

async function getAppContext(): Promise<string> {
  try {
    // Get real-time data from the app
    const [surveys, courses] = await Promise.all([getSurveys(), getCourses()]);

    // Get response stats for each survey
    const surveyStats = await Promise.all(
      surveys.slice(0, 10).map(async (survey) => {
        const responses = await getResponses(survey.id!);
        const questions = await getQuestions(survey.id!);
        return {
          title: survey.title,
          status: survey.status,
          isAnonymous: survey.isAnonymous,
          responseCount: responses.length,
          questionCount: questions.length,
        };
      })
    );

    const context = `
## 현재 시스템 데이터 (실시간)

### 교육과정 현황
- 총 ${courses.length}개의 교육과정 등록
${courses
  .slice(0, 5)
  .map(
    (c) =>
      `- "${c.title}" (강사: ${c.instructor || "미지정"}, 참가자: ${c.targetParticipants || 0}명)`
  )
  .join("\n")}

### 설문조사 현황
- 총 ${surveys.length}개의 설문
- 진행중: ${surveys.filter((s) => s.status === "active").length}개
- 종료: ${surveys.filter((s) => s.status === "closed").length}개
- 임시저장: ${surveys.filter((s) => s.status === "draft").length}개

### 최근 설문 상세
${surveyStats.map((s) => `- "${s.title}": ${s.status}, ${s.responseCount}명 응답, ${s.questionCount}문항, ${s.isAnonymous ? "무기명" : "기명"}`).join("\n")}
`;
    return context;
  } catch (error) {
    console.error("Error fetching app context:", error);
    return "\n(실시간 데이터를 가져올 수 없습니다)\n";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = chatSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const { message, conversationHistory = [] } = result.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI 서비스가 설정되지 않았습니다" },
        { status: 500 }
      );
    }

    // Get real-time app context
    const appContext = await getAppContext();

    // Build conversation with system prompt and context
    const fullSystemPrompt = SYSTEM_PROMPT + appContext;

    // Build message history for context
    const messages = [
      {
        role: "user",
        parts: [
          {
            text: `[시스템 컨텍스트]\n${fullSystemPrompt}\n\n이 정보를 바탕으로 질문에 답해주세요. 시스템 컨텍스트는 언급하지 말고 자연스럽게 대화하세요.`,
          },
        ],
      },
      {
        role: "model",
        parts: [
          {
            text: "안녕하세요! HRD Survey Pro 어시스턴트입니다. 설문조사 관리, 결과 분석, 교육과정 설계에 대해 도움을 드릴 준비가 되어 있습니다. 무엇을 도와드릴까요?",
          },
        ],
      },
    ];

    // Add conversation history
    conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    });

    // Add current message
    messages.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      console.error("Gemini API error:", response.status, response.statusText);
      return NextResponse.json(
        { error: "AI 응답을 생성하는데 실패했습니다" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      return NextResponse.json(
        { error: "AI 응답이 비어있습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: aiResponse,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
