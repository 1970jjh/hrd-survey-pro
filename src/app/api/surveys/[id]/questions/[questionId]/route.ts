// HRD Survey Pro - Individual Question API (Update, Delete)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSurvey,
  getQuestions,
  updateQuestion,
  deleteQuestion,
} from "@/lib/firebase";

const updateQuestionSchema = z.object({
  category: z.string().optional(),
  content: z.string().min(1, "질문 내용을 입력해주세요").optional(),
  type: z.enum(["choice", "text"]).optional(),
  isRequired: z.boolean().optional(),
  orderNum: z.number().int().optional(),
});

type RouteParams = { params: Promise<{ id: string; questionId: string }> };

// PUT /api/surveys/[id]/questions/[questionId] - 문항 수정
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, questionId } = await params;

    // Verify survey exists
    const survey = await getSurvey(id);
    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Verify question exists
    const questions = await getQuestions(id);
    const question = questions.find((q) => q.id === questionId);
    if (!question) {
      return NextResponse.json(
        { error: "문항을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const result = updateQuestionSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (result.data.category !== undefined)
      updateData.category = result.data.category;
    if (result.data.content !== undefined)
      updateData.content = result.data.content;
    if (result.data.type !== undefined) updateData.type = result.data.type;
    if (result.data.isRequired !== undefined)
      updateData.isRequired = result.data.isRequired;
    if (result.data.orderNum !== undefined)
      updateData.orderNum = result.data.orderNum;

    await updateQuestion(questionId, updateData);

    return NextResponse.json({
      success: true,
      message: "문항이 수정되었습니다",
    });
  } catch (error) {
    console.error("Update question error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/surveys/[id]/questions/[questionId] - 문항 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, questionId } = await params;

    // Verify survey exists
    const survey = await getSurvey(id);
    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await deleteQuestion(questionId);

    return NextResponse.json({
      success: true,
      message: "문항이 삭제되었습니다",
    });
  } catch (error) {
    console.error("Delete question error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
