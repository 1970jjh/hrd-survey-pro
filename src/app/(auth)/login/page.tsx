"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const { signIn, loading } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn(formData.email, formData.password);

    if (result.success) {
      router.push(redirect);
      router.refresh();
    } else {
      setError(result.error || "로그인에 실패했습니다");
    }
  };

  return (
    <>
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-400 border-3 border-black shadow-[4px_4px_0px_#0a0a0a] text-black font-bold uppercase text-sm">
          {error}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-bold uppercase tracking-wide text-black mb-2"
          >
            이메일
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-4 py-3 bg-white border-3 border-black font-medium transition-all duration-100 focus:outline-none focus:shadow-[4px_4px_0px_#0a0a0a] focus:translate-x-[-2px] focus:translate-y-[-2px] disabled:opacity-50"
            placeholder="master@example.com"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-bold uppercase tracking-wide text-black mb-2"
          >
            비밀번호
          </label>
          <input
            type="password"
            id="password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full px-4 py-3 bg-white border-3 border-black font-medium transition-all duration-100 focus:outline-none focus:shadow-[4px_4px_0px_#0a0a0a] focus:translate-x-[-2px] focus:translate-y-[-2px] disabled:opacity-50"
            placeholder="••••••••"
            required
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[var(--color-primary)] text-white font-bold uppercase tracking-wide border-3 border-black shadow-[4px_4px_0px_#0a0a0a] transition-all duration-100 hover:shadow-[6px_6px_0px_#0a0a0a] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="animate-spin h-5 w-5 border-3 border-white border-t-transparent" />
              로그인 중...
            </>
          ) : (
            "로그인"
          )}
        </button>
      </form>
    </>
  );
}

function LoginFormFallback() {
  return (
    <div className="space-y-6">
      <div className="h-20 bg-gray-200 border-3 border-black animate-pulse" />
      <div className="h-20 bg-gray-200 border-3 border-black animate-pulse" />
      <div className="h-14 bg-gray-200 border-3 border-black animate-pulse" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white border-3 border-black shadow-[8px_8px_0px_#0a0a0a] p-8 w-full max-w-md animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-[var(--color-primary)] px-4 py-2 border-3 border-black shadow-[4px_4px_0px_#0a0a0a] mb-4">
            <span className="text-white text-2xl font-black">HRD</span>
          </div>
          <Link href="/" className="block">
            <h1 className="text-3xl font-black uppercase tracking-tight text-black">
              Survey Pro
            </h1>
          </Link>
          <p className="text-black font-bold uppercase tracking-wide mt-2 text-sm">
            마스터 로그인
          </p>
        </div>

        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t-3 border-black">
          <p className="text-center text-xs font-bold uppercase tracking-wide text-gray-600">
            이 시스템은 마스터 관리자 전용입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
