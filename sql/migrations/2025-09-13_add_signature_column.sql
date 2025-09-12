-- Add signature_url column to businesses table
-- Migration: 2025-09-13_add_signature_column.sql

-- เพิ่มคอลัมน์สำหรับเก็บ URL ของลายเซ็นดิจิทัล
ALTER TABLE businesses ADD COLUMN signature_url TEXT;

-- เพิ่ม comment อธิบายการใช้งาน
COMMENT ON COLUMN businesses.signature_url IS 'URL ของลายเซ็นดิจิทัลสำหรับเอกสารทางการเงิน';

-- ไม่มีคอลัมน์ updated_at ในตาราง businesses จึงไม่ต้องอัปเดต