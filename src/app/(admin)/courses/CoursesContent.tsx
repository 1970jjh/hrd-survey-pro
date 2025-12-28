"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
interface CourseSurvey {
  id: string;
  title: string;
  status: "draft" | "active" | "closed";
}

interface Course {
  id: string;
  title: string;
  objectives?: string | null;
  content?: string | null;
  instructor?: string | null;
  training_start_date?: string | null;
  training_end_date?: string | null;
  target_participants: number;
  survey_count: number;
  surveys: CourseSurvey[];
}

interface CoursesResponse {
  success: boolean;
  data: {
    courses: Course[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export default function CoursesContent() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const response = await fetch(`/api/courses?${params}`);
      const data: CoursesResponse = await response.json();

      if (data.success) {
        setCourses(data.data.courses);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 교육과정을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchCourses();
      }
    } catch (error) {
      console.error("Failed to delete course:", error);
    }
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    setShowModal(true);
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
            교육과정 관리
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
          <div className="w-full sm:w-auto flex-1 max-w-md">
            <input
              type="text"
              placeholder="과정명 또는 강사명으로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="btn-primary whitespace-nowrap"
          >
            + 새 교육과정
          </button>
        </div>

        {/* Courses List */}
        {loading ? (
          <div className="glass-card p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-[var(--color-muted)]">로딩 중...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-4">📚</div>
            <p className="text-[var(--color-foreground)] font-medium mb-2">
              등록된 교육과정이 없습니다
            </p>
            <p className="text-[var(--color-muted)] text-sm mb-4">
              새 교육과정을 등록하여 설문을 만들어보세요
            </p>
            <button onClick={openCreateModal} className="btn-primary">
              첫 교육과정 등록하기
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="glass-card p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-1">
                    {course.title}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-sm text-[var(--color-muted)]">
                    {course.instructor && <span>👨‍🏫 {course.instructor}</span>}
                    {(course.training_start_date ||
                      course.training_end_date) && (
                      <span>
                        📅 {course.training_start_date || ""}
                        {course.training_start_date && course.training_end_date
                          ? " ~ "
                          : ""}
                        {course.training_end_date || ""}
                      </span>
                    )}
                    {course.target_participants > 0 && (
                      <span>👥 {course.target_participants}명</span>
                    )}
                    <span>📋 설문 {course.survey_count}개</span>
                  </div>
                  {course.objectives && (
                    <p className="text-sm text-[var(--color-muted)] mt-2 line-clamp-2">
                      {course.objectives}
                    </p>
                  )}
                  {/* Related Surveys */}
                  {course.surveys && course.surveys.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {course.surveys.map((survey) => (
                        <Link
                          key={survey.id}
                          href={`/surveys/${survey.id}`}
                          className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 hover:opacity-80 transition-opacity ${
                            survey.status === "active"
                              ? "bg-green-100 text-green-700"
                              : survey.status === "closed"
                                ? "bg-red-100 text-red-600"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <span>
                            {survey.status === "active"
                              ? "🟢"
                              : survey.status === "closed"
                                ? "🔴"
                                : "⚪"}
                          </span>
                          {survey.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(course)}
                    className="btn-ghost text-sm py-2 px-3"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="btn-ghost text-sm py-2 px-3 text-red-500 hover:bg-red-50"
                  >
                    삭제
                  </button>
                  {course.survey_count > 0 && (
                    <Link
                      href={`/courses/${course.id}/analysis`}
                      className="btn-ghost text-sm py-2 px-3 text-blue-600 hover:bg-blue-50"
                    >
                      통합 분석
                    </Link>
                  )}
                  <Link
                    href={`/surveys/new?course=${course.id}`}
                    className="btn-secondary text-sm py-2 px-3"
                  >
                    설문 만들기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <CourseModal
          course={editingCourse}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchCourses();
          }}
        />
      )}
    </div>
  );
}

// Course Modal Component
function CourseModal({
  course,
  onClose,
  onSave,
}: {
  course: Course | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    title: course?.title ?? "",
    objectives: course?.objectives ?? "",
    content: course?.content ?? "",
    instructor: course?.instructor ?? "",
    training_start_date: course?.training_start_date ?? "",
    training_end_date: course?.training_end_date ?? "",
    target_participants: course?.target_participants ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = course ? `/api/courses/${course.id}` : "/api/courses";
      const method = course ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          objectives: formData.objectives,
          content: formData.content,
          instructor: formData.instructor,
          trainingStartDate: formData.training_start_date,
          trainingEndDate: formData.training_end_date,
          targetParticipants: formData.target_participants,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "오류가 발생했습니다");
        return;
      }

      onSave();
    } catch (error) {
      setError("서버 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
        <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-4">
          {course ? "교육과정 수정" : "새 교육과정 등록"}
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
              과정명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-field"
              placeholder="예: 리더십 역량 강화 과정"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
              교육 목표
            </label>
            <textarea
              value={formData.objectives}
              onChange={(e) =>
                setFormData({ ...formData, objectives: e.target.value })
              }
              className="input-field min-h-[80px]"
              placeholder="이 교육을 통해 달성하고자 하는 목표"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
              교육 내용
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              className="input-field min-h-[80px]"
              placeholder="주요 교육 내용 및 커리큘럼"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
              강사명
            </label>
            <input
              type="text"
              value={formData.instructor}
              onChange={(e) =>
                setFormData({ ...formData, instructor: e.target.value })
              }
              className="input-field"
              placeholder="김강사"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                교육 시작일
              </label>
              <input
                type="date"
                value={formData.training_start_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    training_start_date: e.target.value,
                  })
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
                교육 종료일
              </label>
              <input
                type="date"
                value={formData.training_end_date}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    training_end_date: e.target.value,
                  })
                }
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-1">
              예상 참여 인원
            </label>
            <input
              type="number"
              value={formData.target_participants}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  target_participants: parseInt(e.target.value) || 0,
                })
              }
              className="input-field"
              min="0"
              placeholder="30"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-ghost"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
              disabled={loading}
            >
              {loading ? "저장 중..." : course ? "수정하기" : "등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
