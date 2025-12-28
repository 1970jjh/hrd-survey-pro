"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

interface ReportData {
  survey: {
    id: string;
    title: string;
    course_title: string;
  };
  course_info: {
    instructor_name: string | null;
    start_date: string | null;
    end_date: string | null;
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
  generated_at: string;
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

interface SurveyReportContentProps {
  surveyId: string;
}

export default function SurveyReportContent({
  surveyId,
}: SurveyReportContentProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchReportData = useCallback(async () => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}/report`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "리포트 데이터를 불러올 수 없습니다");
        return;
      }

      setReportData(data.data);
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

      // Update report data with AI results
      setReportData((prev) =>
        prev
          ? {
              ...prev,
              ai_summary: data.data.ai_summary,
              ai_insights: data.data.ai_insights,
              ai_recommendations: data.data.ai_recommendations,
            }
          : null
      );
    } catch {
      setError("AI 분석 중 오류가 발생했습니다");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const generatePDF = async () => {
    if (!reportData || !reportRef.current) return;

    setGenerating(true);

    try {
      const reportElement = reportRef.current;

      // Make the hidden report visible temporarily
      reportElement.style.display = "block";
      reportElement.style.position = "absolute";
      reportElement.style.left = "-9999px";
      reportElement.style.top = "0";

      // Wait for rendering
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794, // A4 width in pixels at 96 DPI
        windowWidth: 794,
      });

      // Hide the report again
      reportElement.style.display = "none";

      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // Calculate the height of each page in canvas pixels
      // scale: 2 means canvas is 2x, so we need to account for that
      const scaleFactor = 2;
      const pageHeightInCanvasPixels = (pdfHeight / pdfWidth) * canvasWidth;

      let yPosition = 0;
      let pageNum = 0;

      while (yPosition < canvasHeight) {
        // Calculate how much height to capture for this page
        const remainingHeight = canvasHeight - yPosition;
        const captureHeight = Math.min(
          pageHeightInCanvasPixels,
          remainingHeight
        );

        // Create a temporary canvas for this page slice
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvasWidth;
        pageCanvas.height = captureHeight;

        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          // Draw the appropriate slice of the original canvas
          ctx.drawImage(
            canvas,
            0,
            yPosition, // Source x, y
            canvasWidth,
            captureHeight, // Source width, height
            0,
            0, // Destination x, y
            canvasWidth,
            captureHeight // Destination width, height
          );
        }

        // Convert page canvas to image
        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);

        // Calculate the scaled height for this page in PDF units
        const pageImgScaledHeight =
          (captureHeight / scaleFactor) *
          (pdfWidth / (canvasWidth / scaleFactor));

        // Add new page if not the first
        if (pageNum > 0) {
          pdf.addPage();
        }

        // Add the image to the PDF
        pdf.addImage(pageImgData, "JPEG", 0, 0, pdfWidth, pageImgScaledHeight);

        yPosition += captureHeight;
        pageNum++;
      }

      const fileName = `${reportData.survey.course_title}_${reportData.survey.title}_결과보고서_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("PDF 생성에 실패했습니다");
    } finally {
      setGenerating(false);
    }
  };

