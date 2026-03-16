import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Peers Recruit - AI採用アシスタント | 株式会社ピアズ",
  description: "AIを活用した採用業務支援ツール。ペルソナ設計・求人票作成・スカウト文章・書類選考・面接質問・合否判定まで一気通貫。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
