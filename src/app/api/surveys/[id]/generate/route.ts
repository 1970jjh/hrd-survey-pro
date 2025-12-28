// HRD Survey Pro - AI Survey Generation API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSurvey,
  getCourse,
  getQuestions,
  createQuestion,
  deleteQuestionsBySurvey,
} from "@/lib/firebase";
import { generateQuestions, type GeneratedQuestion } from "@/lib/gemini";

const generateSchema = z.object({
  categories: z.array(z.string()).optional(),
  scaleQuestionCount: z.number().int().min(3).max(20).optional(),
  textQuestionCount: z.number().int().min(0).max(10).optional(),
  // Legacy support
  questionsPerCategory: z.number().int().min(1).max(10).optional(),
  includeTextQuestions: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/surveys/[id]/generate - AI로 설문 문항 생성
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get survey
    const survey = await getSurvey(id);
    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Get course info
    if (!survey.courseId) {
      return NextResponse.json(
        { error: "교육과정 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const course = await getCourse(survey.courseId);
    if (!course) {
      return NextResponse.json(
        { error: "교육과정 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = generateSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const categories = (result.data.categories || [
      "overall",
      "content",
      "instructor",
    ]) as ("overall" | "content" | "instructor" | "facility" | "other")[];

    // Support new parameters (scaleQuestionCount, textQuestionCount) or legacy (questionsPerCategory, includeTextQuestions)
    const scaleQuestionCount =
      result.data.scaleQuestionCount ||
      (result.data.questionsPerCategory
        ? categories.length * result.data.questionsPerCategory
        : 10);
    const textQuestionCount =
      result.data.textQuestionCount ??
      (result.data.includeTextQuestions !== false ? 2 : 0);

    // Generate questions using AI
    const generatedQuestions: GeneratedQuestion[] = await generateQuestions({
      courseTitle: course.title,
      courseObjectives: course.objectives,
      courseContent: course.content,
      instructor: course.instructor,
      categories,
      scaleQuestionCount,
      textQuestionCount,
    });

    // Delete existing questions
    await deleteQuestionsBySurvey(id);

    // Insert generated questions
    const createdIds: string[] = [];
    for (let i = 0; i < generatedQuestions.length; i++) {
      const q = generatedQuestions[i];
      const questionId = await createQuestion({
        surveyId: id,
        category: q.category,
        content: q.question_text,
        type: q.question_type === "scale" ? "choice" : "text",
        isRequired: q.is_required ?? true,
        orderNum: i + 1,
      });
      createdIds.push(questionId);
    }

    // Get the created questions
    const questions = await getQuestions(id);

    return NextResponse.json({
      success: true,
      message: `AI가 ${createdIds.length}개의 문항을 생성했습니다`,
      data: questions,
    });
  } catch (error) {
    console.error("Generate questions error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI 문항 생성에 실패했습니다",
      },
      { status: 500 }
    );
  }
}
