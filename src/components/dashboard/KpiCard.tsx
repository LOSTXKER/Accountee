// src/components/dashboard/KpiCard.tsx
import { Card } from '@/components/ui/Card';
import React from 'react';

interface KpiCardProps {
    title: string;
    value: number;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color?: 'green' | 'red' | 'brand' | 'slate';
    isCurrency?: boolean;
}

const colorClasses = {
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    red: { bg: 'bg-red-50', text: 'text-red-600' },
    brand: { bg: 'bg-brand-50', text: 'text-brand-600' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

export default function KpiCard({ title, value, icon: Icon, color = 'slate', isCurrency = true }: KpiCardProps) {
    const { bg, text } = colorClasses[color];

    const formatValue = (val: number) => {
        if (isCurrency) {
            return new Intl.NumberFormat('th-TH', {
                style: 'currency',
                currency: 'THB',
                minimumFractionDigits: 2,
            }).format(val);
        }
        return new Intl.NumberFormat('th-TH').format(val);
    };

    return (
        <Card className="p-5">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className={`h-5 w-5 ${text}`} />
                </div>
            </div>
            <p className={`mt-2 text-3xl font-bold ${text}`}>{formatValue(value)}</p>
        </Card>
    );
}
