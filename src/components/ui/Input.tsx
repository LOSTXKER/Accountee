// src/components/ui/Input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

// --- ✅ [แก้ไข] ใช้ React.forwardRef เพื่อให้ Component รับ ref และส่งต่อไปยัง input element ได้ ---
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
    <input
        type={type}
        className={cn(
      "flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-0 focus-visible:border-brand-500 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref} // ref ที่รับมาจะถูกส่งต่อมาที่นี่
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
