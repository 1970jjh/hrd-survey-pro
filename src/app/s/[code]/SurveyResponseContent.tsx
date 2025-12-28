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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">설문을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">😢</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            설문에 접근할 수 없습니다
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center animate-fadeIn">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">감사합니다!</h1>
          <p className="text-gray-600 mb-4">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full animate-fadeIn">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">📋</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {survey.title}
            </h1>
            {survey.description && (
              <p className="text-gray-600 mb-4">{survey.description}</p>
            )}
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <h2 className="font-medium text-gray-700 mb-2">교육과정 정보</h2>
            <p className="text-blue-700 font-semibold">{survey.course.title}</p>
            {survey.course.instructor && (
              <p className="text-gray-600 text-sm">
                강사: {survey.course.instructor}
              </p>
            )}
          </div>

          <div className="text-center text-sm text-gray-500 mb-6">
            <p>총 {survey.questions.length}개 문항</p>
            <p>예상 소요 시간: {Math.ceil(survey.questions.length / 3)}분</p>
            <p className="mt-2">
              {survey.is_anonymous ? (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <span>🔒</span> 무기명 설문
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <span>👤</span> 기명 설문
                </span>
              )}
            </p>
          </div>

          {/* 기명 설문인 경우 이름 입력 */}
          {!survey.is_anonymous && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름을 입력해주세요 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="홍길동"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            설문 시작하기
          </button>
          {error && (
            <p className="text-red-500 text-sm text-center mt-2">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Questions screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-white shadow-sm">
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {Object.keys(answers).length} / {survey.questions.length} 응답 완료
          </span>
          <span className="text-sm font-medium text-blue-600">{progress}%</span>
        </div>
      </div>

      {/* Questions */}
      <div className="pt-16 pb-24 px-4">
        <div className="max-w-lg mx-auto space-y-6">
          {survey.questions.map((question, index) => (
            <div
              key={question.id}
              className="bg-white rounded-2xl shadow-lg p-6 animate-fadeIn"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">
                    {question.question_text}
                    {question.is_required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </p>
                </div>
              </div>

              {question.question_type === "scale" && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
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
                          className={`w-12 h-12 rounded-full font-medium transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white scale-110 shadow-lg"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                  className="w-full mt-2 p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          className={`w-full p-4 rounded-xl text-left transition-all ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white shadow-lg">
        {error && (
          <p className="text-red-500 text-sm text-center mb-2">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full max-w-lg mx-auto block py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {submitting ? "제출 중..." : "설문 제출하기"}
        </button>
      </div>
    </div>
  );
}
