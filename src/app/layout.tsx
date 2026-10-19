import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "시험 맞춤 암기 도우미",
  description: "시험에 필요한 만큼 정확하게 공부하는 AI 암기 도우미",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold text-brand-700">
              시험 맞춤 암기 도우미
            </Link>
            <Link href="/new" className="text-sm text-slate-600 hover:text-brand-600">
              + 새 학습
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
