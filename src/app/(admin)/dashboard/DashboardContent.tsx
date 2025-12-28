"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface DashboardStats {
  totalCourses: number;
  totalSurveys: number;
  activeSurveys: number;
  totalResponses: number;
  recentSurveys: Array<{
    id: string;
    title: string;
    status: string;
    course_title: string;
    response_count: number;
    created_at: string;
  }>;
  surveysByStatus: {
    draft: number;
    active: number;
    closed: number;
  };
  recentResponses: Array<{
    survey_id: string;
    survey_title: string;
    responded_at: string;
  }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "임시저장", color: "bg-gray-100 text-gray-600" },
  active: { label: "진행중", color: "bg-green-100 text-green-600" },
  closed: { label: "종료", color: "bg-red-100 text-red-600" },
};

interface DashboardContentProps {
  user: User;
}

export default function DashboardContent({ user }: DashboardContentProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard");
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const userName = user.displayName || user.email?.split("@")[0] || "관리자";

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-primary)] transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b border-white/10">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">📊</span>
              </div>
              <div>
                <h1 className="text-white font-bold">HRD Survey Pro</h1>
                <p className="text-white/60 text-xs">AI 설문 시스템</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 text-white"
            >
              <span>🏠</span>
              <span>대시보드</span>
            </Link>
            <Link
              href="/surveys"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span>📋</span>
              <span>설문 관리</span>
            </Link>
            <Link
              href="/courses"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span>📚</span>
              <span>교육과정</span>
            </Link>
            <Link
              href="/surveys/new"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span>➕</span>
              <span>새 설문 만들기</span>
            </Link>
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
                {userName[0].toUpperCase()}
              </div>
              <div>
                <p className="text-white font-medium truncate max-w-[140px]">
                  {userName}
                </p>
                <p className="text-white/60 text-xs truncate max-w-[140px]">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left"
            >
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-screen">
        {/* Top Header */}
        <header className="glass-card mx-4 mt-4 mb-6 p-4 flex items-center justify-between lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-[var(--color-primary)]">
            HRD Survey Pro
          </h1>
          <div className="w-10" />
        </header>

        <main className="px-4 pb-8 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-1">
              안녕하세요, {userName}님! 👋
            </h2>
            <p className="text-[var(--color-muted)]">
              오늘도 효과적인 교육 평가를 진행해보세요.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📚</span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                  교육과정
                </span>
              </div>
              <div className="text-3xl font-bold text-[var(--color-foreground)]">
                {loading ? "-" : stats?.totalCourses || 0}
              </div>
              <p className="text-sm text-[var(--color-muted)]">등록된 과정</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📋</span>
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-full">
                  설문
                </span>
              </div>
              <div className="text-3xl font-bold text-[var(--color-foreground)]">
                {loading ? "-" : stats?.totalSurveys || 0}
              </div>
              <p className="text-sm text-[var(--color-muted)]">전체 설문</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🟢</span>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full">
                  진행중
                </span>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {loading ? "-" : stats?.activeSurveys || 0}
              </div>
              <p className="text-sm text-[var(--color-muted)]">활성 설문</p>
            </div>

            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">👥</span>
                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded-full">
                  응답
                </span>
              </div>
              <div className="text-3xl font-bold text-[var(--color-foreground)]">
                {loading ? "-" : stats?.totalResponses || 0}
              </div>
              <p className="text-sm text-[var(--color-muted)]">총 응답 수</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Link
              href="/surveys/new"
              className="glass-card glass-card-hover p-6 block"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center text-2xl">
                  ➕
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-foreground)]">
                    새 설문 만들기
                  </h3>
                  <p className="text-sm text-[var(--color-muted)]">
                    AI로 자동 생성
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/courses"
              className="glass-card glass-card-hover p-6 block"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                  📚
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-foreground)]">
                    교육과정 관리
                  </h3>
                  <p className="text-sm text-[var(--color-muted)]">
                    과정 등록 및 수정
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/surveys"
              className="glass-card glass-card-hover p-6 block"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                  📊
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-foreground)]">
                    설문 관리
                  </h3>
                  <p className="text-sm text-[var(--color-muted)]">
                    통계 및 분석
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Surveys */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                  최근 설문
                </h3>
                <Link
                  href="/surveys"
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  전체 보기 →
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.recentSurveys && stats.recentSurveys.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentSurveys.map((survey) => (
                    <Link
                      key={survey.id}
                      href={`/surveys/${survey.id}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center text-lg">
                        📋
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--color-foreground)] truncate">
                          {survey.title}
                        </p>
                        <p className="text-xs text-[var(--color-muted)] truncate">
                          {survey.course_title}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${STATUS_LABELS[survey.status]?.color || "bg-gray-100"}`}
                        >
                          {STATUS_LABELS[survey.status]?.label || survey.status}
                        </span>
                        <p className="text-xs text-[var(--color-muted)] mt-1">
                          {survey.response_count}명 응답
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--color-muted)]">
                  <div className="text-4xl mb-2">📋</div>
                  <p>아직 설문이 없습니다.</p>
                  <Link
                    href="/surveys/new"
                    className="text-sm text-[var(--color-primary)] hover:underline mt-2 inline-block"
                  >
                    첫 설문 만들기 →
                  </Link>
                </div>
              )}
            </div>

            {/* Recent Responses */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                  최근 응답
                </h3>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-gray-200 rounded-full" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.recentResponses && stats.recentResponses.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentResponses.map((response, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        ✓
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--color-foreground)] truncate">
                          {response.survey_title}
                        </p>
                        <p className="text-xs text-[var(--color-muted)]">
                          {formatDate(response.responded_at)}
                        </p>
                      </div>
                      <Link
                        href={`/surveys/${response.survey_id}/stats`}
                        className="text-xs text-[var(--color-primary)] hover:underline"
                      >
                        통계 →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[var(--color-muted)]">
                  <div className="text-4xl mb-2">👥</div>
                  <p>아직 응답이 없습니다.</p>
                  <p className="text-sm mt-1">
                    설문을 배포하고 응답을 받아보세요!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Survey Status Overview */}
          {!loading && stats && stats.totalSurveys > 0 && (
            <div className="glass-card p-6 mt-6">
              <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
                설문 현황
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div className="h-full flex">
                    {stats.surveysByStatus.active > 0 && (
                      <div
                        className="bg-green-500 h-full"
                        style={{
                          width: `${(stats.surveysByStatus.active / stats.totalSurveys) * 100}%`,
                        }}
                      />
                    )}
                    {stats.surveysByStatus.closed > 0 && (
                      <div
                        className="bg-red-400 h-full"
                        style={{
                          width: `${(stats.surveysByStatus.closed / stats.totalSurveys) * 100}%`,
                        }}
                      />
                    )}
                    {stats.surveysByStatus.draft > 0 && (
                      <div
                        className="bg-gray-400 h-full"
                        style={{
                          width: `${(stats.surveysByStatus.draft / stats.totalSurveys) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-6 mt-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-[var(--color-muted)]">
                    진행중 {stats.surveysByStatus.active}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                  <span className="text-[var(--color-muted)]">
                    종료 {stats.surveysByStatus.closed}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <span className="text-[var(--color-muted)]">
                    임시저장 {stats.surveysByStatus.draft}
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
