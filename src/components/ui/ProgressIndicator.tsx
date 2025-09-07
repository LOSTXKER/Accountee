// src/components/ui/ProgressIndicator.tsx
import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ProgressIndicatorProps {
    isLoading: boolean;
    progress?: number;
    status?: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
    showPercentage?: boolean;
}

export function ProgressIndicator({
    isLoading,
    progress = 0,
    status = 'idle',
    message,
    showPercentage = true
}: ProgressIndicatorProps) {
    const [displayProgress, setDisplayProgress] = useState(0);

    // Smooth progress animation
    useEffect(() => {
        if (progress > displayProgress) {
            const timer = setTimeout(() => {
                setDisplayProgress(prev => Math.min(prev + 1, progress));
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [progress, displayProgress]);

    const getStatusIcon = () => {
        switch (status) {
            case 'loading':
                return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return null;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'loading':
                return 'bg-blue-500';
            case 'success':
                return 'bg-green-500';
            case 'error':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    if (!isLoading && status === 'idle') {
        return null;
    }

    return (
        <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <span className="text-gray-700">
                        {message || 'กำลังประมวลผล...'}
                    </span>
                </div>
                {showPercentage && (
                    <span className="text-gray-500 font-mono">
                        {Math.round(displayProgress)}%
                    </span>
                )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all duration-300 ease-out ${getStatusColor()}`}
                    style={{ width: `${displayProgress}%` }}
                />
            </div>
        </div>
    );
}

// Enhanced Progress Bar Component
interface EnhancedProgressProps {
    steps: Array<{
        label: string;
        status: 'pending' | 'active' | 'completed' | 'error';
    }>;
    currentStep: number;
}

export function StepProgress({ steps, currentStep }: EnhancedProgressProps) {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                {steps.map((step, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-300 ${
                                step.status === 'completed'
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : step.status === 'active'
                                    ? 'bg-blue-500 border-blue-500 text-white'
                                    : step.status === 'error'
                                    ? 'bg-red-500 border-red-500 text-white'
                                    : 'bg-gray-100 border-gray-300 text-gray-500'
                            }`}
                        >
                            {step.status === 'completed' ? (
                                <CheckCircle className="h-4 w-4" />
                            ) : step.status === 'error' ? (
                                <AlertCircle className="h-4 w-4" />
                            ) : step.status === 'active' ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                index + 1
                            )}
                        </div>
                        <div
                            className={`mt-2 text-xs text-center ${
                                step.status === 'active' ? 'text-blue-600 font-medium' : 'text-gray-500'
                            }`}
                        >
                            {step.label}
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={`absolute w-full h-0.5 mt-4 ${
                                    step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                                style={{
                                    left: '50%',
                                    right: '-50%',
                                    top: '16px'
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Loading Skeleton for Reports
export function ReportSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="bg-white border rounded-lg p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
            </div>
            <div className="bg-white border rounded-lg p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    );
}
