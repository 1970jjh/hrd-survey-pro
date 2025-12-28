// HRD Survey Pro - Survey Status API
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSurvey, updateSurvey, getQuestions } from "@/lib/firebase";

const statusSchema = z.object({
  status: z.enum(["draft", "active", "closed"]),
});

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/surveys/[id]/status - 설문 상태 변경
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const body = await request.json();
    const result = statusSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    // Verify survey exists
    const survey = await getSurvey(id);
    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // If activating, check if survey has questions
    if (result.data.status === "active") {
      const questions = await getQuestions(id);
      if (!questions || questions.length === 0) {
        return NextResponse.json(
          { error: "설문을 활성화하려면 최소 1개 이상의 문항이 필요합니다" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      status: result.data.status,
    };

    if (result.data.status === "closed") {
      updateData.closedAt = new Date();
    }

    await updateSurvey(id, updateData);

    const statusMessages = {
      draft: "설문이 임시저장 상태로 변경되었습니다",
      active: "설문이 활성화되었습니다",
      closed: "설문이 종료되었습니다",
    };

    return NextResponse.json({
      success: true,
      message: statusMessages[result.data.status],
    });
  } catch (error) {
    console.error("Update survey status error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
