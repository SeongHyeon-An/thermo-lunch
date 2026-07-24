import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "수서한끼 — 광평로 281 오피스 맛집",
  description: "광평로 281 사무실 인근 맛집을 함께 찾고 기록하는 오피스 푸드 가이드",
  openGraph: {
    title: "수서한끼",
    description: "오늘 점심, 가까운 곳부터. 광평로 281 오피스 맛집 가이드",
    images: [{ url: "/og.png", width: 1536, height: 1024, alt: "수서한끼 맛집 가이드" }],
  },
  twitter: { card: "summary_large_image", title: "수서한끼", description: "광평로 281 오피스 맛집 가이드", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
