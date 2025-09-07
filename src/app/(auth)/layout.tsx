// src/app/(auth)/layout.tsx
import React from 'react';

// Layout สำหรับหน้า Login และ Register
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
