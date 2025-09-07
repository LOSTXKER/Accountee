// src/components/ui/ProcessBar.tsx
import { TransactionStatus } from '@/types';

interface ProcessStep {
  status: TransactionStatus;
  label: string;
  color: string;
  glowColor: string;
}

interface ProcessBarProps {
  currentStatus: TransactionStatus;
  type: 'income' | 'expense';
}

const EXPENSE_STEPS: ProcessStep[] = [
  {
    status: 'รอเอกสาร',
    label: 'รอเอกสาร',
    color: 'bg-slate-500',
    glowColor: 'shadow-slate-400'
  },
  {
    status: 'รอชำระ',
    label: 'รอชำระ',
    color: 'bg-amber-500',
    glowColor: 'shadow-amber-400'
  },
  {
    status: 'รอส่ง หัก ณ ที่จ่าย',
    label: 'รอส่ง หัก ณ ที่จ่าย',
    color: 'bg-indigo-500',
    glowColor: 'shadow-indigo-400'
  },
  {
    status: 'เสร็จสมบูรณ์',
    label: 'เสร็จสมบูรณ์',
    color: 'bg-green-500',
    glowColor: 'shadow-green-400'
  }
];

const INCOME_STEPS: ProcessStep[] = [
  {
    status: 'รอรับเงิน',
    label: 'รอรับเงิน',
    color: 'bg-blue-500',
    glowColor: 'shadow-blue-400'
  },
  {
    status: 'รอรับ หัก ณ ที่จ่าย',
    label: 'รอรับ หัก ณ ที่จ่าย',
    color: 'bg-purple-500',
    glowColor: 'shadow-purple-400'
  },
  {
    status: 'เสร็จสมบูรณ์',
    label: 'เสร็จสมบูรณ์',
    color: 'bg-green-500',
    glowColor: 'shadow-green-400'
  }
];

export default function ProcessBar({ currentStatus, type }: ProcessBarProps) {
  const steps = type === 'expense' ? EXPENSE_STEPS : INCOME_STEPS;
  
  // หาตำแหน่งปัจจุบัน
  const currentStepIndex = steps.findIndex(step => step.status === currentStatus);
  
  // กรณีพิเศษ
  if (currentStatus === 'ยกเลิก') {
    return (
      <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
        <div className="flex-1">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xs font-bold">✕</span>
            </div>
            <div className="ml-3">
              <span className="text-slate-600 font-medium line-through">ยกเลิก</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (currentStatus === 'เกินกำหนด') {
    return (
      <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
        <div className="flex-1">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-red-400/50">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="ml-3">
              <span className="text-red-600 font-medium animate-pulse">เกินกำหนด</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-100">
      <div className="flex items-center justify-between relative">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          const isUpcoming = index > currentStepIndex;
          
          return (
            <div key={step.status} className="flex flex-col items-center relative">
              {/* Step Circle */}
              <div
                className={`
                  w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10
                  ${isCompleted 
                    ? `${step.color} border-transparent text-white shadow-lg ${step.glowColor}/30` 
                    : isActive 
                    ? `${step.color} border-transparent text-white shadow-lg ${step.glowColor}/50 animate-pulse scale-110` 
                    : 'bg-gray-200 border-gray-300 text-gray-500'
                  }
                `}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>
              
              {/* Step Label */}
              <div className="mt-2 text-center">
                <span 
                  className={`
                    text-xs font-medium transition-all duration-300
                    ${isActive 
                      ? 'text-gray-900 font-semibold' 
                      : isCompleted 
                      ? 'text-gray-600' 
                      : 'text-gray-400'
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>
              
              {/* Active Step Glow Effect */}
              {isActive && (
                <div 
                  className={`
                    absolute -inset-1 rounded-full blur-sm opacity-30 animate-pulse
                    ${step.color}
                  `}
                />
              )}
              
              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div 
                  className={`
                    absolute top-5 left-full w-full h-0.5 transition-all duration-500
                    ${isCompleted 
                      ? step.color.replace('bg-', 'bg-gradient-to-r from-') 
                      : 'bg-gray-300'
                    }
                  `}
                  style={{ 
                    width: `calc(100vw / ${steps.length} - 2.5rem)`,
                    transform: 'translateX(0.5rem)'
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress Bar Background */}
      <div className="mt-4 w-full bg-gray-200 rounded-full h-1.5 relative overflow-hidden">
        <div 
          className={`
            h-full transition-all duration-1000 ease-out rounded-full
            ${currentStepIndex >= 0 
              ? steps[Math.min(currentStepIndex, steps.length - 1)].color.replace('bg-', 'bg-gradient-to-r from-') + ' to-transparent'
              : 'bg-gray-300'
            }
          `}
          style={{ 
            width: `${((currentStepIndex + 1) / steps.length) * 100}%` 
          }}
        />
        
        {/* Animated Progress Shimmer */}
        {currentStepIndex < steps.length - 1 && (
          <div className="absolute top-0 left-0 w-full h-full">
            <div 
              className="h-full w-8 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse"
              style={{ 
                transform: `translateX(${((currentStepIndex + 1) / steps.length) * 100}%)`,
                animationDuration: '2s',
                animationIterationCount: 'infinite'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}