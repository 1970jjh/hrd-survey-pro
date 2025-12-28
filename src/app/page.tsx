import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <main className="glass-card p-8 md:p-12 max-w-2xl w-full text-center animate-fadeIn">
        {/* Logo / Title */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-primary)] mb-2">
            HRD Survey Pro
          </h1>
          <p className="text-[var(--color-muted)] text-lg">
            기업교육 설문조사 시스템
          </p>
        </div>

        {/* Description */}
        <p className="text-[var(--color-foreground)] text-lg mb-8 leading-relaxed">
          AI를 활용하여 교육 만족도 설문을 손쉽게 생성하고,
          <br className="hidden md:block" />
          실시간 집계와 분석을 제공하는 올인원 설문 플랫폼
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-lg bg-white/50">
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="font-semibold text-[var(--color-foreground)]">
              AI 설문 생성
            </h3>
            <p className="text-sm text-[var(--color-muted)]">
              교육 내용 기반 자동 생성
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white/50">
            <div className="text-3xl mb-2">📱</div>
            <h3 className="font-semibold text-[var(--color-foreground)]">
              QR 코드 배포
            </h3>
            <p className="text-sm text-[var(--color-muted)]">
              모바일 최적화 응답
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white/50">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-semibold text-[var(--color-foreground)]">
              실시간 분석
            </h3>
            <p className="text-sm text-[var(--color-muted)]">
              AI 기반 인사이트 제공
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            관리자 로그인
          </Link>
          <Link
            href="/signup"
            className="btn-ghost inline-flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            회원가입
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-12 text-sm text-[var(--color-muted)]">
          &copy; 2025 JJ CREATIVE 교육연구소. All Rights Reserved.
        </p>
      </main>
    </div>
  );
}
