// src/components/dashboard/DashboardChart.tsx
"use client";

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import dynamic from 'next/dynamic';
import type { ChartData, ChartOptions } from 'chart.js';

// Lazy load react-chartjs-2 Bar and chart.js only on client when needed
const Bar = dynamic(() => import('react-chartjs-2').then(m => m.Bar), { ssr: false });
const registerCharts = async () => {
    const ChartJS = await import('chart.js');
    ChartJS.Chart.register(
        ChartJS.CategoryScale,
        ChartJS.LinearScale,
        ChartJS.BarElement,
        ChartJS.Title,
        ChartJS.Tooltip,
        ChartJS.Legend,
    );
};
registerCharts();

interface DashboardChartProps {
    data: { name: string; income: number; expense: number }[];
}

export default function DashboardChart({ data }: DashboardChartProps) {
    const chartData: ChartData<'bar'> = {
        labels: data.map(d => d.name),
        datasets: [
            {
                label: 'รายรับ',
                data: data.map(d => d.income),
                backgroundColor: '#818cf8',
                borderRadius: 4,
            },
            {
                label: 'รายจ่าย',
                data: data.map(d => d.expense),
                backgroundColor: '#fca5a5',
                borderRadius: 4,
            },
        ],
    };

    const options: ChartOptions<'bar'> = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value: string | number) => new Intl.NumberFormat('th-TH').format(Number(value)),
                },
            },
            x: {
                grid: { display: false },
            },
        },
        plugins: {
            legend: {
                position: 'top' as const,
                align: 'end' as const,
            },
        },
    };

    return (
        <Card>
            <CardHeader>
                <h3 className="text-lg font-semibold">ภาพรวมกระแสเงินสด (6 เดือนล่าสุด)</h3>
            </CardHeader>
            <CardContent className="h-96">
                <Bar options={options} data={chartData} />
            </CardContent>
        </Card>
    );
}
