// src/app/error.tsx
"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-red-700">เกิดข้อผิดพลาด</h1>
      <p className="max-w-md text-red-600">{error.message}</p>
      <div className="flex gap-3">
        <button
          className="rounded bg-gray-100 px-4 py-2 text-gray-700 shadow hover:bg-gray-200"
          onClick={() => window.history.back()}
        >
          ย้อนกลับ
        </button>
        <button
          className="rounded bg-red-600 px-4 py-2 text-white shadow hover:bg-red-700"
          onClick={() => reset()}
        >
          ลองใหม่
        </button>
      </div>
    </div>
  );
}
