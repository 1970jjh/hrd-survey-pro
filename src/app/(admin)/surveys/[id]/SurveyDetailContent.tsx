"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
  instructor: string | null;
  objectives: string | null;
  content: string | null;
  training_date: string | null;
}

interface Question {
  id: string;
  category: string;
  question_text: string;
  question_type: "scale" | "multiple_choice" | "text";
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  scale_labels?: { min?: string; max?: string };
  is_required: boolean;
  order_num: number;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  url_code: string;
  status: "draft" | "active" | "closed";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  courses: Course;
  questions: Question[];
}

const STATUS_LABELS = {
  draft: { label: "임시저장", color: "bg-gray-100 text-gray-600" },
  active: { label: "진행중", color: "bg-green-100 text-green-600" },
  closed: { label: "종료", color: "bg-red-100 text-red-600" },
};

const CATEGORY_LABELS: Record<string, string> = {
  overall: "종합만족도",
  content: "교육내용",
  instructor: "강사만족도",
  facility: "교육환경",
  other: "기타",
};

interface SurveyDetailContentProps {
  surveyId: string;
}

export default function SurveyDetailContent({
  surveyId,
}: SurveyDetailContentProps) {
  const router = useRouter();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchSurvey = useCallback(async () => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "설문을 불러올 수 없습니다");
        return;
      }

      setSurvey(data.data);
    } catch (error) {
      setError("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  const handleStatusChange = async (
    newStatus: "draft" | "active" | "closed"
  ) => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "상태 변경에 실패했습니다");
        return;
      }

      fetchSurvey();
    } catch (error) {
      console.error("Failed to change status:", error);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "정말 이 설문을 삭제하시겠습니까? 모든 응답 데이터도 함께 삭제됩니다."
      )
    )
      return;

    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push("/surveys");
      }
    } catch (error) {
      console.error("Failed to delete survey:", error);
    }
  };

  const copyUrl = () => {
    if (!survey) return;
    const url = `${window.location.origin}/s/${survey.url_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {error || "설문을 찾을 수 없습니다"}
          </p>
          <Link href="/surveys" className="btn-primary">
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  const surveyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/s/${survey.url_code}`;

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
            href="/surveys"
            className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
          >
            설문 관리
          </Link>
          <span className="text-[var(--color-muted)]">/</span>
          <span className="text-[var(--color-foreground)] font-medium truncate max-w-[200px]">
            {survey.title}
          </span>
        </div>
        <Link href="/surveys" className="btn-ghost text-sm py-2 px-4">
          목록으로
        </Link>
      </header>

      <main className="px-4 pb-8">
        {/* Survey Info Card */}
        <div className="glass-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-[var(--color-foreground)]">
                  {survey.title}
                </h2>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${STATUS_LABELS[survey.status].color}`}
                >
                  {STATUS_LABELS[survey.status].label}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-[var(--color-muted)]">
                <span>📚 {survey.courses?.title}</span>
                {survey.courses?.instructor && (
                  <span>👨‍🏫 {survey.courses.instructor}</span>
                )}
                <span>📋 {survey.questions?.length || 0}개 문항</span>
                <span>
                  📅 생성일:{" "}
                  {new Date(survey.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {survey.status !== "draft" && (
                <>
                  <Link
                    href={`/surveys/${survey.id}/stats`}
                    className="btn-secondary text-sm"
                  >
                    실시간 통계
                  </Link>
                  <Link
                    href={`/surveys/${survey.id}/analysis`}
                    className="btn-secondary text-sm"
                  >
                    상세 분석
                  </Link>
                  <Link
                    href={`/surveys/${survey.id}/report`}
                    className="btn-primary text-sm"
                  >
                    PDF 리포트
                  </Link>
                </>
              )}
              {survey.status === "draft" && (
                <button
                  onClick={() => handleStatusChange("active")}
                  className="btn-primary text-sm"
                >
                  설문 활성화
                </button>
              )}
              {survey.status === "active" && (
                <button
                  onClick={() => handleStatusChange("closed")}
                  className="btn-ghost text-sm text-orange-500"
                >
                  설문 종료
                </button>
              )}
              {survey.status === "closed" && (
                <button
                  onClick={() => handleStatusChange("active")}
                  className="btn-secondary text-sm"
                >
                  재개
                </button>
              )}
              <button
                onClick={handleDelete}
                className="btn-ghost text-sm text-red-500"
              >
                삭제
              </button>
            </div>
          </div>

          {survey.description && (
            <p className="text-[var(--color-muted)] mb-4">
              {survey.description}
            </p>
          )}

          {/* URL & QR Section */}
          {survey.status !== "draft" && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex flex-col md:flex-row gap-6">
                {/* URL Section */}
                <div className="flex-1">
                  <h3 className="font-medium text-[var(--color-foreground)] mb-2">
                    설문 링크
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={surveyUrl}
                      readOnly
                      className="input-field flex-1 text-sm"
                    />
                    <button
                      onClick={copyUrl}
                      className="btn-secondary text-sm whitespace-nowrap"
                    >
                      {copied ? "복사됨!" : "복사"}
                    </button>
                  </div>
                  <a
                    href={surveyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    새 탭에서 열기 →
                  </a>
                </div>

                {/* QR Code Section */}
                <div className="flex flex-col items-center">
                  <h3 className="font-medium text-[var(--color-foreground)] mb-2">
                    QR 코드
                  </h3>
                  <img
                    src={`/api/surveys/${survey.id}/qrcode?format=dataurl&size=150`}
                    alt="QR Code"
                    className="w-[150px] h-[150px] bg-white rounded-lg shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="flex gap-2 mt-2">
                    <a
                      href={`/api/surveys/${survey.id}/qrcode?format=png&size=300`}
                      download={`survey-qr-${survey.url_code}.png`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      PNG 다운로드
                    </a>
                    <span className="text-gray-300">|</span>
                    <a
                      href={`/api/surveys/${survey.id}/qrcode?format=svg&size=300`}
                      download={`survey-qr-${survey.url_code}.svg`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      SVG 다운로드
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Questions Section */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[var(--color-foreground)]">
              문항 목록 ({survey.questions?.length || 0}개)
            </h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="btn-ghost text-sm"
            >
              {showPreview ? "목록 보기" : "미리보기"}
            </button>
          </div>

          {!survey.questions || survey.questions.length === 0 ? (
            <div className="text-center py-8 text-[var(--color-muted)]">
              <p>등록된 문항이 없습니다.</p>
            </div>
          ) : showPreview ? (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              {survey.questions.map((q, index) => (
                <div key={q.id} className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="font-medium text-[var(--color-primary)]">
                      Q{index + 1}.
                    </span>
                    <span className="font-medium text-[var(--color-foreground)]">
                      {q.question_text}
                    </span>
                    {q.is_required && (
                      <span className="text-red-500 text-sm">*</span>
                    )}
                  </div>
                  {q.question_type === "scale" && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-[var(--color-muted)]">
                        {q.scale_labels?.min || "매우 불만족"}
                      </span>
                      <div className="flex gap-1 flex-1 justify-center">
                        {Array.from({
                          length: (q.scale_max || 5) - (q.scale_min || 1) + 1,
                        }).map((_, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-sm text-gray-500"
                          >
                            {(q.scale_min || 1) + i}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-[var(--color-muted)]">
                        {q.scale_labels?.max || "매우 만족"}
                      </span>
                    </div>
                  )}
                  {q.question_type === "text" && (
                    <textarea
                      className="w-full mt-2 p-3 border border-gray-200 rounded-lg resize-none"
                      rows={3}
                      placeholder="답변을 입력하세요..."
                      disabled
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {survey.questions.map((q, index) => (
                <div
                  key={q.id}
                  className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-[var(--color-muted)] w-8">
                    {index + 1}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                    {CATEGORY_LABELS[q.category] || q.category}
                  </span>
                  <span className="flex-1 text-[var(--color-foreground)] truncate">
                    {q.question_text}
                  </span>
                  <span className="text-xs text-[var(--color-muted)]">
                    {q.question_type === "scale" ? "5점 척도" : "서술형"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
