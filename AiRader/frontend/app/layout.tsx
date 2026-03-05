import type { Metadata } from "next";
import "./globals.css";
import { MainLayout } from "../components/layout";

export const metadata: Metadata = {
  title: "AI Trend Radar",
  description: "AI 트렌드 분석 및 예측 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
