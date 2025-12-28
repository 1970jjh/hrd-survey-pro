// HRD Survey Pro - Course Detail API (Get, Update, Delete)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCourse, updateCourse, deleteCourse } from "@/lib/firebase";

const updateCourseSchema = z.object({
  title: z.string().min(1, "과정명을 입력해주세요").optional(),
  objectives: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  instructor: z.string().optional().nullable(),
  trainingStartDate: z.string().optional().nullable(),
  trainingEndDate: z.string().optional().nullable(),
  targetParticipants: z.number().int().min(0).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/courses/[id] - 교육과정 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const course = await getCourse(id);

    if (!course) {
      return NextResponse.json(
        { error: "교육과정을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error("Get course error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PUT /api/courses/[id] - 교육과정 수정
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = updateCourseSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const course = await getCourse(id);
    if (!course) {
      return NextResponse.json(
        { error: "교육과정을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (result.data.title !== undefined) updateData.title = result.data.title;
    if (result.data.objectives !== undefined)
      updateData.objectives = result.data.objectives;
    if (result.data.content !== undefined)
      updateData.content = result.data.content;
    if (result.data.instructor !== undefined)
      updateData.instructor = result.data.instructor;
    if (result.data.trainingStartDate !== undefined) {
      updateData.trainingStartDate = result.data.trainingStartDate
        ? new Date(result.data.trainingStartDate)
        : null;
    }
    if (result.data.trainingEndDate !== undefined) {
      updateData.trainingEndDate = result.data.trainingEndDate
        ? new Date(result.data.trainingEndDate)
        : null;
    }
    if (result.data.targetParticipants !== undefined)
      updateData.targetParticipants = result.data.targetParticipants;

    await updateCourse(id, updateData);

    return NextResponse.json({
      success: true,
      message: "교육과정이 수정되었습니다",
    });
  } catch (error) {
    console.error("Update course error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id] - 교육과정 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const course = await getCourse(id);
    if (!course) {
      return NextResponse.json(
        { error: "교육과정을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await deleteCourse(id);

    return NextResponse.json({
      success: true,
      message: "교육과정이 삭제되었습니다",
    });
  } catch (error) {
    console.error("Delete course error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
