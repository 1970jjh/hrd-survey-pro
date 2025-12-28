// HRD Survey Pro - Survey Detail API (Get, Update, Delete)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSurvey,
  updateSurvey,
  deleteSurvey,
  getQuestions,
  getCourse,
  deleteQuestionsBySurvey,
} from "@/lib/firebase";

const updateSurveySchema = z.object({
  title: z.string().min(1, "설문 제목을 입력해주세요").optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "closed"]).optional(),
  scaleType: z
    .union([z.literal(5), z.literal(7), z.literal(9), z.literal(10)])
    .optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/surveys/[id] - 설문 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const survey = await getSurvey(id);

    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Get course info if exists
    let course = null;
    if (survey.courseId) {
      course = await getCourse(survey.courseId);
    }

    // Get questions for this survey
    const rawQuestions = await getQuestions(id);

    // Map Firebase fields to UI expected fields
    // Firebase: content, type, isRequired, orderNum, category
    // UI: question_text, question_type, is_required, order_num, category
    const questions = rawQuestions.map((q) => ({
      id: q.id,
      category: q.category || "overall",
      question_text: q.content,
      question_type: q.type === "choice" ? "scale" : "text",
      is_required: q.isRequired ?? true,
      order_num: q.orderNum,
      scale_min: q.type === "choice" ? 1 : undefined,
      scale_max: q.type === "choice" ? 5 : undefined,
      scale_labels:
        q.type === "choice"
          ? { min: "매우 불만족", max: "매우 만족" }
          : undefined,
    }));

    // Map survey fields for compatibility
    const surveyData = {
      ...survey,
      url_code: survey.uniqueCode,
      created_at: survey.createdAt,
      courses: course,
      questions,
    };

    return NextResponse.json({
      success: true,
      data: surveyData,
    });
  } catch (error) {
    console.error("Get survey error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PUT /api/surveys/[id] - 설문 수정
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateSurveySchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const survey = await getSurvey(id);
    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (result.data.title !== undefined) updateData.title = result.data.title;
    if (result.data.description !== undefined)
      updateData.description = result.data.description;
    if (result.data.status !== undefined) {
      updateData.status = result.data.status;
      if (result.data.status === "closed") {
        updateData.closedAt = new Date();
      }
    }
    if (result.data.scaleType !== undefined)
      updateData.scaleType = result.data.scaleType;
    if (result.data.startDate !== undefined) {
      updateData.startDate = result.data.startDate
        ? new Date(result.data.startDate)
        : null;
    }
    if (result.data.endDate !== undefined) {
      updateData.endDate = result.data.endDate
        ? new Date(result.data.endDate)
        : null;
    }

    await updateSurvey(id, updateData);

    return NextResponse.json({
      success: true,
      message: "설문이 수정되었습니다",
    });
  } catch (error) {
    console.error("Update survey error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/surveys/[id] - 설문 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const survey = await getSurvey(id);
    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Delete associated questions first
    await deleteQuestionsBySurvey(id);

    // Delete survey
    await deleteSurvey(id);

    return NextResponse.json({
      success: true,
      message: "설문이 삭제되었습니다",
    });
  } catch (error) {
    console.error("Delete survey error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
