// src/app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (password.length < 6) {
        setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
        return;
    }

    setIsLoading(true);
    try {
      // ใช้ production URL หากอยู่ใน production environment
      const redirectUrl = process.env.NODE_ENV === 'production' 
        ? 'https://accountee.vercel.app/dashboard'
        : `${window.location.origin}/dashboard`;
        
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      if (error) throw error;
      setIsSuccess(true);
    } catch (err: any) {
      if (err.message.includes('User already registered')) {
        setError("อีเมลนี้ถูกใช้งานแล้ว");
      } else {
        setError("เกิดข้อผิดพลาดในการสมัครสมาชิก: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-800">การลงทะเบียนสำเร็จ!</h1>
        <p className="text-gray-600">
          เราได้ส่งอีเมลยืนยันไปยัง <span className="font-semibold">{email}</span> แล้ว
          กรุณาตรวจสอบกล่องจดหมายและคลิกลิงก์เพื่อยืนยันบัญชีของคุณ
        </p>
        <Link href="/login" className="inline-block mt-4 px-6 py-2 text-white bg-brand-600 rounded-lg hover:bg-brand-700">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">สร้างบัญชีใหม่</h1>
        <p className="mt-2 text-gray-500">เริ่มต้นใช้งาน Accountee วันนี้</p>
      </div>
      <form onSubmit={handleRegister} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="email">อีเมล</label>
          <input
            id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="password">รหัสผ่าน</label>
          <input
            id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="อย่างน้อย 6 ตัวอักษร"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="confirmPassword">ยืนยันรหัสผ่าน</label>
          <input
            id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <button
          type="submit" disabled={isLoading}
          className="w-full flex justify-center items-center gap-2 px-4 py-3 font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:bg-brand-300"
        >
          {isLoading ? 'กำลังสร้างบัญชี...' : <><UserPlus size={18} /> สมัครสมาชิก</>}
        </button>
      </form>
      <p className="text-sm text-center text-gray-500">
        มีบัญชีอยู่แล้ว?{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          เข้าสู่ระบบที่นี่
        </Link>
      </p>
    </div>
  );
}
