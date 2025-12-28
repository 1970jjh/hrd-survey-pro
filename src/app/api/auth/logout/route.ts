// HRD Survey Pro - Logout API Route
// Firebase 클라이언트 SDK를 사용하므로 이 라우트는 더 이상 필요하지 않습니다.
// 호환성을 위해 유지합니다.
import { NextResponse } from "next/server";

export async function POST() {
  // Firebase 로그아웃은 클라이언트에서 직접 처리됩니다.
  return NextResponse.json({
    success: true,
    message: "로그아웃되었습니다",
  });
}
