// src/app/debug/auth/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthDebugPage() {
    const [email, setEmail] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [currentUrl, setCurrentUrl] = useState('');
    
    const supabase = createClient();

    // ใช้ useEffect เพื่อแก้ hydration error
    useEffect(() => {
        setCurrentUrl(window.location.origin);
    }, []);

    const testSignup = async () => {
        if (!email) {
            alert('กรุณาใส่อีเมลก่อนทดสอบ');
            return;
        }
        
        setLoading(true);
        setResult(null);
        
        try {
            console.log('เริ่มทดสอบการสมัครสมาชิกด้วยอีเมล:', email);
            
            // ลองส่งแบบไม่มี emailRedirectTo ก่อน
            const { data, error } = await supabase.auth.signUp({
                email,
                password: 'test123456'
            });
            
            console.log('ผลลัพธ์จาก Supabase:', { data, error });
            
            setResult({
                success: !error,
                data: data,
                error: error?.message,
                timestamp: new Date().toLocaleString('th-TH'),
                supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
                note: 'ทดสอบแบบไม่ใส่ redirect URL'
            });
        } catch (err: any) {
            console.error('เกิดข้อผิดพลาด:', err);
            setResult({
                success: false,
                error: err.message,
                timestamp: new Date().toLocaleString('th-TH')
            });
        } finally {
            setLoading(false);
        }
    };

    const testSignupWithRedirect = async () => {
        if (!email) {
            alert('กรุณาใส่อีเมลก่อนทดสอบ');
            return;
        }
        
        setLoading(true);
        setResult(null);
        
        try {
            console.log('เริ่มทดสอบการสมัครสมาชิกแบบมี redirect:', email);
            
            // ใช้ production URL หากอยู่ใน production environment
            const redirectUrl = process.env.NODE_ENV === 'production' 
                ? 'https://accountee.vercel.app/auth/callback'
                : `${currentUrl}/auth/callback`;
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password: 'test123456',
                options: {
                    emailRedirectTo: redirectUrl
                }
            });
            
            console.log('ผลลัพธ์จาก Supabase with redirect:', { data, error });
            
            setResult({
                success: !error,
                data: data,
                error: error?.message,
                timestamp: new Date().toLocaleString('th-TH'),
                supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
                redirectUrl: redirectUrl,
                note: 'ทดสอบแบบมี redirect URL (auto-detect environment)'
            });
        } catch (err: any) {
            console.error('เกิดข้อผิดพลาด:', err);
            setResult({
                success: false,
                error: err.message,
                timestamp: new Date().toLocaleString('th-TH')
            });
        } finally {
            setLoading(false);
        }
    };

    const checkEmailSettings = async () => {
        setLoading(true);
        try {
            // ตรวจสอบการตั้งค่า auth
            const { data: authSettings } = await supabase.auth.getSession();
            
            // ลองส่งอีเมล reset password เพื่อทดสอบ email service
            const testEmail = 'test-email-send@example.com';
            const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail);
            
            console.log('Email test result:', { data, error });
            
            setResult({
                success: true,
                emailTest: {
                    testSent: !error,
                    error: error?.message,
                    data: data
                },
                recommendation: error ? 
                    'Email service ไม่ทำงาน - ตรวจสอบ SMTP settings ใน Supabase' :
                    'Email service ทำงานได้ - ปัญหาอาจอยู่ที่การกรอง email ของ provider',
                timestamp: new Date().toLocaleString('th-TH')
            });
        } catch (err: any) {
            setResult({
                success: false,
                error: `Email settings error: ${err.message}`,
                timestamp: new Date().toLocaleString('th-TH')
            });
        } finally {
            setLoading(false);
        }
    };

    const resendConfirmation = async () => {
        if (!email) {
            alert('กรุณาใส่อีเมลก่อน');
            return;
        }
        
        setLoading(true);
        try {
            // ใช้ production URL หากอยู่ใน production environment
            const redirectUrl = process.env.NODE_ENV === 'production' 
                ? 'https://accountee.vercel.app/auth/callback'
                : `${currentUrl}/auth/callback`;
                
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: redirectUrl
                }
            });
            
            if (error) {
                alert(`ข้อผิดพลาด: ${error.message}`);
            } else {
                alert(`ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบอีเมล (Redirect: ${redirectUrl})`);
            }
        } catch (err: any) {
            alert(`เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const checkAuthConfig = async () => {
        try {
            // ตรวจสอบการตั้งค่า Supabase
            const { data, error } = await supabase.auth.getSession();
            console.log('=== การตั้งค่า Supabase ===');
            console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
            console.log('Supabase Key Available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
            console.log('Auth Session:', data);
            if (error) console.log('Auth Error:', error);
            
            setResult({
                success: true,
                configCheck: {
                    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
                    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                    session: data,
                    error: error?.message
                },
                timestamp: new Date().toLocaleString('th-TH')
            });
        } catch (err: any) {
            console.log('Config Error:', err);
            setResult({
                success: false,
                error: `Config Error: ${err.message}`,
                timestamp: new Date().toLocaleString('th-TH')
            });
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-8 space-y-6">
            <h1 className="text-2xl font-bold">🔧 Auth Debug Tool</h1>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">อีเมลทดสอบ:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="test@example.com"
                    />
                </div>

                <div className="flex gap-4 flex-wrap">
                    <button
                        onClick={testSignup}
                        disabled={!email || loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-blue-700"
                    >
                        {loading ? 'กำลังทดสอบ...' : 'ทดสอบแบบธรรมดา'}
                    </button>

                    <button
                        onClick={testSignupWithRedirect}
                        disabled={!email || loading}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-purple-700"
                    >
                        {loading ? 'กำลังทดสอบ...' : 'ทดสอบแบบมี Redirect'}
                    </button>
                    
                    <button
                        onClick={checkAuthConfig}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        ตรวจสอบการตั้งค่า
                    </button>

                    <button
                        onClick={checkEmailSettings}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-indigo-700"
                    >
                        ทดสอบ Email Service
                    </button>

                    <button
                        onClick={resendConfirmation}
                        disabled={!email || loading}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-orange-700"
                    >
                        ส่งอีเมลยืนยันใหม่
                    </button>
                </div>

                {/* แสดงข้อมูล Environment ทันที */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">📊 ข้อมูล Environment:</h4>
                    <div className="text-sm space-y-1">
                        <div>Supabase URL: <span className="font-mono text-blue-700">{process.env.NEXT_PUBLIC_SUPABASE_URL || 'ไม่พบ'}</span></div>
                        <div>Anon Key: <span className="font-mono text-blue-700">{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'มี' : 'ไม่มี'}</span></div>
                        <div>Current URL: <span className="font-mono text-blue-700">{currentUrl || 'กำลังโหลด...'}</span></div>
                    </div>
                </div>
            </div>

            {result && (
                <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                    <h3 className="font-bold mb-2">ผลลัพธ์การทดสอบ:</h3>
                    <pre className="text-sm overflow-auto">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-bold text-yellow-800 mb-2">📋 เช็คลิสต์การแก้ปัญหา:</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                    <li>1. ตรวจสอบ Environment Variables ใน .env.local</li>
                    <li>2. ตรวจสอบ Site URL ใน Supabase Dashboard</li>
                    <li>3. ตรวจสอบ Email Templates ในส่วน Authentication</li>
                    <li>4. ตรวจสอบ Spam folder ในอีเมล</li>
                    <li>5. รอ 5-10 นาที เพราะบางครั้งอีเมลมาช้า</li>
                    <li>6. ตรวจสอบ Network tab ใน Browser DevTools</li>
                </ul>
            </div>

            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-bold text-red-800 mb-2">🚨 หากอีเมลไม่ส่ง - ขั้นตอนแก้ไข:</h3>
                <div className="text-sm text-red-700 space-y-3">
                    <div>
                        <p className="font-semibold">1. ตรวจสอบใน Supabase Dashboard:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>Authentication → Settings → Email Templates</li>
                            <li>ตรวจสอบว่า "Confirm signup" template เปิดใช้งานหรือไม่</li>
                            <li>ตรวจสอบว่า SMTP settings ถูกต้องหรือไม่</li>
                        </ul>
                    </div>
                    
                    <div>
                        <p className="font-semibold">2. ตรวจสอบ Auth Settings:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>Authentication → Settings → Site URL: http://localhost:3002</li>
                            <li>Redirect URLs: http://localhost:3002/**, *.vercel.app/**</li>
                            <li>Enable email confirmations: เปิด</li>
                        </ul>
                    </div>

                    <div>
                        <p className="font-semibold">3. ทดลองอีเมลอื่น:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                            <li>ลอง Gmail แทน Hotmail</li>
                            <li>ลองอีเมลชั่วคราว เช่น 10minutemail.com</li>
                        </ul>
                    </div>
                </div>
            </div>

            {result?.success && result?.data?.user && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="font-bold text-green-800 mb-2">✅ การสมัครสมาชิกสำเร็จ!</h3>
                    <div className="text-sm text-green-700 space-y-2">
                        <p><strong>User ID:</strong> {result.data.user.id}</p>
                        <p><strong>Email:</strong> {result.data.user.email}</p>
                        <p><strong>Confirmation Sent:</strong> {new Date(result.data.user.confirmation_sent_at).toLocaleString('th-TH')}</p>
                        
                        <div className="mt-4 p-3 bg-white border border-green-300 rounded">
                            <h4 className="font-semibold text-green-800 mb-2">📧 ขั้นตอนต่อไป:</h4>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>ตรวจสอบอีเมล <strong>{result.data.user.email}</strong></li>
                                <li>หาอีเมลจาก <code>noreply@mail.app.supabase.io</code></li>
                                <li>ตรวจ Spam/Junk folder ด้วย</li>
                                <li>คลิกลิงก์ confirm ในอีเมล</li>
                                <li>หากไม่เจอ ให้รอ 5-10 นาที</li>
                            </ol>
                        </div>

                        <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded">
                            <p className="text-blue-800 text-xs">
                                <strong>💡 Tip:</strong> ใน Hotmail/Outlook ให้ตรวจ folder "Other" หรือ "Clutter" ด้วย
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
