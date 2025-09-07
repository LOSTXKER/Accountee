// src/app/dashboard/[businessId]/sales/print/layout.tsx
"use client";

import React from 'react';
import '../../../../globals.css'; // Import global styles

// --- ✅ [แก้ไข] เปลี่ยนจาก React.React.Node เป็น React.ReactNode ---
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
          }
        }
      `}</style>
      {children}
    </>
  );
}