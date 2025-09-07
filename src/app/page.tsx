// src/app/page.tsx
"use client";

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // รอให้การตรวจสอบสถานะ login เสร็จสิ้นก่อน
    if (!loading) {
      if (user) {
        // ถ้ามี user (login อยู่), ให้ redirect ไปหน้าเลือกธุรกิจ
        router.push('/dashboard');
      } else {
        // ถ้าไม่มี user, ให้ redirect ไปหน้า login
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // แสดงหน้า loading ขณะกำลังตรวจสอบ
  return (
    <div className="flex justify-center items-center h-screen bg-slate-50">
      <p className="text-gray-600">กำลังตรวจสอบสถานะการเข้าสู่ระบบ...</p>
    </div>
  );
}