// src/app/global-error.tsx
"use client";

import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-red-50 p-6 text-center">
          <h1 className="text-2xl font-semibold text-red-700">เกิดข้อผิดพลาดภายในระบบ</h1>
          <p className="max-w-md text-red-600">{error.message}</p>
          <button
            className="rounded bg-red-600 px-4 py-2 text-white shadow hover:bg-red-700"
            onClick={() => (window.location.href = "/")}
          >
            กลับหน้าแรก
          </button>
        </div>
      </body>
    </html>
  );
}
