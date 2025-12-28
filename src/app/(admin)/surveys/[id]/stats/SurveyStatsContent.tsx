"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface QuestionStats {
  question_id: string;
  question_text: string;
  question_type: string;
  category: string;
  response_count: number;
  average?: number;
  distribution?: Record<number, number>;
  text_responses?: string[];
}

interface SurveyStats {
  survey: {
    id: string;
    title: string;
    status: string;
    course_title: string;
  };
  summary: {
    respondent_count: number;
    target_participants: number;
    response_rate: number;
    overall_average: number;
    question_count: number;
  };
  category_averages: Record<string, number>;
  questions: QuestionStats[];
}

const CATEGORY_LABELS: Record<string, string> = {
  overall: "종합만족도",
  content: "교육내용",
  instructor: "강사만족도",
  facility: "교육환경",
  other: "기타",
};

interface SurveyStatsContentProps {
  surveyId: string;
}

export default function SurveyStatsContent({
  surveyId,
}: SurveyStatsContentProps) {
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) setRefreshing(true);
      try {
        const response = await fetch(`/api/surveys/${surveyId}/stats`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "통계를 불러올 수 없습니다");
          return;
        }

        setStats(data.data);
        setError("");
      } catch {
        setError("오류가 발생했습니다");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [surveyId]
  );

  useEffect(() => {
    fetchStats();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--color-muted)]">통계 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {error || "통계를 찾을 수 없습니다"}
          </p>
          <Link href="/surveys" className="btn-primary">
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
            href={`/surveys/${surveyId}`}
            className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          >
            {stats.survey.title}
          </Link>
          <span className="text-[var(--color-muted)]">/</span>
          <span className="text-[var(--color-foreground)] font-medium">
            실시간 통계
          </span>
        </div>
        <div className="flex items-center gap-2">
          {refreshing && (
            <span className="text-xs text-[var(--color-muted)]">
              새로고침 중...
            </span>
          )}
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="btn-ghost text-sm py-2 px-4"
          >
            새로고침
          </button>
        </div>
      </header>

      <main className="px-4 pb-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Respondents */}
          <div className="glass-card p-6 text-center">
            <div className="text-4xl font-bold text-[var(--color-primary)] mb-1">
              {stats.summary.respondent_count}
            </div>
            <div className="text-sm text-[var(--color-muted)]">응답자 수</div>
            {stats.summary.target_participants > 0 && (
              <div className="text-xs text-[var(--color-muted)] mt-1">
                / {stats.summary.target_participants}명 목표
              </div>
            )}
          </div>

          {/* Response Rate */}
          <div className="glass-card p-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-1">
              {stats.summary.response_rate}%
            </div>
            <div className="text-sm text-[var(--color-muted)]">응답률</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(stats.summary.response_rate, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Overall Average */}
          <div className="glass-card p-6 text-center">
            <div className="text-4xl font-bold text-blue-600 mb-1">
              {(stats.summary.overall_average ?? 0).toFixed(1)}
            </div>
            <div className="text-sm text-[var(--color-muted)]">평균 점수</div>
            <div className="text-xs text-[var(--color-muted)] mt-1">
              / 5.0점
            </div>
          </div>

          {/* Questions */}
          <div className="glass-card p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-1">
              {stats.summary.question_count}
            </div>
            <div className="text-sm text-[var(--color-muted)]">문항 수</div>
          </div>
        </div>

        {/* Category Averages */}
        {Object.keys(stats.category_averages).length > 0 && (
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-bold text-[var(--color-foreground)] mb-4">
              카테고리별 평균
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.category_averages).map(
                ([category, average]) => (
                  <div key={category} className="text-center">
                    <div className="text-2xl font-bold text-[var(--color-primary)]">
                      {(average ?? 0).toFixed(1)}
                    </div>
                    <div className="text-sm text-[var(--color-muted)]">
                      {CATEGORY_LABELS[category] || category}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-[var(--color-primary)] h-1.5 rounded-full"
                        style={{ width: `${(average / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Question Details */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-[var(--color-foreground)] mb-4">
            문항별 상세 결과
          </h3>
          <div className="space-y-6">
            {stats.questions.map((q, index) => (
              <div
                key={q.question_id}
                className="border-b border-gray-100 pb-6 last:border-0 last:pb-0"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 mr-2">
                      {CATEGORY_LABELS[q.category] || q.category}
                    </span>
                    <p className="text-[var(--color-foreground)] font-medium mt-1">
                      {q.question_text}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-[var(--color-muted)]">
                      {q.response_count}명 응답
                    </span>
                  </div>
                </div>

                {q.question_type === "scale" && q.distribution && (
                  <div className="ml-11">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-2xl font-bold text-[var(--color-primary)]">
                        {q.average?.toFixed(1)}
                      </span>
                      <span className="text-sm text-[var(--color-muted)]">
                        / 5.0
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((score) => {
                        const count = q.distribution?.[score] || 0;
                        const percentage =
                          q.response_count > 0
                            ? Math.round((count / q.response_count) * 100)
                            : 0;
                        return (
                          <div key={score} className="flex-1">
                            <div className="h-16 bg-gray-100 rounded relative flex items-end">
                              <div
                                className="w-full bg-[var(--color-primary)] rounded transition-all"
                                style={{ height: `${percentage}%` }}
                              />
                            </div>
                            <div className="text-center mt-1">
                              <div className="text-xs font-medium">
                                {score}점
                              </div>
                              <div className="text-xs text-[var(--color-muted)]">
                                {count}명
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {q.question_type === "text" &&
                  q.text_responses &&
                  q.text_responses.length > 0 && (
                    <div className="ml-11 mt-2">
                      <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                        {q.text_responses.slice(0, 5).map((text, i) => (
                          <div
                            key={i}
                            className="text-sm text-gray-700 mb-2 pb-2 border-b border-gray-200 last:border-0"
                          >
                            &ldquo;{text}&rdquo;
                          </div>
                        ))}
                        {q.text_responses.length > 5 && (
                          <div className="text-xs text-[var(--color-muted)] text-center mt-2">
                            외 {q.text_responses.length - 5}개 응답
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
