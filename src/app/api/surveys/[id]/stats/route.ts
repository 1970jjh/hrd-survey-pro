// HRD Survey Pro - Survey Statistics API
import { NextRequest, NextResponse } from "next/server";
import {
  getSurvey,
  getQuestions,
  getResponses,
  getCourse,
} from "@/lib/firebase";

type RouteParams = { params: Promise<{ id: string }> };

interface QuestionStats {
  questionId: string;
  content: string;
  type: string;
  category?: string;
  responseCount: number;
  average?: number;
  distribution?: Record<number, number>;
  textResponses?: string[];
}

// GET /api/surveys/[id]/stats - 설문 통계 조회
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

    // Get course info if exists
    let course = null;
    if (survey.courseId) {
      course = await getCourse(survey.courseId);
    }

    // Get questions
    const questions = await getQuestions(id);

    // Get all responses
    const responses = await getResponses(id);

    // Calculate unique respondents
    const respondentCount = responses.length;

    // Create a map of answers by question
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

    // Calculate stats for each question
    const questionStats: QuestionStats[] = questions.map((q) => {
      const questionAnswers = answersByQuestion.get(q.id!) || [];

      if (q.type === "choice") {
        const values = questionAnswers
          .filter((a) => a.scoreValue !== undefined)
          .map((a) => a.scoreValue as number);

        const average =
          values.length > 0
            ? values.reduce((a, b) => a + b, 0) / values.length
            : 0;

        // Calculate distribution based on scale type
        const distribution: Record<number, number> = {};
        const scaleMax = survey.scaleType || 5;
        for (let i = 1; i <= scaleMax; i++) {
          distribution[i] = values.filter((v) => v === i).length;
        }

        return {
          questionId: q.id!,
          content: q.content,
          type: q.type,
          category: q.category,
          responseCount: values.length,
          average: Math.round(average * 100) / 100,
          distribution,
        };
      } else if (q.type === "text") {
        const textResponses = questionAnswers
          .filter((a) => a.textValue)
          .map((a) => a.textValue as string);

        return {
          questionId: q.id!,
          content: q.content,
          type: q.type,
          category: q.category,
          responseCount: textResponses.length,
          textResponses,
        };
      }

      return {
        questionId: q.id!,
        content: q.content,
        type: q.type,
        category: q.category,
        responseCount: questionAnswers.length,
      };
    });

    // Calculate category averages
    const categoryAverages: Record<string, { average: number; count: number }> =
      {};
    questionStats.forEach((qs) => {
      if (qs.type === "choice" && qs.average !== undefined && qs.category) {
        if (!categoryAverages[qs.category]) {
          categoryAverages[qs.category] = { average: 0, count: 0 };
        }
        categoryAverages[qs.category].average += qs.average;
        categoryAverages[qs.category].count += 1;
      }
    });

    Object.keys(categoryAverages).forEach((cat) => {
      if (categoryAverages[cat].count > 0) {
        categoryAverages[cat].average =
          Math.round(
            (categoryAverages[cat].average / categoryAverages[cat].count) * 100
          ) / 100;
      }
    });

    // Calculate overall average
    const choiceQuestions = questionStats.filter(
      (q) => q.type === "choice" && q.average !== undefined
    );
    const overallAverage =
      choiceQuestions.length > 0
        ? Math.round(
            (choiceQuestions.reduce((sum, q) => sum + (q.average || 0), 0) /
              choiceQuestions.length) *
              100
          ) / 100
        : 0;

    // Response rate
    const targetParticipants = course?.targetParticipants || 0;
    const responseRate =
      targetParticipants > 0
        ? Math.round((respondentCount / targetParticipants) * 100)
        : 0;

    // Map to UI expected format (snake_case)
    const mappedQuestions = questionStats.map((q) => ({
      question_id: q.questionId,
      question_text: q.content,
      question_type: q.type === "choice" ? "scale" : "text",
      category: q.category || "overall",
      response_count: q.responseCount,
      average: q.average,
      distribution: q.distribution,
      text_responses: q.textResponses,
    }));

    return NextResponse.json({
      success: true,
      data: {
        survey: {
          id: survey.id,
          title: survey.title,
          status: survey.status,
          course_title: course?.title || "",
        },
        summary: {
          respondent_count: respondentCount,
          target_participants: targetParticipants,
          response_rate: responseRate,
          overall_average: overallAverage,
          question_count: questions.length,
        },
        category_averages: Object.fromEntries(
          Object.entries(categoryAverages).map(([cat, data]) => [
            cat,
            data.average,
          ])
        ),
        questions: mappedQuestions,
      },
    });
  } catch (error) {
    console.error("Get survey stats error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
