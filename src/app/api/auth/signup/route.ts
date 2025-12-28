// HRD Survey Pro - Signup API Route
// 마스터 전용 시스템이므로 회원가입은 비활성화됩니다.
import { NextResponse } from "next/server";

export async function POST() {
  // 회원가입은 비활성화되었습니다 - 마스터 전용 시스템
  return NextResponse.json(
    { error: "회원가입이 비활성화되었습니다. 마스터에게 문의하세요." },
    { status: 403 }
  );
}
