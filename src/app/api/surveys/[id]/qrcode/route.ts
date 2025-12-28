// HRD Survey Pro - QR Code Generation API
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSurvey } from "@/lib/firebase";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/surveys/[id]/qrcode - QR코드 이미지 생성
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get survey
    const survey = await getSurvey(id);
    if (!survey) {
      return NextResponse.json(
        { error: "설문을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Get format from query params
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "png";
    const size = parseInt(searchParams.get("size") || "300");

    // Build survey URL
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";
    const surveyUrl = `${baseUrl}/s/${survey.uniqueCode}`;

    if (format === "svg") {
      // Return SVG
      const svg = await QRCode.toString(surveyUrl, {
        type: "svg",
        width: size,
        margin: 2,
        color: {
          dark: "#1a1a2e",
          light: "#ffffff",
        },
      });

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `inline; filename="survey-qr-${survey.uniqueCode}.svg"`,
        },
      });
    } else if (format === "dataurl") {
      // Return data URL (for embedding in HTML)
      const dataUrl = await QRCode.toDataURL(surveyUrl, {
        width: size,
        margin: 2,
        color: {
          dark: "#1a1a2e",
          light: "#ffffff",
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          url: surveyUrl,
          qrcode: dataUrl,
        },
      });
    } else {
      // Return PNG
      const buffer = await QRCode.toBuffer(surveyUrl, {
        type: "png",
        width: size,
        margin: 2,
        color: {
          dark: "#1a1a2e",
          light: "#ffffff",
        },
      });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="survey-qr-${survey.uniqueCode}.png"`,
        },
      });
    }
  } catch (error) {
    console.error("Generate QR code error:", error);
    return NextResponse.json(
      { error: "QR 코드 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