  // Clean markdown formatting for display
  const cleanMarkdown = (text: string) => {
    return text
      .replace(/\*\*\[(.+?)\]\*\*/g, "[$1]")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\\n/g, "\n");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--color-muted)]">리포트 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {error || "리포트 데이터를 찾을 수 없습니다"}
          </p>
          <Link href="/surveys" className="btn-primary">
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  const hasAIAnalysis = !!reportData.ai_summary;
  const scaleQuestions = reportData.questions.filter(
    (q) => q.question_type === "scale"
  );
  const textQuestions = reportData.questions.filter(
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
            {reportData.survey.title}
          </Link>
          <span className="text-[var(--color-muted)]">/</span>
          <span className="text-[var(--color-foreground)] font-medium">
            PDF 리포트
          </span>
        </div>
      </header>

      <main className="px-4 pb-8 max-w-2xl mx-auto">
        <div className="glass-card p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2">
            PDF 리포트 다운로드
          </h2>
          <p className="text-[var(--color-muted)] mb-6">
            {reportData.survey.course_title}의 만족도 조사 결과를 PDF로
            다운로드합니다.
          </p>

          {/* Report Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[var(--color-muted)]">과정명:</span>
                <span className="ml-2 font-medium">
                  {reportData.survey.course_title}
                </span>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">설문 제목:</span>
                <span className="ml-2 font-medium">
                  {reportData.survey.title}
                </span>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">응답자 수:</span>
                <span className="ml-2 font-medium">
                  {reportData.summary.respondent_count}명
                </span>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">응답률:</span>
                <span className="ml-2 font-medium">
                  {reportData.summary.response_rate}%
                </span>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">전체 평균:</span>
                <span className="ml-2 font-medium">
                  {(reportData.summary.overall_average ?? 0).toFixed(2)}점
                </span>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">표준편차:</span>
                <span className="ml-2 font-medium">
                  {(reportData.summary.overall_std_deviation ?? 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">문항 수:</span>
                <span className="ml-2 font-medium">
                  {reportData.questions.length}개
                </span>
              </div>
              <div>
                <span className="text-[var(--color-muted)]">AI 분석:</span>
                <span
                  className={`ml-2 font-medium ${hasAIAnalysis ? "text-green-600" : "text-orange-600"}`}
                >
                  {hasAIAnalysis ? "완료" : "미완료"}
                </span>
              </div>
            </div>
          </div>

          {/* AI Analysis Warning */}
          {!hasAIAnalysis && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-orange-700 text-sm mb-3">
                AI 분석 결과가 없습니다. PDF에 AI 분석 결과를 포함하려면 먼저 AI
                분석을 실행해주세요.
              </p>
              <button
                onClick={runAIAnalysis}
                disabled={aiLoading}
                className="btn-secondary text-sm py-2 px-4"
              >
                {aiLoading ? "AI 분석 중..." : "AI 분석 실행"}
              </button>
            </div>
          )}

          {/* Download Button */}
          <button
            onClick={generatePDF}
            disabled={generating}
            className="btn-primary text-lg px-8 py-4 w-full"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                PDF 생성 중...
              </span>
            ) : (
              "PDF 다운로드"
            )}
          </button>

          <p className="text-xs text-[var(--color-muted)] mt-4">
            * PDF에는 응답 현황, {hasAIAnalysis ? "AI 분석 결과, " : ""}
            카테고리별 분석, 문항별 상세 결과, 서술형 응답이 포함됩니다.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex gap-4 mt-6">
          <Link
            href={`/surveys/${surveyId}/stats`}
            className="flex-1 btn-ghost text-center py-3"
          >
            실시간 통계 보기
          </Link>
          <Link
            href={`/surveys/${surveyId}/analysis`}
            className="flex-1 btn-ghost text-center py-3"
          >
            상세 분석 보기
          </Link>
        </div>
      </main>

      {/* Hidden PDF Report Template */}
      <div
        ref={reportRef}
        style={{ display: "none", fontFamily: "'Noto Sans KR', sans-serif" }}
        className="bg-white"
      >
        <div
          style={{ width: "794px", padding: "40px", backgroundColor: "white" }}
        >
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#1a1a2e",
                marginBottom: "10px",
              }}
            >
              교육 만족도 조사 결과 보고서
            </h1>
            <p style={{ fontSize: "18px", color: "#666", marginBottom: "5px" }}>
              {reportData.survey.course_title}
            </p>
            <p style={{ fontSize: "14px", color: "#888" }}>
              {reportData.survey.title}
            </p>
          </div>

          {/* Course Info Box */}
          <div
            style={{
              backgroundColor: "#f5f7fa",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "30px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "12px", color: "#666" }}>
              {reportData.course_info.instructor_name &&
                `강사: ${reportData.course_info.instructor_name}  |  `}
              {reportData.course_info.start_date &&
                reportData.course_info.end_date &&
                `교육기간: ${new Date(reportData.course_info.start_date).toLocaleDateString("ko-KR")} ~ ${new Date(reportData.course_info.end_date).toLocaleDateString("ko-KR")}  |  `}
              보고서 생성일:{" "}
              {new Date(reportData.generated_at).toLocaleDateString("ko-KR")}
            </p>
          </div>

          {/* Summary Section */}
          <div style={{ marginBottom: "30px" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#1a1a2e",
                marginBottom: "15px",
                borderBottom: "2px solid #1a1a2e",
                paddingBottom: "5px",
              }}
            >
              1. 응답 현황 요약
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
              }}
            >
              {[
                {
                  label: "응답자 수",
                  value: `${reportData.summary.respondent_count}명`,
                },
                {
                  label: "목표 인원",
                  value: `${reportData.summary.target_participants}명`,
                },
                {
                  label: "응답률",
                  value: `${reportData.summary.response_rate}%`,
                },
                {
                  label: "전체 평균",
                  value: `${(reportData.summary.overall_average ?? 0).toFixed(2)}점`,
                },
                {
                  label: "표준편차",
                  value: `${(reportData.summary.overall_std_deviation ?? 0).toFixed(2)}`,
                },
                { label: "문항 수", value: `${reportData.questions.length}개` },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "#fafaff",
                    borderRadius: "8px",
                    padding: "15px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: "#1a1a2e",
                      marginBottom: "5px",
                    }}
                  >
                    {item.value}
                  </p>
                  <p style={{ fontSize: "11px", color: "#888" }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Section */}
          {hasAIAnalysis && (
            <div style={{ marginBottom: "30px" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#1a1a2e",
                  marginBottom: "15px",
                  borderBottom: "2px solid #1a1a2e",
                  paddingBottom: "5px",
                }}
              >
                2. AI 분석 결과
              </h2>

              {/* Summary */}
              <div
                style={{
                  backgroundColor: "#f0f5ff",
                  borderRadius: "8px",
                  padding: "15px",
                  marginBottom: "15px",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#2828aa",
                    marginBottom: "8px",
                  }}
                >
                  종합 평가
                </p>
                <p
                  style={{ fontSize: "11px", color: "#444", lineHeight: "1.6" }}
                >
                  {cleanMarkdown(reportData.ai_summary || "")}
                </p>
              </div>

              {/* Insights */}
              {reportData.ai_insights && reportData.ai_insights.length > 0 && (
                <div
                  style={{
                    backgroundColor: "#f0fff5",
                    borderRadius: "8px",
                    padding: "15px",
                    marginBottom: "15px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: "#228b22",
                      marginBottom: "8px",
                    }}
                  >
                    주요 인사이트
                  </p>
                  {reportData.ai_insights.slice(0, 5).map((insight, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: "10px",
                        color: "#444",
                        marginBottom: "5px",
                        lineHeight: "1.5",
                      }}
                    >
                      {i + 1}. {cleanMarkdown(insight)}
                    </p>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {reportData.ai_recommendations &&
                reportData.ai_recommendations.length > 0 && (
                  <div
                    style={{
                      backgroundColor: "#fff8f0",
                      borderRadius: "8px",
                      padding: "15px",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "#c87832",
                        marginBottom: "8px",
                      }}
                    >
                      개선 권장사항
                    </p>
                    {reportData.ai_recommendations.slice(0, 5).map((rec, i) => (
                      <p
                        key={i}
                        style={{
                          fontSize: "10px",
                          color: "#444",
                          marginBottom: "5px",
                          lineHeight: "1.5",
                        }}
                      >
                        {i + 1}. {cleanMarkdown(rec)}
                      </p>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* Category Analysis */}
          <div style={{ marginBottom: "30px" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#1a1a2e",
                marginBottom: "15px",
                borderBottom: "2px solid #1a1a2e",
                paddingBottom: "5px",
              }}
            >
              {hasAIAnalysis ? "3" : "2"}. 카테고리별 분석
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#1a1a2e", color: "white" }}>
                  <th style={{ padding: "10px", textAlign: "left" }}>
                    카테고리
                  </th>
                  <th style={{ padding: "10px", textAlign: "center" }}>
                    문항 수
                  </th>
                  <th style={{ padding: "10px", textAlign: "center" }}>평균</th>
                  <th style={{ padding: "10px", textAlign: "center" }}>
                    표준편차
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.categories.map((cat, i) => (
                  <tr
                    key={cat.category}
                    style={{
                      backgroundColor: i % 2 === 0 ? "#fafafa" : "white",
                    }}
                  >
                    <td style={{ padding: "10px", color: "#444" }}>
                      {cat.label}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        textAlign: "center",
                        color: "#444",
                      }}
                    >
                      {cat.question_count}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        textAlign: "center",
                        color: "#444",
                      }}
                    >
                      {cat.average.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        textAlign: "center",
                        color: "#444",
                      }}
                    >
                      {cat.std_deviation.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Question Details */}
          <div style={{ marginBottom: "30px" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "#1a1a2e",
                marginBottom: "15px",
                borderBottom: "2px solid #1a1a2e",
                paddingBottom: "5px",
              }}
            >
              {hasAIAnalysis ? "4" : "3"}. 문항별 상세 결과
            </h2>
            {scaleQuestions.map((q, index) => (
              <div
                key={q.question_id}
                style={{
                  marginBottom: "20px",
                  paddingBottom: "15px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      backgroundColor: "#1a1a2e",
                      color: "white",
                      borderRadius: "50%",
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#888",
                      marginTop: "4px",
                    }}
                  >
                    [{CATEGORY_LABELS[q.category] || q.category}]
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#333",
                    marginBottom: "8px",
                    marginLeft: "34px",
                  }}
                >
                  {q.question_text}
                </p>
                <p
                  style={{
                    fontSize: "10px",
                    color: "#666",
                    marginLeft: "34px",
                    marginBottom: "8px",
                  }}
                >
                  평균: {q.average?.toFixed(2)} | 중앙값: {q.median} | 최빈값:{" "}
                  {q.mode} | 표준편차: {q.std_deviation?.toFixed(2)} | 응답:{" "}
                  {q.response_count}명
                </p>
                {/* Distribution Bar */}
                {q.distribution && (
                  <div
                    style={{
                      marginLeft: "34px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: "200px",
                        height: "12px",
                        borderRadius: "6px",
                        overflow: "hidden",
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((score) => {
                        const pct =
                          q.response_count > 0
                            ? ((q.distribution?.[score] || 0) /
                                q.response_count) *
                              100
                            : 0;
                        const colors = [
                          "#ef4444",
                          "#f97316",
                          "#eab308",
                          "#22c55e",
                          "#16a34a",
                        ];
                        return pct > 0 ? (
                          <div
                            key={score}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: colors[score - 1],
                            }}
                          />
                        ) : null;
                      })}
                    </div>
                    <div
                      style={{ display: "flex", gap: "8px", fontSize: "9px" }}
                    >
                      {[1, 2, 3, 4, 5].map((score) => {
                        const colors = [
                          "#ef4444",
                          "#f97316",
                          "#eab308",
                          "#22c55e",
                          "#16a34a",
                        ];
                        return (
                          <span
                            key={score}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                backgroundColor: colors[score - 1],
                                borderRadius: "2px",
                              }}
                            />
                            {score}:{q.percentages?.[score] || 0}%
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Text Responses */}
          {textQuestions.length > 0 && (
            <div style={{ marginBottom: "30px" }}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#1a1a2e",
                  marginBottom: "15px",
                  borderBottom: "2px solid #1a1a2e",
                  paddingBottom: "5px",
                }}
              >
                {hasAIAnalysis ? "5" : "4"}. 서술형 응답
              </h2>
              {textQuestions.map((q, qIndex) => (
                <div key={q.question_id} style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: "#9333ea",
                        color: "white",
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        flexShrink: 0,
                      }}
                    >
                      {qIndex + 1}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#333",
                      marginBottom: "5px",
                      marginLeft: "34px",
                    }}
                  >
                    {q.question_text}
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "#888",
                      marginBottom: "10px",
                      marginLeft: "34px",
                    }}
                  >
                    ({q.text_responses?.length || 0}개 응답)
                  </p>
                  {q.text_responses?.slice(0, 10).map((text, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: "#fafafa",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        marginBottom: "5px",
                        marginLeft: "34px",
                      }}
                    >
                      <p style={{ fontSize: "10px", color: "#444" }}>
                        <span style={{ color: "#888", marginRight: "8px" }}>
                          #{i + 1}
                        </span>
                        &quot;{text}&quot;
                      </p>
                    </div>
                  ))}
                  {(q.text_responses?.length || 0) > 10 && (
                    <p
                      style={{
                        fontSize: "10px",
                        color: "#888",
                        marginLeft: "34px",
                      }}
                    >
                      외 {(q.text_responses?.length || 0) - 10}개 응답...
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              paddingTop: "20px",
              borderTop: "1px solid #eee",
            }}
          >
            <p style={{ fontSize: "10px", color: "#aaa" }}>
              HRD Survey Pro - 교육 만족도 조사 시스템
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
