// src/app/layout.tsx
import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const sarabun = Sarabun({
  subsets: ["latin", "thai"],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sarabun',
});

export const metadata: Metadata = {
  title: "Accountee - โปรแกรมบัญชีสำหรับธุรกิจคุณ",
  description: "จัดการบัญชี รายรับ-รายจ่าย ได้อย่างง่ายดายและเป็นระบบ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} font-sans`}>
        <Providers>
          {children}
        </Providers>
        {/* ✅ [เพิ่ม] เพิ่ม div นี้เข้าไปเป็นปลายทางของ Portal */}
        <div id="modal-root"></div>
      </body>
    </html>
  );
}