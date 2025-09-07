// src/app/debug/wht/page.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

export default function DebugWhtPage() {
    const [transactionId, setTransactionId] = useState('');
    const [vendorName, setVendorName] = useState('บริษัท ทดสอบ จำกัด');
    const [vendorAddress, setVendorAddress] = useState('123 ถนนทดสอบ แขวงทดสอบ เขตทดสอบ กรุงเทพฯ 10100');
    const [vendorTaxId, setVendorTaxId] = useState('1234567890123');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleTestApi = async () => {
        setIsLoading(true);
        setResult(null);
        
        try {
            const response = await fetch('/api/test-wht', {
                method: 'GET',
            });
            
            const data = await response.json();
            setResult(data);
        } catch (error) {
            setResult({ error: 'Failed to test API', details: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateCertificate = async () => {
        if (!transactionId) {
            alert('กรุณาใส่ Transaction ID');
            return;
        }

        setIsLoading(true);
        setResult(null);
        
        try {
            const vendorData = {
                name: vendorName,
                address: vendorAddress,
                taxId: vendorTaxId
            };

            const response = await fetch('/api/generate-wht-certificate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionId,
                    vendorData
                }),
            });
            
            const data = await response.json();
            setResult(data);
            
            // If successful and has URL, auto-download the PDF
            if (data.success && data.url) {
                downloadPDF(data.url, `WHT_Certificate_${transactionId}_${Date.now()}.pdf`);
            }
        } catch (error) {
            setResult({ error: 'Failed to generate certificate', details: error instanceof Error ? error.message : 'Unknown error' });
        } finally {
            setIsLoading(false);
        }
    };

    const downloadPDF = (url: string, filename: string) => {
        try {
            // Create a temporary anchor element for download
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.target = '_blank'; // Open in new tab as fallback
            
            // Append to body, click, and remove
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ PDF download initiated:', filename);
        } catch (error) {
            console.error('❌ Failed to download PDF:', error);
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Debug WHT Certificate Generation</h1>
            
            <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Test API Components</h2>
                    <Button 
                        onClick={handleTestApi} 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Testing...' : 'Test PDF & Font Loading'}
                    </Button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">สร้างหนังสือรับรองหัก ณ ที่จ่าย</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">รหัสธุรกรรม (Transaction ID)</label>
                            <Input
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                placeholder="ใส่รหัสธุรกรรม"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ชื่อผู้รับจ้าง/ผู้ขาย</label>
                            <Input
                                value={vendorName}
                                onChange={(e) => setVendorName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">เลขประจำตัวผู้เสียภาษี</label>
                            <Input
                                value={vendorTaxId}
                                onChange={(e) => setVendorTaxId(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">ที่อยู่</label>
                            <Textarea
                                value={vendorAddress}
                                onChange={(e) => setVendorAddress(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                    <Button 
                        onClick={handleGenerateCertificate} 
                        disabled={isLoading || !transactionId}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isLoading ? 'กำลังสร้าง...' : '📄 สร้างหนังสือรับรองหัก ณ ที่จ่าย'}
                    </Button>
                </div>

                {result && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4">Result</h2>
                        
                        {/* Success result with download options */}
                        {result.success && result.url && (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-medium text-green-800">✅ สร้างหนังสือรับรองสำเร็จ!</h3>
                                        <p className="text-sm text-green-600">ไฟล์ PDF ถูกสร้างและอัปโหลดเรียบร้อยแล้ว</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            onClick={() => downloadPDF(result.url, `WHT_Certificate_${transactionId}_${Date.now()}.pdf`)}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            📥 ดาวน์โหลด PDF
                                        </Button>
                                        <Button 
                                            onClick={() => window.open(result.url, '_blank')}
                                            variant="outline"
                                        >
                                            👁️ ดู PDF
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <p className="text-xs text-gray-600 break-all">
                                        URL: {result.url}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        {/* Error result */}
                        {result.error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <h3 className="text-lg font-medium text-red-800">❌ Error</h3>
                                <p className="text-sm text-red-600">{result.error}</p>
                                {result.details && (
                                    <p className="text-xs text-red-500 mt-1">{result.details}</p>
                                )}
                            </div>
                        )}
                        
                        {/* Full JSON result */}
                        <details className="cursor-pointer">
                            <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
                                Show Full Response (Click to expand)
                            </summary>
                            <pre className="bg-white p-4 rounded border overflow-auto text-sm mt-2">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
}
