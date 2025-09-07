"use client";

import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

// สร้าง Context พร้อมค่าเริ่มต้น
export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

// สร้าง Custom Hook สำหรับเรียกใช้ Context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
