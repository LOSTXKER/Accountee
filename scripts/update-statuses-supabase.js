// scripts/update-statuses-supabase.js
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// 1. การตั้งค่าการเชื่อมต่อ Supabase
// ตรวจสอบให้แน่ใจว่าคุณได้สร้างไฟล์ .env.local ที่ root ของโปรเจกต์
// และใส่ค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ของคุณลงไป
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your .env.local file");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. สร้าง Map สำหรับแปลงสถานะเก่าเป็นสถานะใหม่
const statusTranslationMap = {
  draft: 'ฉบับร่าง',
  accepted: 'ยอมรับแล้ว',
  rejected: 'ปฏิเสธแล้ว',
  paid: 'ชำระแล้ว',
  overdue: 'เกินกำหนด',
  void: 'ยกเลิก',
  awaiting_payment: 'รอชำระ'
};

// 3. ฟังก์ชันหลักในการทำงาน (Main Function)
async function updateSalesDocumentStatuses() {
  console.log('🚀 เริ่มต้นการอัปเดตสถานะเอกสารขายใน Supabase...');

  // ดึงข้อมูลทั้งหมดจากตาราง sales_documents
  const { data: documents, error } = await supabase
    .from('sales_documents')
    .select('id, status');

  if (error) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
    return;
  }

  if (!documents || documents.length === 0) {
    console.log('✅ ไม่พบเอกสารที่ต้องอัปเดต');
    return;
  }

  const updatesToPerform = [];

  for (const doc of documents) {
    const currentStatus = doc.status;
    // ตรวจสอบว่าสถานะปัจจุบันเป็นภาษาอังกฤษ (มีอยู่ใน Map ของเรา) หรือไม่
    if (currentStatus && statusTranslationMap[currentStatus]) {
      const newStatus = statusTranslationMap[currentStatus];
      console.log(`- ID: ${doc.id}, สถานะเก่า: "${currentStatus}", จะเปลี่ยนเป็น: "${newStatus}"`);
      
      // เพิ่ม Promise การอัปเดตเข้าไปใน Array
      updatesToPerform.push(
        supabase
          .from('sales_documents')
          .update({ status: newStatus })
          .eq('id', doc.id)
      );
    }
  }

  if (updatesToPerform.length > 0) {
    console.log(`\nกำลังบันทึกการเปลี่ยนแปลง ${updatesToPerform.length} รายการ...`);
    
    // รอให้การอัปเดตทั้งหมดเสร็จสิ้น
    const results = await Promise.all(updatesToPerform);

    const failedUpdates = results.filter(res => res.error);

    if (failedUpdates.length > 0) {
        console.error('❌ เกิดข้อผิดพลาดในการอัปเดตบางรายการ:');
        failedUpdates.forEach(fail => {
            console.error(`- ID: (ไม่ทราบ), Error: ${fail.error.message}`);
        });
    }
    
    const successfulCount = results.length - failedUpdates.length;
    if (successfulCount > 0) {
        console.log(`✅ อัปเดตข้อมูลสำเร็จ ${successfulCount} รายการ!`);
    }

  } else {
    console.log('✅ ข้อมูลทั้งหมดเป็นภาษาไทยอยู่แล้ว ไม่มีการเปลี่ยนแปลง');
  }
}

// 4. สั่งให้ฟังก์ชันทำงาน และดักจับ Error
updateSalesDocumentStatuses().catch(console.error);
