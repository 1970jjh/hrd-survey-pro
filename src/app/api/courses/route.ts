// HRD Survey Pro - Courses API (List & Create)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getCourses,
  createCourse,
  getSurveys,
  timestampToDate,
  Timestamp,
} from "@/lib/firebase";

const createCourseSchema = z.object({
  title: z.string().min(1, "과정명을 입력해주세요"),
  objectives: z.string().optional(),
  content: z.string().optional(),
  instructor: z.string().optional(),
  trainingStartDate: z.string().optional(),
  trainingEndDate: z.string().optional(),
  targetParticipants: z.number().int().min(0).optional(),
});

// GET /api/courses - 교육과정 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    let courses = await getCourses();

    // 검색 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      courses = courses.filter(
        (course) =>
          course.title.toLowerCase().includes(searchLower) ||
          (course.instructor &&
            course.instructor.toLowerCase().includes(searchLower))
      );
    }

    // 페이지네이션
    const total = courses.length;
    const offset = (page - 1) * limit;
    const paginatedCourses = courses.slice(offset, offset + limit);

    // Get all surveys to count per course and list them
    const allSurveys = await getSurveys();
    const surveysByCourse = new Map<
      string,
      Array<{ id: string; title: string; status: string }>
    >();

    allSurveys.forEach((survey) => {
      if (survey.courseId) {
        const existing = surveysByCourse.get(survey.courseId) || [];
        existing.push({
          id: survey.id!,
          title: survey.title,
          status: survey.status,
        });
        surveysByCourse.set(survey.courseId, existing);
      }
    });

    // Map courses with survey info and formatted dates (snake_case for frontend)
    const coursesWithSurveys = paginatedCourses.map((course) => {
      const courseSurveys = surveysByCourse.get(course.id!) || [];
      const trainingStartDate = timestampToDate(
        course.trainingStartDate as Timestamp
      );
      const trainingEndDate = timestampToDate(
        course.trainingEndDate as Timestamp
      );

      return {
        id: course.id,
        title: course.title,
        objectives: course.objectives || null,
        content: course.content || null,
        instructor: course.instructor || null,
        training_start_date:
          trainingStartDate?.toISOString().split("T")[0] || null,
        training_end_date: trainingEndDate?.toISOString().split("T")[0] || null,
        target_participants: course.targetParticipants || 0,
        survey_count: courseSurveys.length,
        surveys: courseSurveys,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        courses: coursesWithSurveys,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get courses error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/courses - 교육과정 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = createCourseSchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    const courseId = await createCourse({
      title: result.data.title,
      objectives: result.data.objectives,
      content: result.data.content,
      instructor: result.data.instructor,
      trainingStartDate: result.data.trainingStartDate
        ? new Date(result.data.trainingStartDate)
        : undefined,
      trainingEndDate: result.data.trainingEndDate
        ? new Date(result.data.trainingEndDate)
        : undefined,
      targetParticipants: result.data.targetParticipants,
    });

    return NextResponse.json({
      success: true,
      message: "교육과정이 등록되었습니다",
      data: { id: courseId },
    });
  } catch (error) {
    console.error("Create course error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
