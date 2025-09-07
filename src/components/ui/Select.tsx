// src/components/ui/Select.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean; // --- ✅ [แก้ไข] เพิ่ม Prop นี้เข้ามา ---
}

export function Select({ options, value, onChange, placeholder = "กรุณาเลือก...", className, disabled = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(option => option.value === value);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)} ref={selectRef}>
  <button
        type="button"
        disabled={disabled} // --- ✅ [แก้ไข] นำ Prop มาใช้งาน ---
        className={cn(
    "flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-0 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50",
            !selectedOption && "text-slate-500"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span>
            {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform text-slate-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg border rounded-md max-h-60 overflow-auto">
          <ul>
            {options.map(option => (
              <li
                key={option.value}
                className={`px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer ${option.value === value ? 'bg-slate-100 font-semibold' : ''}`}
                onClick={() => handleOptionClick(option.value)}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}