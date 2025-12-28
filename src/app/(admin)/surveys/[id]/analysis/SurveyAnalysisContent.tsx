"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface QuestionAnalysis {
  question_id: string;
  question_text: string;
  question_type: string;
  category: string;
  response_count: number;
  average?: number;
  median?: number;
  mode?: number;
  std_deviation?: number;
  distribution?: Record<number, number>;
  percentages?: Record<number, number>;
  text_responses?: string[];
}

interface CategoryAnalysis {
  category: string;
  label: string;
  question_count: number;
  response_count: number;
  average: number;
  std_deviation: number;
}

interface SurveyAnalysis {
  survey: {
    id: string;
    title: string;
    course_title: string;
  };
  summary: {
    respondent_count: number;
    target_participants: number;
    response_rate: number;
    overall_average: number;
    overall_std_deviation: number;
  };
  categories: CategoryAnalysis[];
  questions: QuestionAnalysis[];
  ai_summary?: string;
  ai_insights?: string[];
  ai_recommendations?: string[];
}

const CATEGORY_LABELS: Record<string, string> = {
  overall: "종합만족도",
  content: "교육내용",
  instructor: "강사만족도",
  facility: "교육환경",
  other: "기타",
};

interface SurveyAnalysisContentProps {
  surveyId: string;
}

