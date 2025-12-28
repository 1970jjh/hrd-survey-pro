/**
 * 설문 API 테스트
 * @jest-environment node
 */

import { NextRequest } from "next/server";

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

describe("설문 API", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });
  });

  describe("GET /api/surveys", () => {
    it("설문 목록 조회 성공", async () => {
      const mockSurveys = [
        {
          id: "survey-1",
          title: "교육 만족도 조사",
          status: "active",
          created_at: "2024-01-01T00:00:00Z",
          courses: { title: "리더십 교육" },
        },
        {
          id: "survey-2",
          title: "강의 평가",
          status: "draft",
          created_at: "2024-01-02T00:00:00Z",
          courses: { title: "커뮤니케이션 스킬" },
        },
      ];

      mockFromChain.order.mockResolvedValue({
        data: mockSurveys,
        error: null,
      });

      const { GET } = await import("@/app/api/surveys/route");

      const request = new NextRequest("http://localhost:3000/api/surveys");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
    });

    it("인증되지 않은 사용자 접근 시 에러", async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const { GET } = await import("@/app/api/surveys/route");

      const request = new NextRequest("http://localhost:3000/api/surveys");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/surveys", () => {
    it("설문 생성 성공", async () => {
      const mockNewSurvey = {
        id: "new-survey-123",
        title: "신규 설문",
        course_id: "course-1",
        status: "draft",
      };

      mockFromChain.single.mockResolvedValue({
        data: mockNewSurvey,
        error: null,
      });

      const { POST } = await import("@/app/api/surveys/route");

      const request = new NextRequest("http://localhost:3000/api/surveys", {
        method: "POST",
        body: JSON.stringify({
          title: "신규 설문",
          course_id: "course-1",
          scale_type: 5,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("new-survey-123");
    });

    it("필수 필드 누락 시 에러", async () => {
      const { POST } = await import("@/app/api/surveys/route");

      const request = new NextRequest("http://localhost:3000/api/surveys", {
        method: "POST",
        body: JSON.stringify({
          // title 누락
          course_id: "course-1",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/surveys/[id]", () => {
    it("설문 상세 조회 성공", async () => {
      const mockSurvey = {
        id: "survey-1",
        title: "교육 만족도 조사",
        status: "active",
        course_id: "course-1",
        questions: [
          {
            id: "q-1",
            question_text: "강사에 만족하십니까?",
            question_type: "scale",
          },
        ],
      };

      mockFromChain.single.mockResolvedValue({
        data: mockSurvey,
        error: null,
      });

      const { GET } = await import("@/app/api/surveys/[id]/route");

      const request = new NextRequest(
        "http://localhost:3000/api/surveys/survey-1"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "survey-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe("survey-1");
    });

    it("존재하지 않는 설문 조회 시 에러", async () => {
      mockFromChain.single.mockResolvedValue({
        data: null,
        error: { message: "Not found", code: "PGRST116" },
      });

      const { GET } = await import("@/app/api/surveys/[id]/route");

      const request = new NextRequest(
        "http://localhost:3000/api/surveys/nonexistent"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/surveys/[id]", () => {
    it("설문 수정 성공", async () => {
      const mockUpdatedSurvey = {
        id: "survey-1",
        title: "수정된 설문 제목",
        status: "active",
      };

      mockFromChain.single.mockResolvedValue({
        data: mockUpdatedSurvey,
        error: null,
      });

      const { PATCH } = await import("@/app/api/surveys/[id]/route");

      const request = new NextRequest(
        "http://localhost:3000/api/surveys/survey-1",
        {
          method: "PATCH",
          body: JSON.stringify({
            title: "수정된 설문 제목",
          }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "survey-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.title).toBe("수정된 설문 제목");
    });
  });

  describe("DELETE /api/surveys/[id]", () => {
    it("설문 삭제 성공", async () => {
      mockFromChain.eq.mockResolvedValue({
        error: null,
      });

      const { DELETE } = await import("@/app/api/surveys/[id]/route");

      const request = new NextRequest(
        "http://localhost:3000/api/surveys/survey-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ id: "survey-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe("설문 상태 변경 API", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
    });
  });

  describe("PATCH /api/surveys/[id]/status", () => {
    it("설문 활성화 성공", async () => {
      mockFromChain.single.mockResolvedValue({
        data: { id: "survey-1", status: "active" },
        error: null,
      });

      const { PATCH } = await import("@/app/api/surveys/[id]/status/route");

      const request = new NextRequest(
        "http://localhost:3000/api/surveys/survey-1/status",
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "active",
          }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "survey-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe("active");
    });

    it("유효하지 않은 상태로 변경 시 에러", async () => {
      const { PATCH } = await import("@/app/api/surveys/[id]/status/route");

      const request = new NextRequest(
        "http://localhost:3000/api/surveys/survey-1/status",
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "invalid_status",
          }),
        }
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ id: "survey-1" }),
      });

      expect(response.status).toBe(400);
    });
  });
});
