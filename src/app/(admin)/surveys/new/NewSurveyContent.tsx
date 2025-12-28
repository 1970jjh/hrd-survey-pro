"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  instructor: string | null;
  objectives: string | null;
  content: string | null;
  training_date: string | null;
}

interface Question {
  id?: string;
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

const CATEGORY_LABELS: Record<string, string> = {
  overall: "종합만족도",
  content: "교육내용",
  instructor: "강사만족도",
  facility: "교육환경",
  other: "기타",
};

const STEPS = [
  { id: 1, title: "교육과정 선택" },
  { id: 2, title: "AI 문항 생성" },
  { id: 3, title: "문항 편집" },
  { id: 4, title: "완료" },
];

function NewSurveyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCourseId = searchParams.get("course");

  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [surveyTitle, setSurveyTitle] = useState("");
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // AI Generation Options
  const [categories, setCategories] = useState<string[]>([
    "overall",
    "content",
    "instructor",
  ]);
  const [scaleQuestionCount, setScaleQuestionCount] = useState(10);
  const [textQuestionCount, setTextQuestionCount] = useState(2);
  const [scaleType, setScaleType] = useState<5 | 7 | 9 | 10>(5);
  const [isAnonymous, setIsAnonymous] = useState(true); // 기본값: 무기명

