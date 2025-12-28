// HRD Survey Pro - Questions API (List & Create)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSurvey,
  getQuestions,
  createQuestion,
  deleteQuestionsBySurvey,
} from "@/lib/firebase";

const createQuestionSchema = z.object({
  category: z.string().optional(),
  content: z.string().min(1, "질문 내용을 입력해주세요"),
  type: z.enum(["choice", "text"]),
  isRequired: z.boolean().optional(),
  orderNum: z.number().int().optional(),
});

const bulkCreateQuestionsSchema = z.object({
  questions: z.array(createQuestionSchema),
});

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/surveys/[id]/questions - 문항 목록 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify survey exists
    const survey = await getSurvey(id);
    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const questions = await getQuestions(id);

    return NextResponse.json({
      success: true,
      data: questions || [],
    });
  } catch (error) {
    console.error("Get questions error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/surveys/[id]/questions - 문항 추가 (단일 또는 벌크)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify survey exists
    const survey = await getSurvey(id);
    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Check if it's a bulk insert or single insert
    const isBulk = body.questions && Array.isArray(body.questions);

    if (isBulk) {
      const result = bulkCreateQuestionsSchema.safeParse(body);

      if (!result.success) {
        const firstIssue = result.error.issues[0];
        return NextResponse.json(
          { error: firstIssue?.message || "입력값이 올바르지 않습니다" },
          { status: 400 }
        );
      }

      // Get current max order
      const existingQuestions = await getQuestions(id);
      let nextOrder =
        existingQuestions.length > 0
          ? Math.max(...existingQuestions.map((q) => q.orderNum)) + 1
          : 1;

      const createdIds: string[] = [];
      for (const q of result.data.questions) {
        const questionId = await createQuestion({
          surveyId: id,
          category: q.category,
          content: q.content,
          type: q.type,
          isRequired: q.isRequired ?? true,
          orderNum: q.orderNum ?? nextOrder++,
        });
        createdIds.push(questionId);
      }

      return NextResponse.json({
        success: true,
        message: `${createdIds.length}개의 문항이 추가되었습니다`,
        data: { ids: createdIds },
      });
    } else {
      // Single question insert
      const result = createQuestionSchema.safeParse(body);

      if (!result.success) {
        const firstIssue = result.error.issues[0];
        return NextResponse.json(
          { error: firstIssue?.message || "입력값이 올바르지 않습니다" },
          { status: 400 }
        );
      }

      // Get current max order if not specified
      let orderNum = result.data.orderNum;
      if (orderNum === undefined) {
        const existingQuestions = await getQuestions(id);
        orderNum =
          existingQuestions.length > 0
            ? Math.max(...existingQuestions.map((q) => q.orderNum)) + 1
            : 1;
      }

      const questionId = await createQuestion({
        surveyId: id,
        category: result.data.category,
        content: result.data.content,
        type: result.data.type,
        isRequired: result.data.isRequired ?? true,
        orderNum,
      });

      return NextResponse.json({
        success: true,
        message: "문항이 추가되었습니다",
        data: { id: questionId },
      });
    }
  } catch (error) {
    console.error("Create question error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/surveys/[id]/questions - 모든 문항 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify survey exists
    const survey = await getSurvey(id);
    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await deleteQuestionsBySurvey(id);

    return NextResponse.json({
      success: true,
      message: "모든 문항이 삭제되었습니다",
    });
  } catch (error) {
    console.error("Delete questions error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
