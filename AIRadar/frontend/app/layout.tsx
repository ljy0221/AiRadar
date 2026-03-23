import type { Metadata } from "next";
import { Space_Grotesk, Inter, Noto_Serif_KR, Syne } from "next/font/google";
import "./globals.css";
import { MainLayout } from "../components/layout";
import { Providers } from "./providers";

// 제목용 테크 폰트 (Space Grotesk)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif", // CSS 변수명 유지 (globals.css, HeroSection과 호환)
});

// 본문용 고딕 폰트 (Inter)
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

// 한글 폰트 (Noto Serif KR - 명조체 계열)
const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-korean",
});

// AI Radar 로고 타이틀용 폰트 (Syne)
const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "AI Radar",
  description: "AI 트렌드 분석 및 예측 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${notoSerifKR.variable} ${syne.variable} font-sans`}>
        <Providers>
          <MainLayout>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  );
}
