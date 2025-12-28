"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Course {
  title: string;
  instructor: string | null;
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  url_code: string;
  status: "draft" | "active" | "closed";
  is_anonymous: boolean; // 무기명/기명 여부
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  courses: Course;
}

interface SurveysResponse {
  success: boolean;
  data: {
    surveys: Survey[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

const STATUS_LABELS = {
  draft: { label: "임시저장", color: "bg-gray-100 text-gray-600" },
  active: { label: "진행중", color: "bg-green-100 text-green-600" },
  closed: { label: "종료", color: "bg-red-100 text-red-600" },
};

export default function SurveysContent() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/surveys?${params}`);
      const data: SurveysResponse = await response.json();

      if (data.success) {
        setSurveys(data.data.surveys);
      }
    } catch (error) {
      console.error("Failed to fetch surveys:", error);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "정말 이 설문을 삭제하시겠습니까? 모든 응답 데이터도 함께 삭제됩니다."
      )
    )
      return;

    try {
      const response = await fetch(`/api/surveys/${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchSurveys();
      }
    } catch (error) {
      console.error("Failed to delete survey:", error);
    }
  };

  const handleStatusChange = async (
    id: string,
    newStatus: "draft" | "active" | "closed"
  ) => {
    try {
      const response = await fetch(`/api/surveys/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "상태 변경에 실패했습니다");
        return;
      }

      fetchSurveys();
    } catch (error) {
      console.error("Failed to change status:", error);
    }
  };

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
          <span className="text-[var(--color-foreground)] font-medium">
            설문 관리
          </span>
        </div>
        <Link href="/dashboard" className="btn-ghost text-sm py-2 px-4">
          대시보드
        </Link>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-8">
        {/* Actions Bar */}
        <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 w-full sm:w-auto">
            <input
              type="text"
              placeholder="설문 제목으로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field flex-1 sm:w-64"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-32"
            >
              <option value="">전체 상태</option>
              <option value="draft">임시저장</option>
              <option value="active">진행중</option>
              <option value="closed">종료</option>
            </select>
          </div>
          <Link href="/surveys/new" className="btn-primary whitespace-nowrap">
            + 새 설문 만들기
          </Link>
        </div>

        {/* Surveys List */}
        {loading ? (
          <div className="glass-card p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-[var(--color-muted)]">로딩 중...</p>
          </div>
        ) : surveys.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-[var(--color-foreground)] font-medium mb-2">
              생성된 설문이 없습니다
            </p>
            <p className="text-[var(--color-muted)] text-sm mb-4">
              AI가 자동으로 설문을 생성해드립니다
            </p>
            <Link href="/surveys/new" className="btn-primary">
              첫 설문 만들기
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {surveys.map((survey) => (
              <div key={survey.id} className="glass-card p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                        {survey.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${STATUS_LABELS[survey.status].color}`}
                      >
                        {STATUS_LABELS[survey.status].label}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${survey.is_anonymous ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"}`}
                      >
                        {survey.is_anonymous ? "🔒 무기명" : "👤 기명"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-[var(--color-muted)]">
                      <span>📚 {survey.courses?.title}</span>
                      {survey.courses?.instructor && (
                        <span>👨‍🏫 {survey.courses.instructor}</span>
                      )}
                      <span>
                        📅{" "}
                        {new Date(survey.created_at).toLocaleDateString(
                          "ko-KR"
                        )}
                      </span>
                    </div>
                    {survey.description && (
                      <p className="text-sm text-[var(--color-muted)] mt-2 line-clamp-2">
                        {survey.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/surveys/${survey.id}`}
                      className="btn-ghost text-sm py-2 px-3"
                    >
                      상세/편집
                    </Link>
                    {survey.status === "draft" && (
                      <button
                        onClick={() => handleStatusChange(survey.id, "active")}
                        className="btn-secondary text-sm py-2 px-3"
                      >
                        활성화
                      </button>
                    )}
                    {survey.status === "active" && (
                      <button
                        onClick={() => handleStatusChange(survey.id, "closed")}
                        className="btn-ghost text-sm py-2 px-3 text-orange-500"
                      >
                        종료
                      </button>
                    )}
                    {survey.status === "closed" && (
                      <button
                        onClick={() => handleStatusChange(survey.id, "active")}
                        className="btn-secondary text-sm py-2 px-3"
                      >
                        재개
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(survey.id)}
                      className="btn-ghost text-sm py-2 px-3 text-red-500 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
