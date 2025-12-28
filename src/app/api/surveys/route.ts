// HRD Survey Pro - Surveys API (List & Create)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getSurveys,
  createSurvey,
  getCourse,
  getCourses,
  generateSurveyCode,
  timestampToDate,
  Timestamp,
} from "@/lib/firebase";

const createSurveySchema = z
  .object({
    courseId: z.string().min(1).optional(),
    course_id: z.string().min(1).optional(),
    title: z.string().min(1, "설문 제목을 입력해주세요"),
    description: z.string().optional(),
    scaleType: z
      .union([z.literal(5), z.literal(7), z.literal(9), z.literal(10)])
      .optional(),
    isAnonymous: z.boolean().optional(), // true: 무기명, false: 기명 (기본값: true)
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine((data) => data.courseId || data.course_id, {
    message: "유효한 교육과정을 선택해주세요",
  });

// GET /api/surveys - 설문 목록 조회
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const courseId =
      searchParams.get("courseId") || searchParams.get("course_id") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    let surveys = await getSurveys();

    // 필터링
    if (search) {
      const searchLower = search.toLowerCase();
      surveys = surveys.filter((survey) =>
        survey.title.toLowerCase().includes(searchLower)
      );
    }

    if (status) {
      surveys = surveys.filter((survey) => survey.status === status);
    }

    if (courseId) {
      surveys = surveys.filter((survey) => survey.courseId === courseId);
    }

    // 페이지네이션
    const total = surveys.length;
    const offset = (page - 1) * limit;
    const paginatedSurveys = surveys.slice(offset, offset + limit);

    // Get all courses to map course info to surveys
    const courses = await getCourses();
    const coursesMap = new Map(courses.map((c) => [c.id, c]));

    // Map surveys with course info (snake_case for frontend)
    const surveysWithCourses = paginatedSurveys.map((survey) => {
      const course = survey.courseId ? coursesMap.get(survey.courseId) : null;
      const createdAt = timestampToDate(survey.createdAt as Timestamp);

      return {
        id: survey.id,
        title: survey.title,
        description: survey.description || null,
        url_code: survey.uniqueCode,
        status: survey.status,
        is_anonymous: survey.isAnonymous ?? true, // 무기명/기명 여부
        start_date: survey.startDate
          ? timestampToDate(survey.startDate as Timestamp)?.toISOString()
          : null,
        end_date: survey.endDate
          ? timestampToDate(survey.endDate as Timestamp)?.toISOString()
          : null,
        created_at: createdAt?.toISOString() || new Date().toISOString(),
        courses: course
          ? {
              title: course.title,
              instructor: course.instructor || null,
            }
          : { title: "과정 없음", instructor: null },
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        surveys: surveysWithCourses,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get surveys error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/surveys - 설문 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = createSurveySchema.safeParse(body);

    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || "입력값이 올바르지 않습니다" },
        { status: 400 }
      );
    }

    // Support both courseId and course_id
    const courseId = result.data.courseId || result.data.course_id;

    // Verify course exists
    const course = await getCourse(courseId!);
    if (!course) {
      return NextResponse.json(
        { error: "교육과정을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Generate unique code
    const uniqueCode = generateSurveyCode();

    const surveyId = await createSurvey({
      courseId: courseId!,
      title: result.data.title,
      description: result.data.description,
      status: "draft",
      uniqueCode,
      scaleType: result.data.scaleType || 5,
      isAnonymous: result.data.isAnonymous ?? true, // 기본값: 무기명
      startDate: result.data.startDate
        ? new Date(result.data.startDate)
        : undefined,
      endDate: result.data.endDate ? new Date(result.data.endDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "설문이 생성되었습니다",
      data: { id: surveyId, uniqueCode },
    });
  } catch (error) {
    console.error("Create survey error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
