import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4F46E5",
};

export const metadata: Metadata = {
  title: {
    default: "HRD Survey Pro - 기업교육 설문조사 시스템",
    template: "%s | HRD Survey Pro",
  },
  description:
    "AI를 활용하여 교육 만족도 설문을 손쉽게 생성하고, 실시간 집계와 분석을 제공하는 올인원 설문 플랫폼",
  keywords: [
    "설문조사",
    "기업교육",
    "HRD",
    "만족도 조사",
    "AI 설문",
    "교육평가",
    "만족도분석",
  ],
  authors: [{ name: "JJ CREATIVE 교육연구소" }],
  creator: "JJ CREATIVE Edu with AI",
  publisher: "JJ CREATIVE 교육연구소",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "HRD Survey Pro - 기업교육 설문조사 시스템",
    description:
      "AI를 활용하여 교육 만족도 설문을 손쉽게 생성하고, 실시간 집계와 분석을 제공하는 올인원 설문 플랫폼",
    type: "website",
    locale: "ko_KR",
    siteName: "HRD Survey Pro",
  },
  twitter: {
    card: "summary_large_image",
    title: "HRD Survey Pro - 기업교육 설문조사 시스템",
    description: "AI 기반 교육 만족도 설문 시스템",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${notoSansKR.variable} font-sans antialiased`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
