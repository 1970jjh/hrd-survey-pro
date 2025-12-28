/**
 * 인증 API 테스트
 * @jest-environment node
 */

import { NextRequest } from "next/server";

// Mock Supabase SSR
const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
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

describe("인증 API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("유효한 자격 증명으로 로그인 성공", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: { access_token: "token" } },
        error: null,
      });

      // 실제 API 핸들러를 동적으로 import
      const { POST } = await import("@/app/api/auth/login/route");

      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toEqual(mockUser);
    });

    it("잘못된 자격 증명으로 로그인 실패", async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid login credentials" },
      });

      const { POST } = await import("@/app/api/auth/login/route");

      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "wrongpassword",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it("이메일 누락 시 에러 반환", async () => {
      const { POST } = await import("@/app/api/auth/login/route");

      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          password: "password123",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("POST /api/auth/register", () => {
    it("유효한 정보로 회원가입 성공", async () => {
      const mockUser = {
        id: "new-user-123",
        email: "newuser@example.com",
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { POST } = await import("@/app/api/auth/register/route");

      const request = new NextRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            email: "newuser@example.com",
            password: "password123",
            name: "테스트 사용자",
            company: "테스트 회사",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("이미 존재하는 이메일로 회원가입 실패", async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: "User already registered" },
      });

      const { POST } = await import("@/app/api/auth/register/route");

      const request = new NextRequest(
        "http://localhost:3000/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            email: "existing@example.com",
            password: "password123",
            name: "테스트 사용자",
            company: "테스트 회사",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("POST /api/auth/logout", () => {
    it("로그아웃 성공", async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      });

      const { POST } = await import("@/app/api/auth/logout/route");

      const request = new NextRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
