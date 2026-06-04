import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Game Jam — 互动叙事冒险",
  description: "一个由 AI 主持的网页互动叙事冒险游戏。选一个剧本，开始你的故事。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
