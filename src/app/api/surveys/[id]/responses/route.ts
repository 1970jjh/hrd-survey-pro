// HRD Survey Pro - Survey Responses API (Admin View)
import { NextRequest, NextResponse } from "next/server";
import { getSurvey, getResponses } from "@/lib/firebase";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/surveys/[id]/responses - 응답 목록 조회
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get all responses
    const responses = await getResponses(id);

    // Paginate
    const total = responses.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedResponses = responses.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        responses: paginatedResponses,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Get responses error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