export default function SurveyAnalysisContent({
  surveyId,
}: SurveyAnalysisContentProps) {
  const [analysis, setAnalysis] = useState<SurveyAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}/analysis`);
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
  }, [surveyId]);

  const runAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}/analysis`, {
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
          <Link href="/surveys" className="btn-primary">
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  const scaleQuestions = analysis.questions.filter(
    (q) => q.question_type === "scale"
  );
  const textQuestions = analysis.questions.filter(
    (q) => q.question_type === "text" && q.text_responses?.length
  );

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
            {analysis.survey.title}
          </Link>
          <span className="text-[var(--color-muted)]">/</span>
          <span className="text-[var(--color-foreground)] font-medium">
            결과 분석
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/surveys/${surveyId}/stats`}
            className="btn-ghost text-sm py-2 px-4"
          >
            실시간 통계
          </Link>
          <Link
            href={`/surveys/${surveyId}/report`}
            className="btn-primary text-sm py-2 px-4"
          >
            PDF 다운로드
          </Link>
        </div>
      </header>

      <main className="px-4 pb-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-[var(--color-primary)]">
              {analysis.summary.respondent_count}
            </div>
            <div className="text-sm text-[var(--color-muted)]">응답자</div>
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
              {analysis.questions.length}
            </div>
            <div className="text-sm text-[var(--color-muted)]">문항 수</div>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[var(--color-foreground)]">
              AI 분석 결과
            </h3>
            <button
              onClick={runAIAnalysis}
              disabled={aiLoading}
              className={`text-sm py-2 px-4 ${analysis.ai_summary ? "btn-secondary" : "btn-primary"}`}
            >
              {aiLoading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  분석 중...
                </span>
              ) : analysis.ai_summary ? (
                "AI 분석 다시 실행"
              ) : (
                "AI 분석 실행"
              )}
            </button>
          </div>

          {aiLoading && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="text-blue-700">
                AI가 설문 결과를 분석하고 있습니다...
              </span>
            </div>
          )}

          {analysis.ai_summary && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                <h4 className="font-bold text-[var(--color-foreground)] mb-3 text-base flex items-center gap-2">
                  <span className="text-xl">📊</span> 종합 평가
                </h4>
                <div
                  className="text-[var(--color-foreground)] leading-relaxed whitespace-pre-line"
                  dangerouslySetInnerHTML={{
                    __html: analysis.ai_summary
                      .replace(
                        /\*\*(.+?)\*\*/g,
                        '<strong class="font-semibold text-blue-800">$1</strong>'
                      )
                      .replace(/\n/g, "<br />"),
                  }}
                />
              </div>

              {/* Insights */}
              {analysis.ai_insights && analysis.ai_insights.length > 0 && (
                <div className="p-5 bg-green-50 rounded-lg border border-green-100">
                  <h4 className="font-bold text-green-800 mb-3 text-base flex items-center gap-2">
                    <span className="text-xl">💡</span> 주요 인사이트
                  </h4>
                  <ul className="space-y-3">
                    {analysis.ai_insights.map((insight, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-green-700"
                      >
                        <span className="flex-shrink-0 w-6 h-6 bg-green-200 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                          {i + 1}
                        </span>
                        <span
                          className="flex-1 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: insight
                              .replace(
                                /\*\*\[(.+?)\]\*\*/g,
                                '<strong class="font-semibold text-green-800">[$1]</strong>'
                              )
                              .replace(
                                /\*\*(.+?)\*\*/g,
                                '<strong class="font-semibold">$1</strong>'
                              ),
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysis.ai_recommendations &&
                analysis.ai_recommendations.length > 0 && (
                  <div className="p-5 bg-orange-50 rounded-lg border border-orange-100">
                    <h4 className="font-bold text-orange-800 mb-3 text-base flex items-center gap-2">
                      <span className="text-xl">🎯</span> 개선 권장사항
                    </h4>
                    <ul className="space-y-3">
                      {analysis.ai_recommendations.map((rec, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-orange-700"
                        >
                          <span className="flex-shrink-0 w-6 h-6 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center text-sm font-medium">
                            {i + 1}
                          </span>
                          <span
                            className="flex-1 leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: rec
                                .replace(
                                  /\*\*\[(.+?)\]\*\*/g,
                                  '<strong class="font-semibold text-orange-800">[$1]</strong>'
                                )
                                .replace(
                                  /\*\*(.+?)\*\*/g,
                                  '<strong class="font-semibold">$1</strong>'
                                ),
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}

          {!analysis.ai_summary && !aiLoading && (
            <p className="text-[var(--color-muted)] text-center py-4">
              AI 분석 버튼을 클릭하면 설문 결과에 대한 인사이트와 개선
              권장사항을 확인할 수 있습니다.
            </p>
          )}
        </div>

        {/* Category Analysis Section */}
        <div className="glass-card p-6 mb-6">
          <h3 className="text-lg font-bold text-[var(--color-foreground)] mb-6">
            카테고리별 분석
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Category Bars */}
            <div className="space-y-4">
              {analysis.categories.map((cat) => (
                <div key={cat.category}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--color-foreground)]">
                      {cat.label}
                    </span>
                    <span className="text-sm text-[var(--color-muted)]">
                      {(cat.average ?? 0).toFixed(2)}점 (±
                      {(cat.std_deviation ?? 0).toFixed(2)})
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-[var(--color-primary)] h-4 rounded-full transition-all relative"
                      style={{ width: `${((cat.average ?? 0) / 5) * 100}%` }}
                    >
                      <span className="absolute right-2 text-xs text-white font-medium leading-4">
                        {cat.question_count}문항
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Category Stats Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">카테고리</th>
                    <th className="text-right py-2">문항</th>
                    <th className="text-right py-2">평균</th>
                    <th className="text-right py-2">표준편차</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.categories.map((cat) => (
                    <tr key={cat.category} className="border-b border-gray-100">
                      <td className="py-2">{cat.label}</td>
                      <td className="text-right py-2">{cat.question_count}</td>
                      <td className="text-right py-2 font-medium">
                        {(cat.average ?? 0).toFixed(2)}
                      </td>
                      <td className="text-right py-2 text-[var(--color-muted)]">
                        {(cat.std_deviation ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Question Analysis Section */}
        {scaleQuestions.length > 0 && (
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-bold text-[var(--color-foreground)] mb-6">
              문항별 상세 분석
            </h3>

            <div className="space-y-6">
              {scaleQuestions.map((q, index) => (
                <div
                  key={q.question_id}
                  className="border-b border-gray-100 pb-6 last:border-0"
                >
                  <div className="flex items-start gap-3 mb-4">
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
                  </div>

                  <div className="ml-11 grid md:grid-cols-2 gap-4">
                    {/* Statistics */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-blue-50 rounded">
                        <div className="text-lg font-bold text-blue-600">
                          {q.average?.toFixed(2)}
                        </div>
                        <div className="text-xs text-blue-600">평균</div>
                      </div>
                      <div className="p-2 bg-green-50 rounded">
                        <div className="text-lg font-bold text-green-600">
                          {q.median}
                        </div>
                        <div className="text-xs text-green-600">중앙값</div>
                      </div>
                      <div className="p-2 bg-purple-50 rounded">
                        <div className="text-lg font-bold text-purple-600">
                          {q.mode}
                        </div>
                        <div className="text-xs text-purple-600">최빈값</div>
                      </div>
                      <div className="p-2 bg-orange-50 rounded">
                        <div className="text-lg font-bold text-orange-600">
                          {q.std_deviation}
                        </div>
                        <div className="text-xs text-orange-600">표준편차</div>
                      </div>
                    </div>

                    {/* Distribution Chart */}
                    {q.distribution && (
                      <div className="flex gap-2 items-end">
                        {[1, 2, 3, 4, 5].map((score) => {
                          const count = q.distribution?.[score] || 0;
                          const pct = q.percentages?.[score] || 0;
                          return (
                            <div key={score} className="flex-1">
                              <div className="h-20 bg-gray-100 rounded relative flex items-end">
                                <div
                                  className={`w-full rounded transition-all ${
                                    score >= 4
                                      ? "bg-green-500"
                                      : score >= 3
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{ height: `${Math.max(pct, 5)}%` }}
                                />
                              </div>
                              <div className="text-center mt-1">
                                <div className="text-xs font-medium">
                                  {score}점
                                </div>
                                <div className="text-xs text-[var(--color-muted)]">
                                  {count}명 ({pct}%)
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text Responses Section */}
        {textQuestions.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-[var(--color-foreground)] mb-6">
              서술형 응답
            </h3>

            <div className="space-y-6">
              {textQuestions.map((q, index) => (
                <div
                  key={q.question_id}
                  className="border-b border-gray-100 pb-6 last:border-0"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-[var(--color-foreground)] font-medium">
                        {q.question_text}
                      </p>
                      <span className="text-sm text-[var(--color-muted)]">
                        {q.text_responses?.length || 0}개 응답
                      </span>
                    </div>
                  </div>

                  <div className="ml-11 bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {q.text_responses?.map((text, i) => (
                      <div
                        key={i}
                        className="text-sm text-gray-700 mb-3 pb-3 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0"
                      >
                        <span className="text-gray-400 mr-2">#{i + 1}</span>
                        {text}
                      </div>
                    ))}
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
