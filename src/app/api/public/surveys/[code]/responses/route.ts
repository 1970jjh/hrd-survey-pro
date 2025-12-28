// HRD Survey Pro - Survey Response Submission API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp } from "firebase/firestore";
import {
  getSurveyByCode,
  getQuestions,
  createResponse,
  checkDuplicateResponse,
  generateSessionId,
} from "@/lib/firebase";

const answerSchema = z.object({
  questionId: z.string(),
  scoreValue: z.number().optional(),
  textValue: z.string().optional(),
});

const submitResponseSchema = z.object({
  answers: z.array(answerSchema),
  sessionId: z.string().optional(),
  respondentName: z.string().optional(), // 기명 설문인 경우 응답자 이름
});

type RouteParams = { params: Promise<{ code: string }> };

// POST /api/public/surveys/[code]/responses - 응답 제출
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    // Get survey
    const survey = await getSurveyByCode(code);

    if (!survey || !survey.id) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Check if survey is active
    if (survey.status !== "active") {
      return NextResponse.json(
        { error: "응답을 받지 않는 설문입니다" },
        { status: 403 }
      );
    }

    // Check date range
    const now = new Date();
    if (survey.startDate) {
      const startDate =
        survey.startDate instanceof Date
          ? survey.startDate
          : (survey.startDate as Timestamp).toDate();
      if (startDate > now) {
        return NextResponse.json(
          { error: "아직 시작되지 않은 설문입니다" },
          { status: 403 }
        );
      }
    }
    if (survey.endDate) {
      const endDate =
        survey.endDate instanceof Date
          ? survey.endDate
          : (survey.endDate as Timestamp).toDate();
      if (endDate < now) {
        return NextResponse.json(
          { error: "종료된 설문입니다" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const result = submitResponseSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    // Generate session ID if not provided
    const sessionId = result.data.sessionId || generateSessionId();

    // Check for duplicate response
    const isDuplicate = await checkDuplicateResponse(survey.id, sessionId);
    if (isDuplicate) {
      return NextResponse.json(
        { error: "이미 응답을 제출하셨습니다" },
        { status: 400 }
      );
    }

    // Get questions to validate required fields
    const questions = await getQuestions(survey.id);
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Validate required questions
    const answeredQuestionIds = new Set(
      result.data.answers.map((a) => a.questionId)
    );
    const missingRequired = questions.filter(
      (q) => q.isRequired && !answeredQuestionIds.has(q.id!)
    );

    if (missingRequired.length > 0) {
      return NextResponse.json(
        { error: "필수 문항에 응답해주세요" },
        { status: 400 }
      );
    }

    // Filter valid answers and remove undefined values (Firebase doesn't accept undefined)
    const validAnswers = result.data.answers
      .filter((a) => questionMap.has(a.questionId))
      .map((a) => {
        const answer: { questionId: string; scoreValue?: number; textValue?: string } = {
          questionId: a.questionId,
        };
        if (a.scoreValue !== undefined) {
          answer.scoreValue = a.scoreValue;
        }
        if (a.textValue !== undefined) {
          answer.textValue = a.textValue;
        }
        return answer;
      });

    if (validAnswers.length === 0) {
      return NextResponse.json(
        { error: "유효한 응답이 없습니다" },
        { status: 400 }
      );
    }

    // Create response - remove undefined fields for Firebase
    const responseData: {
      surveyId: string;
      sessionId: string;
      answers: typeof validAnswers;
      submittedAt: Timestamp;
      respondentName?: string;
    } = {
      surveyId: survey.id,
      sessionId,
      answers: validAnswers,
      submittedAt: Timestamp.now(),
    };

    // Only add respondentName if it exists
    if (result.data.respondentName) {
      responseData.respondentName = result.data.respondentName;
    }

    await createResponse(responseData);

    return NextResponse.json({
      success: true,
      message: "응답이 제출되었습니다",
      data: {
        sessionId,
        responseCount: validAnswers.length,
      },
    });
  } catch (error) {
    console.error("Submit response error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
