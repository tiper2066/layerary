import type { Metadata } from "next";
import "./pretendard.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "LAYERARY",
  description: "펜타시큐리티의 디자인 작업물을 리뷰하고 리소스를 검색, 편집, 다운로드할 수 있는 중앙 집중식 플랫폼",
  icons: {
    icon: '/img/favicon.png', // public 폴더 안의 파일 경로
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className="font-sans">
      <body className={`font-sans antialiased min-h-screen bg-background`}>
        <Providers>{children}</Providers></body>
    </html>
  );
}

