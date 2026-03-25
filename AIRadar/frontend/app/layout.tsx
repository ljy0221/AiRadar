import type { Metadata } from "next";
import { Space_Grotesk, Exo_2, IBM_Plex_Sans_KR, Audiowide } from "next/font/google";
import "./globals.css";
import { MainLayout } from "../components/layout";
import { Providers } from "./providers";

// 제목용 테크 폰트 (Space Grotesk)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif", // CSS 변수명 유지 (globals.css, HeroSection과 호환)
});

// 본문용 영문 폰트 (Exo 2)
const exo2 = Exo_2({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-exo2-next",
});

// 한글 폰트 (IBM Plex Sans KR)
const ibmPlexSansKR = IBM_Plex_Sans_KR({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-korean",
  display: 'swap',
  preload: false,
});

// AI Radar 로고 타이틀용 폰트 (Audiowide)
const audiowide = Audiowide({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-audiowide-next",
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
      <body className={`${spaceGrotesk.variable} ${exo2.variable} ${ibmPlexSansKR.variable} ${audiowide.variable} font-sans`}>
        <div className="scanlines" />
        <Providers>
          <MainLayout>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  );
}