  // Question add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<"scale" | "text">(
    "scale"
  );

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch("/api/courses?limit=100");
        const data = await response.json();
        if (data.success) {
          setCourses(data.data.courses);

          // Auto-select preselected course
          if (preselectedCourseId) {
            const course = data.data.courses.find(
              (c: Course) => c.id === preselectedCourseId
            );
            if (course) {
              setSelectedCourse(course);
              setSurveyTitle(`${course.title} 만족도 설문`);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      }
    };
    fetchCourses();
  }, [preselectedCourseId]);

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setSurveyTitle(`${course.title} 만족도 설문`);
    setError("");
  };

  const handleStep1Next = () => {
    if (!selectedCourse) {
      setError("교육과정을 선택해주세요");
      return;
    }
    if (!surveyTitle.trim()) {
      setError("설문 제목을 입력해주세요");
      return;
    }
    setStep(2);
    setError("");
  };

  const handleGenerateQuestions = async () => {
    if (!selectedCourse) return;

    setGenerating(true);
    setError("");

    try {
      // Create survey first
      let currentSurveyId = surveyId;

      if (!currentSurveyId) {
        const createResponse = await fetch("/api/surveys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course_id: selectedCourse.id,
            title: surveyTitle,
            scaleType,
            isAnonymous,
          }),
        });

        const createData = await createResponse.json();

        if (!createResponse.ok) {
          throw new Error(createData.error || "설문 생성에 실패했습니다");
        }

        currentSurveyId = createData.data.id;
        setSurveyId(currentSurveyId);
      }

      // Generate questions with AI
      const generateResponse = await fetch(
        `/api/surveys/${currentSurveyId}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categories,
            scaleQuestionCount,
            textQuestionCount,
          }),
        }
      );

      const generateData = await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(generateData.error || "문항 생성에 실패했습니다");
      }

      // Map API response fields to UI expected fields
      // API returns: content, type ("choice" | "text")
      // UI expects: question_text, question_type ("scale" | "text")
      interface ApiQuestion {
        id?: string;
        content: string;
        type: "choice" | "text";
        category?: string;
        isRequired?: boolean;
        orderNum?: number;
      }
      setQuestions(
        generateData.data.map(
          (q: ApiQuestion, i: number) =>
            ({
              id: q.id,
              category: q.category || "overall",
              question_text: q.content,
              question_type: q.type === "choice" ? "scale" : "text",
              is_required: q.isRequired ?? true,
              order_num: q.orderNum || i + 1,
              scale_min: q.type === "choice" ? 1 : undefined,
              scale_max: q.type === "choice" ? scaleType : undefined,
              scale_labels:
                q.type === "choice"
                  ? { min: "매우 불만족", max: "매우 만족" }
                  : undefined,
            }) as Question
        )
      );
      setStep(3);
    } catch (error) {
      setError(error instanceof Error ? error.message : "오류가 발생했습니다");
    } finally {
      setGenerating(false);
    }
  };

  const handleQuestionEdit = (
    index: number,
    field: keyof Question,
    value: unknown
  ) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const handleQuestionDelete = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated.map((q, i) => ({ ...q, order_num: i + 1 })));
  };

  const handleAddQuestion = (type: "scale" | "text") => {
    const newQuestion: Question =
      type === "scale"
        ? {
            category: "overall",
            question_text: "",
            question_type: "scale",
            scale_min: 1,
            scale_max: scaleType,
            scale_labels: { min: "매우 불만족", max: "매우 만족" },
            is_required: true,
            order_num: questions.length + 1,
          }
        : {
            category: "other",
            question_text: "",
            question_type: "text",
            is_required: false,
            order_num: questions.length + 1,
          };

    setQuestions([...questions, newQuestion]);
    setShowAddModal(false);
  };

  const handleSaveQuestions = async () => {
    if (!surveyId) return;

    setLoading(true);
    setError("");

    try {
      // Delete existing and add new questions
      await fetch(`/api/surveys/${surveyId}/questions`, { method: "DELETE" });

      // Map UI fields to API format
      // UI: question_text, question_type ("scale" | "text"), is_required, order_num
      // API: content, type ("choice" | "text"), isRequired, orderNum
      const apiQuestions = questions.map((q) => ({
        content: q.question_text,
        type: q.question_type === "scale" ? "choice" : "text",
        category: q.category,
        isRequired: q.is_required,
        orderNum: q.order_num,
      }));

      const response = await fetch(`/api/surveys/${surveyId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: apiQuestions }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "저장에 실패했습니다");
      }

      setStep(4);
    } catch (error) {
      setError(error instanceof Error ? error.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
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
            새 설문 만들기
          </span>
        </div>
        <Link href="/surveys" className="btn-ghost text-sm py-2 px-4">
          취소
        </Link>
      </header>

      {/* Progress Steps */}
      <div className="px-4 mb-6">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= s.id
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {step > s.id ? "✓" : s.id}
                  </div>
                  <span className="text-xs mt-1 text-[var(--color-muted)]">
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step > s.id ? "bg-[var(--color-primary)]" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      )}

      {/* Step Content */}
      <main className="px-4 pb-8">
        {/* Step 1: Course Selection */}
        {step === 1 && (
          <div className="glass-card p-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-4">
              교육과정 선택
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                설문 제목
              </label>
              <input
                type="text"
                value={surveyTitle}
                onChange={(e) => setSurveyTitle(e.target.value)}
                className="input-field"
                placeholder="예: 리더십 교육 만족도 설문"
              />
            </div>

            <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
              교육과정
            </label>

            {courses.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                <p className="text-[var(--color-muted)] mb-4">
                  등록된 교육과정이 없습니다
                </p>
                <Link href="/courses" className="btn-secondary">
                  교육과정 등록하기
                </Link>
              </div>
            ) : (
              <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => handleCourseSelect(course)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      selectedCourse?.id === course.id
                        ? "border-[var(--color-primary)] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <h4 className="font-medium text-[var(--color-foreground)]">
                      {course.title}
                    </h4>
                    <div className="flex gap-4 text-sm text-[var(--color-muted)] mt-1">
                      {course.instructor && <span>👨‍🏫 {course.instructor}</span>}
                      {course.training_date && (
                        <span>📅 {course.training_date}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button onClick={handleStep1Next} className="btn-primary">
                다음: AI 문항 생성
              </button>
            </div>
          </div>
        )}

        {/* Step 2: AI Generation Options */}
        {step === 2 && (
          <div className="glass-card p-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-[var(--color-foreground)] mb-4">
              AI 문항 생성 설정
            </h2>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-[var(--color-foreground)] mb-1">
                선택된 교육과정
              </h3>
              <p className="text-[var(--color-primary)] font-semibold">
                {selectedCourse?.title}
              </p>
            </div>

            <div className="space-y-6">
              {/* 카테고리 선택 */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  문항 카테고리 선택
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleCategory(key)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        categories.includes(key)
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 척도 선택 */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  객관식 문항 척도
                </label>
                <div className="flex flex-wrap gap-2">
                  {([5, 7, 9, 10] as const).map((scale) => (
                    <button
                      key={scale}
                      onClick={() => setScaleType(scale)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                        scaleType === scale
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {scale}점 척도
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  응답자가 1~{scaleType}점 중에서 선택합니다
                </p>
              </div>

              {/* 객관식 문항 수량 */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  객관식 문항 수 ({scaleType}점 척도)
                </label>
                <select
                  value={scaleQuestionCount}
                  onChange={(e) =>
                    setScaleQuestionCount(Number(e.target.value))
                  }
                  className="input-field w-full max-w-xs"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 3).map((num) => (
                    <option key={num} value={num}>
                      {num}개
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  선택한 카테고리에 골고루 분배됩니다 (3~20개)
                </p>
              </div>

              {/* 서술형 문항 수량 */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  서술형 문항 수
                </label>
                <select
                  value={textQuestionCount}
                  onChange={(e) => setTextQuestionCount(Number(e.target.value))}
                  className="input-field w-full max-w-xs"
                >
                  {[0, 1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num === 0 ? "없음" : `${num}개`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  자유롭게 의견을 작성할 수 있는 문항입니다
                </p>
              </div>

              {/* 무기명/기명 설정 */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  설문 응답 방식
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsAnonymous(true)}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all text-left ${
                      isAnonymous
                        ? "border-[var(--color-primary)] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔒</span>
                      <div>
                        <h4
                          className={`font-medium ${isAnonymous ? "text-[var(--color-primary)]" : "text-[var(--color-foreground)]"}`}
                        >
                          무기명 설문
                        </h4>
                        <p className="text-xs text-[var(--color-muted)]">
                          응답자 정보 없이 익명으로 응답
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setIsAnonymous(false)}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all text-left ${
                      !isAnonymous
                        ? "border-[var(--color-primary)] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👤</span>
                      <div>
                        <h4
                          className={`font-medium ${!isAnonymous ? "text-[var(--color-primary)]" : "text-[var(--color-foreground)]"}`}
                        >
                          기명 설문
                        </h4>
                        <p className="text-xs text-[var(--color-muted)]">
                          응답자가 이름을 입력 후 응답
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 총 문항 수 요약 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-[var(--color-foreground)] mb-2">
                  생성 예정 문항
                </h4>
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-[var(--color-primary)] rounded-full"></span>
                    <span>객관식: {scaleQuestionCount}개</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span>서술형: {textQuestionCount}개</span>
                  </div>
                  <div className="font-semibold text-[var(--color-primary)]">
                    총 {scaleQuestionCount + textQuestionCount}개
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(1)} className="btn-ghost">
                이전
              </button>
              <button
                onClick={handleGenerateQuestions}
                disabled={generating || categories.length === 0}
                className="btn-primary"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    AI가 문항 생성 중...
                  </span>
                ) : (
                  "AI 문항 생성하기"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Edit Questions */}
        {step === 3 && (
          <div className="glass-card p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--color-foreground)]">
                  문항 편집
                </h2>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  AI가 생성한 문항을 검토하고 수정하세요. 문항을 추가하거나
                  삭제할 수 있습니다.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-secondary text-sm flex items-center gap-1"
              >
                <span>+</span> 문항 추가
              </button>
            </div>

            {/* 문항 통계 */}
            <div className="flex gap-4 mb-4 text-sm">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                객관식{" "}
                {questions.filter((q) => q.question_type === "scale").length}개
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
                서술형{" "}
                {questions.filter((q) => q.question_type === "text").length}개
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                총 {questions.length}개
              </span>
            </div>

            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
              {questions.map((q, index) => (
                <div
                  key={index}
                  className={`p-4 border rounded-lg transition-all ${
                    q.question_type === "text"
                      ? "border-green-200 bg-green-50/30"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[var(--color-primary)] bg-blue-100 px-2 py-0.5 rounded">
                        Q{index + 1}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          q.question_type === "text"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {q.question_type === "text"
                          ? "서술형"
                          : `${scaleType}점 척도`}
                      </span>
                      <select
                        value={q.category}
                        onChange={(e) =>
                          handleQuestionEdit(index, "category", e.target.value)
                        }
                        className="text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={q.question_type}
                        onChange={(e) =>
                          handleQuestionEdit(
                            index,
                            "question_type",
                            e.target.value as "scale" | "text"
                          )
                        }
                        className="text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                      >
                        <option value="scale">
                          객관식 ({scaleType}점 척도)
                        </option>
                        <option value="text">서술형</option>
                      </select>
                      <button
                        onClick={() => handleQuestionDelete(index)}
                        className="text-red-500 hover:text-red-700 text-sm px-2 py-1 hover:bg-red-50 rounded"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={q.question_text}
                    onChange={(e) =>
                      handleQuestionEdit(index, "question_text", e.target.value)
                    }
                    className="input-field min-h-[70px] text-sm"
                    placeholder="질문 내용을 입력하세요"
                  />
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={q.is_required}
                        onChange={(e) =>
                          handleQuestionEdit(
                            index,
                            "is_required",
                            e.target.checked
                          )
                        }
                        className="w-4 h-4 rounded"
                      />
                      필수 응답
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-6 pt-4 border-t">
              <button onClick={() => setStep(2)} className="btn-ghost">
                ← 다시 생성
              </button>
              <button
                onClick={handleSaveQuestions}
                disabled={loading || questions.length === 0}
                className="btn-primary"
              >
                {loading ? "저장 중..." : "설문 저장하기"}
              </button>
            </div>
          </div>
        )}

        {/* 문항 추가 모달 */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 animate-fadeIn">
              <h3 className="text-lg font-bold text-[var(--color-foreground)] mb-4">
                문항 추가
              </h3>
              <p className="text-sm text-[var(--color-muted)] mb-4">
                추가할 문항 유형을 선택하세요.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => handleAddQuestion("scale")}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-[var(--color-primary)] hover:bg-blue-50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h4 className="font-medium text-[var(--color-foreground)]">
                        객관식 ({scaleType}점 척도)
                      </h4>
                      <p className="text-xs text-[var(--color-muted)]">
                        1~{scaleType}점으로 평가하는 문항
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleAddQuestion("text")}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✏️</span>
                    <div>
                      <h4 className="font-medium text-[var(--color-foreground)]">
                        서술형
                      </h4>
                      <p className="text-xs text-[var(--color-muted)]">
                        자유롭게 의견을 작성하는 문항
                      </p>
                    </div>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-full mt-4 py-2 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div className="glass-card p-8 text-center animate-fadeIn">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
              설문이 생성되었습니다!
            </h2>
            <p className="text-[var(--color-muted)] mb-6">
              {questions.length}개의 문항이 포함된 설문이 저장되었습니다.
            </p>
            <div className="flex justify-center gap-4">
              <Link href={`/surveys/${surveyId}`} className="btn-primary">
                설문 상세보기
              </Link>
              <Link href="/surveys" className="btn-ghost">
                목록으로
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
    </div>
  );
}

export default function NewSurveyContent() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewSurveyForm />
    </Suspense>
  );
}
