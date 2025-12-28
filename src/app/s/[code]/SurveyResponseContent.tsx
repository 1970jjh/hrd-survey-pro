"use client";

import { useState, useEffect, useCallback } from "react";

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
  is_anonymous: boolean; // true: 무기명, false: 기명
  course: {
    title: string;
    instructor: string | null;
  };
  questions: Question[];
}

interface SurveyResponseContentProps {
  code: string;
}

export default function SurveyResponseContent({
  code,
}: SurveyResponseContentProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: intro, 1+: questions
  const [respondentName, setRespondentName] = useState(""); // 기명 설문용

  const fetchSurvey = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/surveys/${code}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "설문을 불러올 수 없습니다");
        return;
      }

      setSurvey(data.data);
    } catch {
      setError("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  const handleAnswer = (questionId: string, value: number | string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // Validate respondent name for non-anonymous surveys
    if (!survey.is_anonymous && !respondentName.trim()) {
      setError("이름을 입력해주세요");
      return;
    }

    // Validate required questions
    const unanswered = survey.questions.filter(
      (q) => q.is_required && answers[q.id] === undefined
    );

    if (unanswered.length > 0) {
      setError("필수 문항에 모두 응답해주세요");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Map to API expected format
      // API expects: { answers: [{ questionId, scoreValue, textValue }], respondentName? }
      const answersData = Object.entries(answers).map(
        ([questionId, value]) => ({
          questionId,
          scoreValue: typeof value === "number" ? value : undefined,
          textValue: typeof value === "string" ? value : undefined,
        })
      );

      const response = await fetch(`/api/public/surveys/${code}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersData,
          respondentName: !survey.is_anonymous
            ? respondentName.trim()
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "제출에 실패했습니다");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("서버 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = survey
    ? Math.round((Object.keys(answers).length / survey.questions.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-black border-t-[var(--color-primary)] animate-spin mx-auto mb-4" />
          <p className="font-bold uppercase tracking-wide text-black">설문을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="bg-white border-3 border-black shadow-[8px_8px_0px_#0a0a0a] p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4 font-black">[X]</div>
          <h1 className="text-xl font-black uppercase text-black mb-2">
            설문에 접근할 수 없습니다
          </h1>
          <p className="font-bold text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)] p-4">
        <div className="bg-white border-3 border-black shadow-[8px_8px_0px_#0a0a0a] p-8 max-w-md w-full text-center animate-fadeIn">
          <div className="w-20 h-20 bg-green-400 border-3 border-black shadow-[4px_4px_0px_#0a0a0a] mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl font-black text-black">✓</span>
          </div>
          <h1 className="text-2xl font-black uppercase text-black mb-2">감사합니다!</h1>
          <p className="font-bold text-gray-600 mb-4">
            소중한 의견이 성공적으로 제출되었습니다.
          </p>
          <p className="text-sm text-gray-500">
            응답해 주셔서 감사합니다. 여러분의 의견은 교육 품질 향상에 큰 도움이
            됩니다.
          </p>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  // Intro screen
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] p-4 flex items-center justify-center">
        <div className="bg-white border-3 border-black shadow-[8px_8px_0px_#0a0a0a] p-8 max-w-lg w-full animate-fadeIn">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[var(--color-primary)] border-3 border-black shadow-[4px_4px_0px_#0a0a0a] mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl font-black text-white">?</span>
            </div>
            <h1 className="text-2xl font-black uppercase text-black mb-2">
              {survey.title}
            </h1>
            {survey.description && (
              <p className="text-gray-600 font-bold mb-4">{survey.description}</p>
            )}
          </div>

          <div className="bg-[var(--color-primary)] border-3 border-black shadow-[4px_4px_0px_#0a0a0a] p-4 mb-6">
            <h2 className="font-black text-white uppercase mb-1">교육과정 정보</h2>
            <p className="text-white font-bold">{survey.course.title}</p>
            {survey.course.instructor && (
              <p className="text-white/80 text-sm font-bold">
                강사: {survey.course.instructor}
              </p>
            )}
          </div>

          <div className="text-center text-sm font-bold text-gray-600 mb-6 space-y-1">
            <p>총 {survey.questions.length}개 문항</p>
            <p>예상 소요 시간: {Math.ceil(survey.questions.length / 3)}분</p>
            <p className="mt-2">
              {survey.is_anonymous ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-400 border-2 border-black text-black uppercase text-xs">
                  [🔒] 무기명 설문
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-secondary)] border-2 border-black text-white uppercase text-xs">
                  [👤] 기명 설문
                </span>
              )}
            </p>
          </div>

          {/* 기명 설문인 경우 이름 입력 */}
          {!survey.is_anonymous && (
            <div className="mb-6">
              <label className="block text-sm font-black uppercase tracking-wide text-black mb-2">
                이름을 입력해주세요 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-4 py-3 border-3 border-black font-bold focus:shadow-[4px_4px_0px_#0a0a0a] focus:translate-x-[-2px] focus:translate-y-[-2px] transition-all duration-100 focus:outline-none"
              />
            </div>
          )}

          <button
            onClick={() => {
              if (!survey.is_anonymous && !respondentName.trim()) {
                setError("이름을 입력해주세요");
                return;
              }
              setError("");
              setCurrentStep(1);
            }}
            className="w-full py-4 bg-[var(--color-primary)] text-white font-black uppercase tracking-wide border-3 border-black shadow-[4px_4px_0px_#0a0a0a] hover:shadow-[6px_6px_0px_#0a0a0a] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100"
          >
            설문 시작하기
          </button>
          {error && (
            <p className="text-red-500 text-sm text-center mt-2 font-bold uppercase">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Questions screen
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white border-b-3 border-black">
        <div className="h-3 bg-gray-200">
          <div
            className="h-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-bold text-black uppercase">
            {Object.keys(answers).length} / {survey.questions.length} 응답 완료
          </span>
          <span className="text-sm font-black text-[var(--color-primary)]">{progress}%</span>
        </div>
      </div>

      {/* Questions */}
      <div className="pt-20 pb-28 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          {survey.questions.map((question, index) => (
            <div
              key={question.id}
              className="bg-white border-3 border-black shadow-[4px_4px_0px_#0a0a0a] p-6 animate-fadeIn"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 w-10 h-10 bg-[var(--color-primary)] border-2 border-black text-white flex items-center justify-center text-sm font-black">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-black font-bold">
                    {question.question_text}
                    {question.is_required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </p>
                </div>
              </div>

              {question.question_type === "scale" && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase mb-3">
                    <span>{question.scale_labels?.min || "매우 불만족"}</span>
                    <span>{question.scale_labels?.max || "매우 만족"}</span>
                  </div>
                  <div className="flex gap-2 justify-center">
                    {Array.from({
                      length:
                        (question.scale_max || 5) -
                        (question.scale_min || 1) +
                        1,
                    }).map((_, i) => {
                      const value = (question.scale_min || 1) + i;
                      const isSelected = answers[question.id] === value;
                      return (
                        <button
                          key={value}
                          onClick={() => handleAnswer(question.id, value)}
                          className={`w-12 h-12 font-black transition-all duration-100 border-3 border-black ${
                            isSelected
                              ? "bg-[var(--color-primary)] text-white shadow-[4px_4px_0px_#0a0a0a] translate-x-[-2px] translate-y-[-2px]"
                              : "bg-white text-black hover:bg-gray-100"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {question.question_type === "text" && (
                <textarea
                  value={(answers[question.id] as string) || ""}
                  onChange={(e) => handleAnswer(question.id, e.target.value)}
                  className="w-full mt-2 p-4 border-3 border-black resize-none focus:outline-none focus:shadow-[4px_4px_0px_#0a0a0a] focus:translate-x-[-2px] focus:translate-y-[-2px] transition-all duration-100 font-medium"
                  rows={4}
                  placeholder="답변을 입력해 주세요..."
                />
              )}

              {question.question_type === "multiple_choice" &&
                question.options && (
                  <div className="mt-4 space-y-2">
                    {question.options.map((option, optIdx) => {
                      const isSelected = answers[question.id] === option;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleAnswer(question.id, option)}
                          className={`w-full p-4 text-left transition-all duration-100 border-3 border-black font-bold ${
                            isSelected
                              ? "bg-[var(--color-primary)] text-white shadow-[4px_4px_0px_#0a0a0a] translate-x-[-2px] translate-y-[-2px]"
                              : "bg-white text-black hover:bg-gray-100"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t-3 border-black">
        {error && (
          <p className="text-red-500 text-sm text-center mb-2 font-bold uppercase">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full max-w-lg mx-auto block py-4 bg-[var(--color-primary)] text-white font-black uppercase tracking-wide border-3 border-black shadow-[4px_4px_0px_#0a0a0a] hover:shadow-[6px_6px_0px_#0a0a0a] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
        >
          {submitting ? "제출 중..." : "설문 제출하기"}
        </button>
      </div>
    </div>
  );
}
