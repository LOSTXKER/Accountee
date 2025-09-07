# การทดสอบประสิทธิภาพหลังจากการปรับปรุง

## คำแนะนำการรัน SQL Functions ใน Supabase

### 1. เข้าไปที่ Supabase Dashboard
- ไปที่ Project → SQL Editor
- Copy และ paste โค้ดจาก `sql/performance_functions.sql`
- Run ทีละส่วน:

### 2. ลำดับการรัน SQL:
```sql
-- ขั้นตอนที่ 1: สร้าง Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_business_date 
ON transactions(businessid, date) WHERE isdeleted = false;

CREATE INDEX IF NOT EXISTS idx_transactions_type_business 
ON transactions(type, businessid) WHERE isdeleted = false;

CREATE INDEX IF NOT EXISTS idx_transactions_wht 
ON transactions(businessid, withholdingtax) WHERE withholdingtax > 0 AND isdeleted = false;

-- ขั้นตอนที่ 2: สร้าง RPC Functions
-- Copy functions จากไฟล์ SQL

-- ขั้นตอนที่ 3: ทดสอบ Functions
SELECT * FROM get_profit_loss_summary('your-business-id', '2024-01-01', '2024-12-31');
SELECT * FROM get_wht_summary('your-business-id');
SELECT * FROM get_dashboard_stats('your-business-id', 30);
```

## การทดสอบประสิทธิภาพ

### ทดสอบก่อนและหลังการปรับปรุง:

#### 1. ทดสอบ Profit Loss Report
```javascript
// ก่อนปรับปรุง (Client-side calculation)
console.time('Old Profit Loss');
// ... โค้ดเก่า
console.timeEnd('Old Profit Loss');

// หลังปรับปรุง (Server-side aggregation)
console.time('New Profit Loss');
// ... โค้ดใหม่
console.timeEnd('New Profit Loss');
```

#### 2. ทดสอบ WHT Report
```javascript
console.time('WHT Report Loading');
// ใช้ useWhtReport hook
console.timeEnd('WHT Report Loading');
```

#### 3. ทดสอบ Export Performance
```javascript
console.time('Export Processing');
// ใช้ useBackgroundExport hook
console.timeEnd('Export Processing');
```

## เป้าหมายประสิทธิภาพ

### เวลาที่คาดหวัง:
- **Profit Loss Report**: จาก 5-10 วินาที → 1-2 วินาที
- **WHT Report**: จาก 3-5 วินาที → 0.5-1 วินาที  
- **Export ไฟล์**: จาก 30-60 วินาที → 10-20 วินาที
- **Dashboard Loading**: จาก 2-3 วินาที → 0.5-1 วินาที

### Memory Usage:
- ลดการใช้ RAM ลง 60%
- ลดการส่งข้อมูลผ่าน network ลง 70%

## การติดตาม Metrics

### ใน Browser DevTools:
1. **Network Tab**: ดูขนาดข้อมูลที่ส่ง
2. **Performance Tab**: วัดเวลา rendering
3. **Memory Tab**: ตรวจสอบ memory leaks

### ใน Production:
1. **Core Web Vitals**:
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)

2. **Custom Metrics**:
   - API Response Time
   - Report Generation Time
   - Export Success Rate

## Monitoring Dashboard (แนะนำ)

### สร้าง monitoring สำหรับ:
- Average report loading time
- API error rates
- Cache hit rates
- User satisfaction scores

## การแก้ไขปัญหา

### หาก Performance ยังไม่ดีพอ:

1. **ตรวจสอบ Database**:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM get_profit_loss_summary(...);
   ```

2. **เพิ่ม Caching Layer**:
   - Redis สำหรับ cache รายงาน
   - CDN สำหรับ static assets

3. **ปรับแต่ง React Query**:
   ```javascript
   // เพิ่ม staleTime และ cacheTime
   staleTime: 10 * 60 * 1000, // 10 minutes
   cacheTime: 30 * 60 * 1000, // 30 minutes
   ```

## การ Deploy

### ขั้นตอน Production:
1. **Backup Database** ก่อนรัน SQL
2. **รัน SQL Functions** ใน off-peak hours
3. **Deploy Frontend Changes**
4. **Monitor Performance** หลัง deploy
5. **Rollback Plan** พร้อมไว้

### Health Checks:
- ทดสอบ APIs ทั้งหมด
- ตรวจสอบ error logs
- ยืนยันว่า cache ทำงานถูกต้อง
