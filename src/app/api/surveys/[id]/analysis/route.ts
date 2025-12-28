// HRD Survey Pro - Survey Analysis API (정량 분석 + AI 분석)
import { NextRequest, NextResponse } from "next/server";
import {
  getSurvey,
  getCourse,
  getQuestions,
  getResponses,
  updateSurvey,
  Timestamp,
} from "@/lib/firebase";
import { generateWithGemini } from "@/lib/gemini";

type RouteParams = { params: Promise<{ id: string }> };

interface QuestionAnalysis {
  questionId: string;
  content: string;
  type: string;
  category?: string;
  responseCount: number;
  average?: number;
  median?: number;
  mode?: number;
  stdDeviation?: number;
  distribution?: Record<number, number>;
  percentages?: Record<number, number>;
  textResponses?: string[];
}

interface CategoryAnalysis {
  category: string;
  label: string;
  questionCount: number;
  responseCount: number;
  average: number;
  stdDeviation: number;
}

interface SurveyAnalysis {
  survey: {
    id: string;
    title: string;
    courseTitle?: string;
  };
  summary: {
    respondentCount: number;
    targetParticipants: number;
    responseRate: number;
    overallAverage: number;
    overallStdDeviation: number;
  };
  categories: CategoryAnalysis[];
  questions: QuestionAnalysis[];
  aiSummary?: string;
  aiInsights?: string[];
  aiRecommendations?: string[];
}

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

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateMode(values: number[]): number {
  if (values.length === 0) return 0;
  const freq: Record<number, number> = {};
  values.forEach((v) => {
    freq[v] = (freq[v] || 0) + 1;
  });
  let maxFreq = 0;
  let mode = values[0];
  Object.entries(freq).forEach(([val, count]) => {
    if (count > maxFreq) {
      maxFreq = count;
      mode = Number(val);
    }
  });
  return mode;
}

