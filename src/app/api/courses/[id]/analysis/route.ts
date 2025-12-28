// HRD Survey Pro - Course Analysis API (전체 과정 통합 분석)
import { NextRequest, NextResponse } from "next/server";
import {
  getCourse,
  getSurveys,
  getQuestions,
  getResponses,
} from "@/lib/firebase";
import { generateWithGemini } from "@/lib/gemini";

type RouteParams = { params: Promise<{ id: string }> };

const CATEGORY_LABELS: Record<string, string> = {
  overall: "종합만족도",
  content: "교육내용",
  instructor: "강사만족도",
  facility: "교육환경",
  other: "기타",
};

function calculateStdDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

// GET /api/courses/[id]/analysis - 과정 전체 분석 데이터 조회
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

    // Get all surveys for this course
    const allSurveys = await getSurveys();
    const courseSurveys = allSurveys.filter((s) => s.courseId === id);

    if (courseSurveys.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          course: {
            id: course.id,
            title: course.title,
            instructor: course.instructor,
          },
          summary: {
            survey_count: 0,
            total_respondents: 0,
            target_participants: course.targetParticipants || 0,
            response_rate: 0,
            overall_average: 0,
            overall_std_deviation: 0,
          },
          surveys: [],
          categories: [],
          trend: [],
        },
      });
    }

    // Collect all responses from all surveys
    const surveyAnalyses = [];
    const allValues: number[] = [];
    const categoryValues = new Map<string, number[]>();

    for (const survey of courseSurveys) {
      const questions = await getQuestions(survey.id!);
      const responses = await getResponses(survey.id!);

      // Create answer map
      const answersByQuestion = new Map<
        string,
        Array<{ scoreValue?: number }>
      >();
      responses.forEach((response) => {
        response.answers.forEach((answer) => {
          const existing = answersByQuestion.get(answer.questionId) || [];
          existing.push(answer);
          answersByQuestion.set(answer.questionId, existing);
        });
      });

      // Calculate survey average
      const surveyValues: number[] = [];
      questions.forEach((q) => {
        if (q.type !== "choice") return;
        const answers = answersByQuestion.get(q.id!) || [];
        answers.forEach((a) => {
          if (a.scoreValue !== undefined) {
            surveyValues.push(a.scoreValue);
            allValues.push(a.scoreValue);

            // Collect by category
            const cat = q.category || "overall";
            const catValues = categoryValues.get(cat) || [];
            catValues.push(a.scoreValue);
            categoryValues.set(cat, catValues);
          }
        });
      });

      const surveyAverage =
        surveyValues.length > 0
          ? Math.round(
              (surveyValues.reduce((a, b) => a + b, 0) / surveyValues.length) *
                100
            ) / 100
          : 0;

      surveyAnalyses.push({
        id: survey.id,
        title: survey.title,
        status: survey.status,
        respondent_count: responses.length,
        average: surveyAverage,
        std_deviation:
          Math.round(calculateStdDeviation(surveyValues) * 100) / 100,
      });
    }

    // Calculate overall stats
    const totalRespondents = surveyAnalyses.reduce(
      (sum, s) => sum + s.respondent_count,
      0
    );
    const overallAverage =
      allValues.length > 0
        ? Math.round(
            (allValues.reduce((a, b) => a + b, 0) / allValues.length) * 100
          ) / 100
        : 0;

    // Calculate category analysis
    const categories = Array.from(categoryValues.entries()).map(
      ([cat, values]) => ({
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
        average:
          values.length > 0
            ? Math.round(
                (values.reduce((a, b) => a + b, 0) / values.length) * 100
              ) / 100
            : 0,
        std_deviation: Math.round(calculateStdDeviation(values) * 100) / 100,
        response_count: values.length,
      })
    );

    const result = {
      course: {
        id: course.id,
        title: course.title,
        instructor: course.instructor,
      },
      summary: {
        survey_count: courseSurveys.length,
        total_respondents: totalRespondents,
        target_participants: course.targetParticipants || 0,
        response_rate:
          course.targetParticipants && course.targetParticipants > 0
            ? Math.round((totalRespondents / course.targetParticipants) * 100)
            : 0,
        overall_average: overallAverage,
        overall_std_deviation:
          Math.round(calculateStdDeviation(allValues) * 100) / 100,
      },
      surveys: surveyAnalyses,
      categories,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get course analysis error:", error);
    return NextResponse.json(
      { error: "분석 데이터를 가져오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/courses/[id]/analysis - AI 분석 요청
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const analysisResponse = await GET(request, { params });
    const analysisData = await analysisResponse.json();

    if (!analysisData.success) {
      return NextResponse.json(
        { error: analysisData.error },
        { status: analysisResponse.status }
      );
    }

    const analysis = analysisData.data;

    if (analysis.summary.survey_count === 0) {
      return NextResponse.json(
        { error: "분석할 설문 데이터가 없습니다" },
        { status: 400 }
      );
    }

    const courseInfo = `
교육과정: ${analysis.course.title}
강사: ${analysis.course.instructor || "N/A"}
설문 수: ${analysis.summary.survey_count}개
총 응답자: ${analysis.summary.total_respondents}명
전체 평균: ${analysis.summary.overall_average}점 (5점 만점)
`;

    const surveyInfo = analysis.surveys
      .map(
        (s: { title: string; respondent_count: number; average: number }) =>
          `- ${s.title}: ${s.average}점 (${s.respondent_count}명 응답)`
      )
      .join("\n");

    const categoryInfo = analysis.categories
      .map(
        (c: { label: string; average: number; std_deviation: number }) =>
          `- ${c.label}: ${c.average}점 (표준편차 ${c.std_deviation})`
      )
      .join("\n");

    const prompt = `당신은 기업교육 전문가입니다. 아래 교육과정의 전체 설문조사 결과를 분석하여 JSON 형식으로 응답해주세요.

${courseInfo}

설문별 결과:
${surveyInfo}

카테고리별 평균:
${categoryInfo}

다음 JSON 형식으로 정확히 응답해주세요:
{
  "summary": "전체 교육과정에 대한 종합적인 평가 요약 (2-3문장)",
  "strengths": [
    "이 교육과정의 강점 1",
    "이 교육과정의 강점 2"
  ],
  "weaknesses": [
    "개선이 필요한 영역 1",
    "개선이 필요한 영역 2"
  ],
  "insights": [
    "데이터에서 발견된 주요 인사이트 1",
    "데이터에서 발견된 주요 인사이트 2",
    "데이터에서 발견된 주요 인사이트 3"
  ],
  "recommendations": [
    "교육과정 개선을 위한 구체적인 권장사항 1",
    "교육과정 개선을 위한 구체적인 권장사항 2",
    "교육과정 개선을 위한 구체적인 권장사항 3"
  ]
}

반드시 유효한 JSON 형식으로만 응답하세요. 추가 설명 없이 JSON만 출력하세요.`;

    const aiResponse = await generateWithGemini(prompt);

    let aiResult: {
      summary: string;
      strengths: string[];
      weaknesses: string[];
      insights: string[];
      recommendations: string[];
    };

    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      aiResult = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse AI response:", aiResponse);
      return NextResponse.json(
        { error: "AI 응답 파싱에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...analysis,
        ai_summary: aiResult.summary,
        ai_strengths: aiResult.strengths,
        ai_weaknesses: aiResult.weaknesses,
        ai_insights: aiResult.insights,
        ai_recommendations: aiResult.recommendations,
      },
    });
  } catch (error) {
    console.error("Course AI analysis error:", error);
    return NextResponse.json(
      { error: "AI 분석에 실패했습니다" },
      { status: 500 }
    );
  }
}
