import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "樹木地図 - 名木・巨木マップ",
  description: "日本全国の名木・巨木を地図上で探索し、樹木医の評価や訪問記録を共有するサービスです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <nav className="navbar">
          <Link href="/" className="navbar-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V12"/>
              <path d="M12 12C12 12 8 9 8 6a4 4 0 0 1 8 0c0 3-4 6-4 6z"/>
              <path d="M12 12C12 12 16 9.5 17 7"/>
              <path d="M12 12C12 12 8 10 7 8"/>
              <path d="M9 22h6"/>
            </svg>
            樹木地図
            <span className="navbar-subtitle">名木・巨木マップ</span>
          </Link>
          <div className="navbar-spacer" />
          <Link href="/" className="navbar-link">
            <span className="nav-label">🗺️ 地図</span>
          </Link>
          <Link href="/admin/import" className="navbar-link">
            <span className="nav-label">📥 CSV取込</span>
          </Link>
          <Link href="/admin/geocode" className="navbar-link">
            <span className="nav-label">📍 ジオコード</span>
          </Link>
          <Link href="/trees/new" className="btn-primary">
            ＋ 樹木を登録
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