// GET /api/surveys/[id]/analysis - 상세 분석 데이터 조회
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

    let course = null;
    if (survey.courseId) {
      course = await getCourse(survey.courseId);
    }

    const questions = await getQuestions(id);
    const responses = await getResponses(id);

    const respondentCount = responses.length;

    // Create answer map by question
    const answersByQuestion = new Map<
      string,
      Array<{ scoreValue?: number; textValue?: string }>
    >();
    responses.forEach((response) => {
      response.answers.forEach((answer) => {
        const existing = answersByQuestion.get(answer.questionId) || [];
        existing.push(answer);
        answersByQuestion.set(answer.questionId, existing);
      });
    });

    // Calculate per-question analysis
    const questionAnalyses: QuestionAnalysis[] = questions.map((q) => {
      const qAnswers = answersByQuestion.get(q.id!) || [];
      const numericValues = qAnswers
        .filter((a) => a.scoreValue !== undefined)
        .map((a) => a.scoreValue as number);

      const analysis: QuestionAnalysis = {
        questionId: q.id!,
        content: q.content,
        type: q.type,
        category: q.category,
        responseCount: qAnswers.length,
      };

      if (q.type === "choice" && numericValues.length > 0) {
        const avg =
          numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        analysis.average = Math.round(avg * 100) / 100;
        analysis.median = calculateMedian(numericValues);
        analysis.mode = calculateMode(numericValues);
        analysis.stdDeviation =
          Math.round(calculateStdDeviation(numericValues) * 100) / 100;

        const scaleMax = survey.scaleType || 5;
        const dist: Record<number, number> = {};
        for (let i = 1; i <= scaleMax; i++) {
          dist[i] = numericValues.filter((v) => v === i).length;
        }
        analysis.distribution = dist;

        const pct: Record<number, number> = {};
        Object.entries(dist).forEach(([k, v]) => {
          pct[Number(k)] = Math.round((v / numericValues.length) * 100);
        });
        analysis.percentages = pct;
      } else if (q.type === "text") {
        analysis.textResponses = qAnswers
          .filter((a) => a.textValue)
          .map((a) => a.textValue as string);
      }

      return analysis;
    });

    // Calculate category analysis
    const categoryMap = new Map<
      string,
      { values: number[]; questions: typeof questions }
    >();
    questions.forEach((q) => {
      if (q.type !== "choice" || !q.category) return;
      const entry = categoryMap.get(q.category) || {
        values: [],
        questions: [],
      };
      entry.questions.push(q);

      const qAnswers = answersByQuestion.get(q.id!) || [];
      qAnswers.forEach((a) => {
        if (a.scoreValue !== undefined) {
          entry.values.push(a.scoreValue);
        }
      });
      categoryMap.set(q.category, entry);
    });

    const categories: CategoryAnalysis[] = Array.from(
      categoryMap.entries()
    ).map(([cat, data]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      questionCount: data.questions.length,
      responseCount: data.values.length,
      average:
        data.values.length > 0
          ? Math.round(
              (data.values.reduce((a, b) => a + b, 0) / data.values.length) *
                100
            ) / 100
          : 0,
      stdDeviation: Math.round(calculateStdDeviation(data.values) * 100) / 100,
    }));

    // Overall statistics
    const allValues: number[] = [];
    questionAnalyses.forEach((qa) => {
      if (qa.type === "choice") {
        const qAnswers = answersByQuestion.get(qa.questionId) || [];
        qAnswers.forEach((a) => {
          if (a.scoreValue !== undefined) allValues.push(a.scoreValue);
        });
      }
    });

    const overallAverage =
      allValues.length > 0
        ? Math.round(
            (allValues.reduce((a, b) => a + b, 0) / allValues.length) * 100
          ) / 100
        : 0;

    const result: SurveyAnalysis = {
      survey: {
        id: survey.id!,
        title: survey.title,
        courseTitle: course?.title,
      },
      summary: {
        respondentCount,
        targetParticipants: course?.targetParticipants || 0,
        responseRate:
          course?.targetParticipants && course.targetParticipants > 0
            ? Math.round((respondentCount / course.targetParticipants) * 100)
            : 0,
        overallAverage,
        overallStdDeviation:
          Math.round(calculateStdDeviation(allValues) * 100) / 100,
      },
      categories,
      questions: questionAnalyses,
    };

    // Map to snake_case for frontend
    const mappedResult = {
      survey: {
        id: result.survey.id,
        title: result.survey.title,
        course_title: result.survey.courseTitle || "",
      },
      summary: {
        respondent_count: result.summary.respondentCount,
        target_participants: result.summary.targetParticipants,
        response_rate: result.summary.responseRate,
        overall_average: result.summary.overallAverage,
        overall_std_deviation: result.summary.overallStdDeviation,
      },
      categories: result.categories.map((c) => ({
        category: c.category,
        label: c.label,
        question_count: c.questionCount,
        response_count: c.responseCount,
        average: c.average,
        std_deviation: c.stdDeviation,
      })),
      questions: result.questions.map((q) => ({
        question_id: q.questionId,
        question_text: q.content,
        question_type: q.type === "choice" ? "scale" : "text",
        category: q.category || "overall",
        response_count: q.responseCount,
        average: q.average,
        median: q.median,
        mode: q.mode,
        std_deviation: q.stdDeviation,
        distribution: q.distribution,
        percentages: q.percentages,
        text_responses: q.textResponses,
      })),
      // Include saved AI analysis results if available
      ai_summary: survey.aiSummary,
      ai_insights: survey.aiInsights,
      ai_recommendations: survey.aiRecommendations,
    };

    return NextResponse.json({
      success: true,
      data: mappedResult,
    });
  } catch (error) {
    console.error("Get analysis error:", error);
    return NextResponse.json(
      { error: "분석 데이터를 가져오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/surveys/[id]/analysis - AI 분석 요청 (새로 실행 및 저장)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get analysis data first (returns snake_case data)
    const analysisResponse = await GET(request, { params });
    const analysisData = await analysisResponse.json();

    if (!analysisData.success) {
      return NextResponse.json(
        { error: analysisData.error },
        { status: analysisResponse.status }
      );
    }

    // analysisData.data is already in snake_case format from GET
    const snakeCaseData = analysisData.data;

    const surveyInfo = `
교육과정: ${snakeCaseData.survey.course_title || "N/A"}
설문 제목: ${snakeCaseData.survey.title}
응답자 수: ${snakeCaseData.summary.respondent_count}명
응답률: ${snakeCaseData.summary.response_rate}%
전체 평균: ${snakeCaseData.summary.overall_average}점 (5점 만점)
표준편차: ${snakeCaseData.summary.overall_std_deviation}
`;

    const categoryInfo = snakeCaseData.categories
      .map(
        (c: { label: string; average: number; std_deviation: number }) =>
          `- ${c.label}: ${c.average}점 (표준편차 ${c.std_deviation})`
      )
      .join("\n");

    const questionInfo = snakeCaseData.questions
      .filter((q: { question_type: string }) => q.question_type === "scale")
      .map(
        (q: {
          question_text: string;
          average?: number;
          response_count: number;
          std_deviation?: number;
        }) =>
          `- ${q.question_text}: ${q.average}점 (응답 ${q.response_count}명, 표준편차 ${q.std_deviation})`
      )
      .join("\n");

    const textResponses = snakeCaseData.questions
      .filter(
        (q: { question_type: string; text_responses?: string[] }) =>
          q.question_type === "text" && q.text_responses?.length
      )
      .map(
        (q: { question_text: string; text_responses?: string[] }) =>
          `[${q.question_text}]\n${q.text_responses?.slice(0, 10).join("\n")}`
      )
      .join("\n\n");

    const prompt = `당신은 HRD(인적자원개발) 및 기업교육 분야의 전문 컨설턴트입니다.
아래 제공된 교육 만족도 설문조사 결과를 심층 분석하여 교육 담당자에게 실질적인 가치를 제공하는 분석 리포트를 작성해주세요.

=== 설문 기본 정보 ===
${surveyInfo}

=== 카테고리별 분석 결과 ===
${categoryInfo}

=== 문항별 상세 점수 ===
${questionInfo}

${textResponses ? `=== 서술형 응답 (학습자 직접 의견) ===\n${textResponses}` : ""}

=== 분석 요청사항 ===
위 데이터를 바탕으로 다음 JSON 형식으로 상세한 분석 결과를 작성해주세요.

{
  "summary": "종합 평가 (350-500자 이내로 작성)\\n\\n1. 전반적 만족도 수준과 그 의미를 해석해주세요.\\n2. 각 영역(종합만족도, 교육내용, 강사만족도 등)의 점수를 비교 분석하고, **특히 우수한 영역**과 **개선이 필요한 영역**을 명확히 구분해주세요.\\n3. 표준편차를 통해 응답의 일관성(의견 일치 정도)을 해석해주세요.\\n4. 서술형 응답이 있다면 학습자들의 실제 의견을 반영하여 요약해주세요.\\n5. 적절한 곳에 줄바꿈(\\n)을 사용하여 가독성을 높여주세요.",
  "insights": [
    "**[데이터 기반 발견점 1]**: 카테고리별 점수 차이, 표준편차 패턴, 문항별 응답 분포 등 정량적 데이터에서 발견된 의미 있는 패턴을 구체적 수치와 함께 설명 (80-120자)",
    "**[학습자 반응 분석 2]**: 서술형 응답에서 드러난 학습자들의 공통적인 반응, 기대, 불만 사항 등을 구체적으로 인용하며 분석 (80-120자)",
    "**[비교 분석 3]**: 영역 간 점수 격차의 의미, 높은/낮은 점수 문항의 특징, 응답 일관성 등을 분석 (80-120자)",
    "**[심층 해석 4]**: 위 데이터들을 종합하여 이 교육의 핵심 강점과 보완점을 도출 (80-120자)",
    "**[추가 인사이트 5]**: 응답률, 참여도, 또는 특이 패턴 등 추가로 주목할 만한 점 (80-120자)"
  ],
  "recommendations": [
    "**[즉시 실행 가능한 개선안 1]**: 가장 점수가 낮은 영역에 대한 구체적이고 실행 가능한 개선 방안 제시 (100-150자)",
    "**[교육 콘텐츠 개선안 2]**: 교육 내용의 질적 향상을 위한 구체적 제안 (학습자 의견 반영) (100-150자)",
    "**[강사/운영 개선안 3]**: 강사 역량 강화 또는 교육 운영 방식 개선을 위한 제안 (100-150자)",
    "**[중장기 개선안 4]**: 지속적인 교육 품질 향상을 위한 체계적 접근 방안 (100-150자)",
    "**[후속 조치 제안 5]**: 추가 분석이 필요한 부분이나 후속 설문/인터뷰 등 권장 사항 (100-150자)"
  ]
}

=== 작성 지침 ===
1. summary는 **볼드체**를 사용하여 핵심 키워드를 강조하고, 적절한 줄바꿈(\\n)으로 문단을 구분하세요.
2. insights와 recommendations의 각 항목은 **[소제목]**: 내용 형식으로 작성하세요.
3. 모든 분석은 제공된 실제 데이터와 서술형 응답을 기반으로 작성하고, 구체적인 수치나 응답 내용을 인용하세요.
4. 추상적인 표현보다는 구체적이고 실행 가능한 내용을 작성하세요.
5. 반드시 유효한 JSON 형식으로만 응답하세요. JSON 외의 설명은 불필요합니다.`;

    const aiResponse = await generateWithGemini(prompt);

    let aiResult: {
      summary: string;
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

    // Save AI analysis results to Firebase
    await updateSurvey(id, {
      aiSummary: aiResult.summary,
      aiInsights: aiResult.insights,
      aiRecommendations: aiResult.recommendations,
      aiAnalyzedAt: Timestamp.now(),
    });

    // snakeCaseData is already in snake_case format from GET, just add AI results
    const mappedAnalysis = {
      ...snakeCaseData,
      ai_summary: aiResult.summary,
      ai_insights: aiResult.insights,
      ai_recommendations: aiResult.recommendations,
    };

    return NextResponse.json({
      success: true,
      data: mappedAnalysis,
    });
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "AI 분석에 실패했습니다" },
      { status: 500 }
    );
  }
}
