"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { seedDefaultCategories } from '@/lib/default-categories';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export default function NewBusinessPage() {
  const supabase = createClient();
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('กรุณากรอกชื่อธุรกิจ');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("ไม่พบข้อมูลผู้ใช้");
      }

      // 1. Create the new business
      const { data: newBusiness, error: insertError } = await supabase
        .from('businesses')
        .insert({
          businessname: businessName,
          ownerid: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newBusiness) throw new Error("ไม่สามารถสร้างธุรกิจได้");

      // 2. Seed the default categories for the new business
      await seedDefaultCategories(newBusiness.id);
      
      // 3. Create document counter for the new business
      const { error: counterError } = await supabase
        .from('document_counters')
        .insert({
            business_id: newBusiness.id,
            invoice_next_number: 1,
            quotation_next_number: 1,
            receipt_next_number: 1,
        });

      if (counterError) {
          // Log the error, but don't block the user flow
          console.error("Failed to create document counter:", counterError);
      }


      // 4. Redirect to the new business's dashboard
      router.push(`/dashboard/${newBusiness.id}`);
      router.refresh(); // Force a refresh to ensure new state is loaded

    } catch (err: any) {
      console.error("Error creating business:", err);
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้างธุรกิจ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">สร้างธุรกิจใหม่ของคุณ</CardTitle>
          <CardDescription>ตั้งชื่อธุรกิจของคุณเพื่อเริ่มต้น</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="businessName" className="font-medium">ชื่อธุรกิจ</label>
              <Input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="เช่น, บริษัท ตัวอย่าง จำกัด"
                required
                disabled={isLoading}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'กำลังสร้าง...' : 'สร้างธุรกิจ'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
