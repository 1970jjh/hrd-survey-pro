"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface SurveyAnalysis {
  id: string;
  title: string;
  status: string;
  respondent_count: number;
  average: number;
  std_deviation: number;
}

interface CategoryAnalysis {
  category: string;
  label: string;
  average: number;
  std_deviation: number;
  response_count: number;
}

interface CourseAnalysis {
  course: {
    id: string;
    title: string;
    instructor: string | null;
  };
  summary: {
    survey_count: number;
    total_respondents: number;
    target_participants: number;
    response_rate: number;
    overall_average: number;
    overall_std_deviation: number;
  };
  surveys: SurveyAnalysis[];
  categories: CategoryAnalysis[];
  ai_summary?: string;
  ai_strengths?: string[];
  ai_weaknesses?: string[];
  ai_insights?: string[];
  ai_recommendations?: string[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "임시저장", color: "bg-gray-100 text-gray-600" },
  active: { label: "진행중", color: "bg-green-100 text-green-600" },
  closed: { label: "종료", color: "bg-red-100 text-red-600" },
};

interface CourseAnalysisContentProps {
  courseId: string;
}

export default function CourseAnalysisContent({
  courseId,
}: CourseAnalysisContentProps) {
  const [analysis, setAnalysis] = useState<CourseAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/analysis`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "분석 데이터를 불러올 수 없습니다");
        return;
      }

      setAnalysis(data.data);
      setError("");
    } catch {
      setError("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  const runAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/analysis`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "AI 분석에 실패했습니다");
        return;
      }

      setAnalysis(data.data);
    } catch {
      setError("AI 분석 중 오류가 발생했습니다");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--color-muted)]">분석 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {error || "분석 데이터를 찾을 수 없습니다"}
          </p>
          <Link href="/courses" className="btn-primary">
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-card mx-4 mt-4 mb-6 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold text-[var(--color-primary)]">
              HRD Survey Pro
            </h1>
          </Link>
          <span className="text-[var(--color-muted)]">/</span>
          <Link
            href="/courses"
            className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          >
            교육과정 관리
          </Link>
          <span className="text-[var(--color-muted)]">/</span>
          <span className="text-[var(--color-foreground)] font-medium">
            {analysis.course.title} - 통합 분석
          </span>
        </div>
        <Link href="/courses" className="btn-ghost text-sm py-2 px-4">
          목록으로
        </Link>
      </header>

      <main className="px-4 pb-8">
        {/* Course Info */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
            {analysis.course.title}
          </h2>
          {analysis.course.instructor && (
            <p className="text-[var(--color-muted)]">
              강사: {analysis.course.instructor}
            </p>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-[var(--color-primary)]">
              {analysis.summary.survey_count}
            </div>
            <div className="text-sm text-[var(--color-muted)]">설문 수</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-indigo-600">
              {analysis.summary.total_respondents}
            </div>
            <div className="text-sm text-[var(--color-muted)]">총 응답자</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {analysis.summary.response_rate}%
            </div>
            <div className="text-sm text-[var(--color-muted)]">응답률</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {(analysis.summary.overall_average ?? 0).toFixed(2)}
            </div>
            <div className="text-sm text-[var(--color-muted)]">평균 점수</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {(analysis.summary.overall_std_deviation ?? 0).toFixed(2)}
            </div>
            <div className="text-sm text-[var(--color-muted)]">표준편차</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {analysis.summary.target_participants}
            </div>
            <div className="text-sm text-[var(--color-muted)]">목표 인원</div>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[var(--color-foreground)]">
              AI 통합 분석
            </h3>
            {!analysis.ai_summary && analysis.summary.survey_count > 0 && (
              <button
                onClick={runAIAnalysis}
                disabled={aiLoading}
                className="btn-primary text-sm py-2 px-4"
              >
                {aiLoading ? "분석 중..." : "AI 분석 실행"}
              </button>
            )}
          </div>

          {aiLoading && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="text-blue-700">
                AI가 전체 과정의 설문 결과를 통합 분석하고 있습니다...
              </span>
            </div>
          )}

          {analysis.ai_summary && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <h4 className="font-semibold text-[var(--color-foreground)] mb-2">
                  종합 평가
                </h4>
                <p className="text-[var(--color-foreground)]">
                  {analysis.ai_summary}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Strengths */}
                {analysis.ai_strengths && analysis.ai_strengths.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">강점</h4>
                    <ul className="space-y-2">
                      {analysis.ai_strengths.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-green-700"
                        >
                          <span className="text-green-500 mt-1">+</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {analysis.ai_weaknesses &&
                  analysis.ai_weaknesses.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h4 className="font-semibold text-red-800 mb-2">
                        개선 필요 영역
                      </h4>
                      <ul className="space-y-2">
                        {analysis.ai_weaknesses.map((item, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-red-700"
                          >
                            <span className="text-red-500 mt-1">-</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>

              {/* Insights */}
              {analysis.ai_insights && analysis.ai_insights.length > 0 && (
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h4 className="font-semibold text-indigo-800 mb-2">
                    주요 인사이트
                  </h4>
                  <ul className="space-y-2">
                    {analysis.ai_insights.map((insight, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-indigo-700"
                      >
                        <span className="text-indigo-500 mt-1">*</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysis.ai_recommendations &&
                analysis.ai_recommendations.length > 0 && (
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-semibold text-orange-800 mb-2">
                      권장사항
                    </h4>
                    <ul className="space-y-2">
                      {analysis.ai_recommendations.map((rec, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-orange-700"
                        >
                          <span className="text-orange-500 mt-1">{i + 1}.</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}

          {!analysis.ai_summary &&
            !aiLoading &&
            analysis.summary.survey_count === 0 && (
              <p className="text-[var(--color-muted)] text-center py-4">
                이 교육과정에 연결된 설문이 없습니다.
              </p>
            )}

          {!analysis.ai_summary &&
            !aiLoading &&
            analysis.summary.survey_count > 0 && (
              <p className="text-[var(--color-muted)] text-center py-4">
                AI 분석 버튼을 클릭하면 전체 과정에 대한 통합 분석 결과를 확인할
                수 있습니다.
              </p>
            )}
        </div>

        {/* Category Analysis */}
        {analysis.categories.length > 0 && (
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-bold text-[var(--color-foreground)] mb-4">
              카테고리별 분석
            </h3>
            <div className="space-y-4">
              {analysis.categories.map((cat) => (
                <div key={cat.category}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--color-foreground)]">
                      {cat.label}
                    </span>
                    <span className="text-sm text-[var(--color-muted)]">
                      {(cat.average ?? 0).toFixed(2)}점 (응답{" "}
                      {cat.response_count}건)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-[var(--color-primary)] h-4 rounded-full transition-all"
                      style={{ width: `${((cat.average ?? 0) / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Survey List */}
        {analysis.surveys.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-[var(--color-foreground)] mb-4">
              설문별 결과
            </h3>
            <div className="space-y-4">
              {analysis.surveys.map((survey) => (
                <div
                  key={survey.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-[var(--color-foreground)]">
                          {survey.title}
                        </h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[survey.status]?.color || "bg-gray-100 text-gray-600"}`}
                        >
                          {STATUS_LABELS[survey.status]?.label || survey.status}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-muted)]">
                        {survey.respondent_count}명 응답
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-[var(--color-primary)]">
                        {(survey.average ?? 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-[var(--color-muted)]">
                        평균 점수
                      </div>
                    </div>
                    <Link
                      href={`/surveys/${survey.id}/analysis`}
                      className="btn-ghost text-sm py-2 px-3"
                    >
                      상세분석
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
