-- Migration: Add wht_category column to transactions table
-- Date: 2025-09-12
-- Description: เพิ่มฟิลด์ wht_category เพื่อจักเก็บประเภทการหัก ณ ที่จ่าย

ALTER TABLE transactions 
ADD COLUMN wht_category TEXT;

-- Add comment to the column
COMMENT ON COLUMN transactions.wht_category IS 'ประเภทเงินได้ที่หัก ณ ที่จ่าย เช่น ค่าบริการ, ค่าเช่า, ค่าวิชาชีพอิสระ';