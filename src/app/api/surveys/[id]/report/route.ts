// HRD Survey Pro - PDF Report Generation API
import { NextRequest, NextResponse } from "next/server";
import {
  getSurvey,
  getCourse,
  getQuestions,
  getResponses,
  timestampToDate,
  Timestamp,
} from "@/lib/firebase";

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

// GET /api/surveys/[id]/report - PDF용 분석 데이터 (JSON 형태)
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

    // Get respondent names for non-anonymous surveys
    const respondentNames = !survey.isAnonymous
      ? responses
          .filter((r) => r.respondentName)
          .map((r) => r.respondentName as string)
      : [];

    // Map to snake_case for frontend
    const result = {
      survey: {
        id: survey.id!,
        title: survey.title,
        course_title: course?.title || "",
        is_anonymous: survey.isAnonymous ?? true,
      },
      course_info: {
        instructor_name: course?.instructor || null,
        start_date: course?.trainingStartDate
          ? timestampToDate(course.trainingStartDate as Timestamp)
              ?.toISOString()
              .split("T")[0] || null
          : null,
        end_date: course?.trainingEndDate
          ? timestampToDate(course.trainingEndDate as Timestamp)
              ?.toISOString()
              .split("T")[0] || null
          : null,
      },
      summary: {
        respondent_count: respondentCount,
        target_participants: course?.targetParticipants || 0,
        response_rate:
          course?.targetParticipants && course.targetParticipants > 0
            ? Math.round((respondentCount / course.targetParticipants) * 100)
            : 0,
        overall_average: overallAverage,
        overall_std_deviation:
          Math.round(calculateStdDeviation(allValues) * 100) / 100,
      },
      categories: categories.map((c) => ({
        category: c.category,
        label: c.label,
        question_count: c.questionCount,
        response_count: c.responseCount,
        average: c.average,
        std_deviation: c.stdDeviation,
      })),
      questions: questionAnalyses.map((q) => ({
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
      generated_at: new Date().toISOString(),
      // Include saved AI analysis results if available
      ai_summary: survey.aiSummary,
      ai_insights: survey.aiInsights,
      ai_recommendations: survey.aiRecommendations,
      // For non-anonymous surveys, include respondent names
      respondent_names: respondentNames,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get report data error:", error);
    return NextResponse.json(
      { error: "리포트 데이터를 가져오는데 실패했습니다" },
      { status: 500 }
    );
  }
}
