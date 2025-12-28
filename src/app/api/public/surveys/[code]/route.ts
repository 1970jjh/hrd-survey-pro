// HRD Survey Pro - Public Survey API (No Auth Required)
import { NextRequest, NextResponse } from "next/server";
import { getSurveyByCode, getQuestions, getCourse } from "@/lib/firebase";

type RouteParams = { params: Promise<{ code: string }> };

// GET /api/public/surveys/[code] - 공개 설문 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params;

    // Get survey by unique code
    const survey = await getSurveyByCode(code);

    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Check if survey is active
    if (survey.status !== "active") {
      if (survey.status === "draft") {
        return NextResponse.json(
          { error: "아직 공개되지 않은 설문입니다" },
          { status: 403 }
        );
      }
      if (survey.status === "closed") {
        return NextResponse.json(
          { error: "종료된 설문입니다" },
          { status: 403 }
        );
      }
    }

    // Check date range
    const now = new Date();
    if (survey.startDate) {
      const startDate =
        survey.startDate instanceof Date
          ? survey.startDate
          : survey.startDate.toDate();
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
          : survey.endDate.toDate();
      if (endDate < now) {
        return NextResponse.json(
          { error: "종료된 설문입니다" },
          { status: 403 }
        );
      }
    }

    // Get course info if exists
    let course = null;
    if (survey.courseId) {
      course = await getCourse(survey.courseId);
    }

    // Get questions
    const rawQuestions = await getQuestions(survey.id!);

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

    return NextResponse.json({
      success: true,
      data: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        scaleType: survey.scaleType,
        is_anonymous: survey.isAnonymous ?? true, // 기본값: 무기명
        course: course
          ? { title: course.title, instructor: course.instructor }
          : null,
        questions,
      },
    });
  } catch (error) {
    console.error("Get public survey error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
