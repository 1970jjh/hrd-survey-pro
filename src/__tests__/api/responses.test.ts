/**
 * 응답 API 테스트
 * @jest-environment node
 */

import { NextRequest } from "next/server";

// Mock nanoid
jest.mock("nanoid", () => ({
  nanoid: jest.fn(() => "mock-session-id"),
}));

// Mock Supabase SSR
const mockFromChain = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(),
  limit: jest.fn().mockReturnThis(),
};

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => mockFromChain),
};

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
}));

describe("응답 API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/s/[code]", () => {
    it("공개 설문 조회 성공 (활성 상태)", async () => {
      const mockSurvey = {
        id: "survey-1",
        title: "교육 만족도 조사",
        description: "설문 설명",
        status: "active",
        url_code: "abc123",
        scale_type: 5,
        courses: {
          title: "리더십 교육",
          instructor: "김강사",
        },
        questions: [
          {
            id: "q-1",
            question_text: "교육 내용에 만족하십니까?",
            question_type: "scale",
            order_num: 1,
          },
        ],
      };

      mockFromChain.single.mockResolvedValue({
        data: mockSurvey,
        error: null,
      });

      const { GET } = await import("@/app/api/s/[code]/route");

      const request = new NextRequest("http://localhost:3000/api/s/abc123");
      const response = await GET(request, {
        params: Promise.resolve({ code: "abc123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("교육 만족도 조사");
      expect(data.data.questions).toHaveLength(1);
    });

    it("비활성 설문 접근 시 에러", async () => {
      const mockSurvey = {
        id: "survey-1",
        title: "교육 만족도 조사",
        status: "closed",
        url_code: "abc123",
      };

      mockFromChain.single.mockResolvedValue({
        data: mockSurvey,
        error: null,
      });

      const { GET } = await import("@/app/api/s/[code]/route");

      const request = new NextRequest("http://localhost:3000/api/s/abc123");
      const response = await GET(request, {
        params: Promise.resolve({ code: "abc123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("종료");
    });

    it("존재하지 않는 설문 코드 접근 시 에러", async () => {
      mockFromChain.single.mockResolvedValue({
        data: null,
        error: { message: "Not found", code: "PGRST116" },
      });

      const { GET } = await import("@/app/api/s/[code]/route");

      const request = new NextRequest("http://localhost:3000/api/s/invalid");
      const response = await GET(request, {
        params: Promise.resolve({ code: "invalid" }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/s/[code]/submit", () => {
    it("응답 제출 성공", async () => {
      // Mock survey fetch
      mockFromChain.single.mockResolvedValueOnce({
        data: {
          id: "survey-1",
          status: "active",
          questions: [
            { id: "q-1", question_type: "scale", is_required: true },
            { id: "q-2", question_type: "text", is_required: false },
          ],
        },
        error: null,
      });

      // Mock response insert
      mockFromChain.select.mockResolvedValueOnce({
        data: [
          { id: "resp-1", question_id: "q-1", answer_value: 5 },
          { id: "resp-2", question_id: "q-2", answer_text: "좋았습니다" },
        ],
        error: null,
      });

      const { POST } = await import("@/app/api/s/[code]/submit/route");

      const request = new NextRequest(
        "http://localhost:3000/api/s/abc123/submit",
        {
          method: "POST",
          body: JSON.stringify({
            responses: [
              { question_id: "q-1", answer_value: 5 },
              { question_id: "q-2", answer_text: "좋았습니다" },
            ],
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ code: "abc123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it("필수 질문 누락 시 에러", async () => {
      mockFromChain.single.mockResolvedValueOnce({
        data: {
          id: "survey-1",
          status: "active",
          questions: [
            { id: "q-1", question_type: "scale", is_required: true },
            { id: "q-2", question_type: "text", is_required: true },
          ],
        },
        error: null,
      });

      const { POST } = await import("@/app/api/s/[code]/submit/route");

      const request = new NextRequest(
        "http://localhost:3000/api/s/abc123/submit",
        {
          method: "POST",
          body: JSON.stringify({
            responses: [
              { question_id: "q-1", answer_value: 5 },
              // q-2 누락
            ],
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ code: "abc123" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("필수");
    });

    it("비활성 설문에 응답 제출 시 에러", async () => {
      mockFromChain.single.mockResolvedValueOnce({
        data: {
          id: "survey-1",
          status: "closed",
          questions: [],
        },
        error: null,
      });

      const { POST } = await import("@/app/api/s/[code]/submit/route");

      const request = new NextRequest(
        "http://localhost:3000/api/s/abc123/submit",
        {
          method: "POST",
          body: JSON.stringify({
            responses: [],
          }),
        }
      );

      const response = await POST(request, {
        params: Promise.resolve({ code: "abc123" }),
      });

      expect(response.status).toBe(403);
    });
  });
});

describe("응답 통계 API", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });
  });

  describe("GET /api/surveys/[id]/responses", () => {
    it("응답 목록 조회 성공", async () => {
      const mockResponses = [
        {
          id: "resp-1",
          session_id: "session-1",
          question_id: "q-1",
          answer_value: 5,
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "resp-2",
          session_id: "session-1",
          question_id: "q-2",
          answer_text: "매우 유익했습니다",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFromChain.order.mockResolvedValue({
        data: mockResponses,
        error: null,
      });

      const { GET } = await import("@/app/api/surveys/[id]/responses/route");

      const request = new NextRequest(
        "http://localhost:3000/api/surveys/survey-1/responses"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "survey-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("인증되지 않은 사용자 접근 시 에러", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const { GET } = await import("@/app/api/surveys/[id]/responses/route");

      const request = new NextRequest(
        "http://localhost:3000/api/surveys/survey-1/responses"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "survey-1" }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/surveys/[id]/stats", () => {
    it("설문 통계 조회 성공", async () => {
      // Mock survey with questions
      mockFromChain.single.mockResolvedValueOnce({
        data: {
          id: "survey-1",
          questions: [
            { id: "q-1", question_type: "scale", question_text: "만족도" },
          ],
        },
        error: null,
      });

      // Mock responses
      mockFromChain.in.mockResolvedValueOnce({
        data: [
          { question_id: "q-1", answer_value: 5, session_id: "s1" },
          { question_id: "q-1", answer_value: 4, session_id: "s2" },
          { question_id: "q-1", answer_value: 5, session_id: "s3" },
        ],
        error: null,
      });

      const { GET } = await import("@/app/api/surveys/[id]/stats/route");

      const request = new NextRequest(
        "http://localhost:3000/api/surveys/survey-1/stats"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "survey-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
