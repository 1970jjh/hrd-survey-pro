// HRD Survey Pro - Dashboard Statistics API
import { NextResponse } from "next/server";
import {
  getCourses,
  getSurveys,
  getResponses,
  getCourse,
  timestampToDate,
  Response as SurveyResponse,
  Timestamp,
} from "@/lib/firebase";

interface DashboardStats {
  totalCourses: number;
  totalSurveys: number;
  activeSurveys: number;
  totalResponses: number;
  recentSurveys: Array<{
    id: string;
    title: string;
    status: string;
    course_title: string;
    response_count: number;
    created_at: string;
  }>;
  surveysByStatus: {
    draft: number;
    active: number;
    closed: number;
  };
  recentResponses: Array<{
    survey_id: string;
    survey_title: string;
    responded_at: string;
  }>;
}

// GET /api/dashboard - 대시보드 통계 조회
export async function GET() {
  try {
    // Get all courses
    const courses = await getCourses();

    // Get all surveys
    const surveys = await getSurveys();

    // Count surveys by status
    const surveysByStatus = {
      draft: surveys.filter((s) => s.status === "draft").length,
      active: surveys.filter((s) => s.status === "active").length,
      closed: surveys.filter((s) => s.status === "closed").length,
    };

    // Get response counts per survey and collect all responses
    let totalResponses = 0;
    const responseCounts: Record<string, number> = {};
    const allResponses: Array<{
      surveyId: string;
      surveyTitle: string;
      response: SurveyResponse;
    }> = [];

    for (const survey of surveys) {
      if (survey.id) {
        const responses = await getResponses(survey.id);
        responseCounts[survey.id] = responses.length;
        totalResponses += responses.length;

        // Collect responses for recent responses list
        for (const response of responses) {
          allResponses.push({
            surveyId: survey.id,
            surveyTitle: survey.title,
            response,
          });
        }
      }
    }

    // Sort all responses by submittedAt and get recent 5
    allResponses.sort((a, b) => {
      const aTime =
        a.response.submittedAt instanceof Timestamp
          ? a.response.submittedAt.toMillis()
          : new Date(a.response.submittedAt as unknown as string).getTime();
      const bTime =
        b.response.submittedAt instanceof Timestamp
          ? b.response.submittedAt.toMillis()
          : new Date(b.response.submittedAt as unknown as string).getTime();
      return bTime - aTime;
    });

    const recentResponses = allResponses.slice(0, 5).map((r) => ({
      survey_id: r.surveyId,
      survey_title: r.surveyTitle,
      responded_at:
        r.response.submittedAt instanceof Timestamp
          ? r.response.submittedAt.toDate().toISOString()
          : new Date(r.response.submittedAt as unknown as string).toISOString(),
    }));

    // Build recent surveys with response counts and course titles
    const recentSurveys = await Promise.all(
      surveys.slice(0, 5).map(async (s) => {
        let courseTitle = "";
        if (s.courseId) {
          const course = await getCourse(s.courseId);
          courseTitle = course?.title || "";
        }

        const createdAt = timestampToDate(s.createdAt as Timestamp);

        return {
          id: s.id!,
          title: s.title,
          status: s.status,
          course_title: courseTitle,
          response_count: responseCounts[s.id!] || 0,
          created_at: createdAt?.toISOString() || new Date().toISOString(),
        };
      })
    );

    const stats: DashboardStats = {
      totalCourses: courses.length,
      totalSurveys: surveys.length,
      activeSurveys: surveysByStatus.active,
      totalResponses,
      recentSurveys,
      surveysByStatus,
      recentResponses,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "대시보드 데이터를 가져오는데 실패했습니다" },
      { status: 500 }
    );
  }
}
