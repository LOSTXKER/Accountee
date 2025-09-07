// src/app/not-found.tsx
"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-6 text-center">
      <h1 className="text-2xl font-semibold text-gray-800">ไม่พบหน้าที่คุณต้องการ (404)</h1>
      <p className="max-w-md text-gray-600">
        หน้าที่คุณกำลังค้นหาอาจถูกลบ ย้ายที่อยู่ หรือไม่มีอยู่จริง
      </p>
      <Link
        href="/"
        className="rounded bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700"
      >
        กลับหน้าแรก
      </Link>
    </div>
  );
}
