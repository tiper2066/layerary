import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LAYERARY - 펜타시큐리티 디자인 자산 관리 포털",
  description: "펜타시큐리티의 디자인 작업물을 리뷰하고 리소스를 검색, 편집, 다운로드할 수 있는 중앙 집중식 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}

