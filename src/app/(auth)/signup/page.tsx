import { redirect } from "next/navigation";

// 회원가입 페이지는 비활성화됨 - 마스터 전용 시스템
// 모든 접근을 로그인 페이지로 리다이렉트
export default function SignupPage() {
  redirect("/login");
}
