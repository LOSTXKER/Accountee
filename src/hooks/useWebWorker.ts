// src/hooks/useWebWorker.ts
import { useCallback, useRef, useEffect, useState } from 'react';

type WorkerMessage = {
    type: string;
    data?: any;
};

type WorkerResponse = {
    type: string;
    result?: any;
    error?: string;
};

export function useReportWorker() {
    const workerRef = useRef<Worker | null>(null);
    const callbacksRef = useRef<Map<string, (result: any, error?: string) => void>>(new Map());

    useEffect(() => {
        // สร้าง Worker เมื่อ component mount
        if (typeof window !== 'undefined' && 'Worker' in window) {
            workerRef.current = new Worker('/workers/reportWorker.js');
            
            workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
                const { type, result, error } = e.data;
                
                // เรียก callback ที่เกี่ยวข้อง
                const callback = callbacksRef.current.get(type);
                if (callback) {
                    callback(result, error);
                    callbacksRef.current.delete(type);
                }
            };

            workerRef.current.onerror = (error) => {
                console.error('Worker error:', error);
            };
        }

        // Cleanup เมื่อ component unmount
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    const calculateProfitLoss = useCallback((
        transactions: any[],
        onComplete: (result: any, error?: string) => void
    ) => {
        if (!workerRef.current) {
            onComplete(null, 'Web Worker not supported');
            return;
        }

        callbacksRef.current.set('PROFIT_LOSS_RESULT', onComplete);
        
        workerRef.current.postMessage({
            type: 'CALCULATE_PROFIT_LOSS',
            data: { transactions }
        });
    }, []);

    const processExportData = useCallback((
        transactions: any[],
        filters: any,
        onComplete: (result: any, error?: string) => void
    ) => {
        if (!workerRef.current) {
            onComplete(null, 'Web Worker not supported');
            return;
        }

        callbacksRef.current.set('EXPORT_DATA_RESULT', onComplete);
        
        workerRef.current.postMessage({
            type: 'PROCESS_EXPORT_DATA',
            data: { transactions, filters }
        });
    }, []);

    const calculateWhtSummary = useCallback((
        transactions: any[],
        onComplete: (result: any, error?: string) => void
    ) => {
        if (!workerRef.current) {
            onComplete(null, 'Web Worker not supported');
            return;
        }

        callbacksRef.current.set('WHT_SUMMARY_RESULT', onComplete);
        
        workerRef.current.postMessage({
            type: 'CALCULATE_WHT_SUMMARY',
            data: { transactions }
        });
    }, []);

    const isWorkerSupported = typeof window !== 'undefined' && 'Worker' in window;

    return {
        calculateProfitLoss,
        processExportData,
        calculateWhtSummary,
        isWorkerSupported
    };
}

// Hook สำหรับ Background Export Processing
export function useBackgroundExport() {
    const processExport = useCallback(async (
        exportConfig: {
            businessId: string;
            startDate: string;
            endDate: string;
            documentTypes: any;
        },
        onProgress?: (progress: number) => void
    ) => {
        try {
            // แสดง progress
            onProgress?.(10);

            // เรียก API แบบ streaming หรือ polling
            const response = await fetch('/api/export-package', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(exportConfig),
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            onProgress?.(50);

            // สำหรับไฟล์ขนาดใหญ่ ให้ใช้ ReadableStream
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body');
            }

            const chunks: Uint8Array[] = [];
            let receivedLength = 0;
            const contentLength = parseInt(response.headers.get('content-length') || '0');

            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                
                // Update progress
                if (contentLength > 0) {
                    const progress = Math.min(50 + (receivedLength / contentLength) * 40, 90);
                    onProgress?.(progress);
                }
            }

            onProgress?.(100);

            // รวม chunks เป็น blob - แก้ไข type error
            const blob = new Blob(chunks as BlobPart[]);
            return blob;

        } catch (error) {
            console.error('Background export error:', error);
            throw error;
        }
    }, []);

    return { processExport };
}

// Hook สำหรับ Progressive Loading
export function useProgressiveData<T>(
    fetchFunction: (offset: number, limit: number) => Promise<{data: T[], hasMore: boolean}>,
    initialLimit: number = 50
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const offsetRef = useRef(0);

    const loadMore = useCallback(async () => {
        if (loading || !hasMore) return;

        setLoading(true);
        setError(null);

        try {
            const result = await fetchFunction(offsetRef.current, initialLimit);
            
            setData((prev: T[]) => [...prev, ...result.data]);
            setHasMore(result.hasMore);
            offsetRef.current += initialLimit;
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [fetchFunction, initialLimit, loading, hasMore]);

    const reset = useCallback(() => {
        setData([]);
        setHasMore(true);
        setError(null);
        offsetRef.current = 0;
    }, []);

    // Load initial data
    useEffect(() => {
        loadMore();
    }, []);

    return {
        data,
        loading,
        hasMore,
        error,
        loadMore,
        reset
    };
}
