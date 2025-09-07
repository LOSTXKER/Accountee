// src/components/ui/Button.tsx
"use client";

import React from 'react';

// --- ⭐ [แก้ไข] เพิ่ม 'link', 'outline', 'constructive', 'destructive' เข้าไปใน type ---
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link' | 'outline' | 'constructive' | 'destructive' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
}

export function Button({ variant = 'primary', size = 'md', children, className, ...props }: ButtonProps) {
  
  // --- ⭐ [แก้ไข] เพิ่ม style สำหรับ variant ใหม่ ---
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    link: 'bg-transparent text-brand-600 hover:bg-brand-50 p-1 underline-offset-4 hover:underline',
    outline: 'bg-transparent text-slate-800 border border-slate-300 hover:bg-slate-50',
    constructive: 'bg-green-600 text-white hover:bg-green-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700', // destructive is an alias for danger
    ghost: 'bg-transparent hover:bg-slate-100',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className ?? ''}`}
      {...props}
    >
      {children}
    </button>
  );
}