-- Migration: Add pnd_type column to transactions table
-- Date: 2025-09-12
-- Description: เพิ่มฟิลด์ pnd_type เพื่อจักเก็บประเภทแบบแสดงรายการภาษี (ภ.ง.ด.)

ALTER TABLE transactions 
ADD COLUMN pnd_type TEXT;

-- Add comment to the column
COMMENT ON COLUMN transactions.pnd_type IS 'ประเภทแบบแสดงรายการภาษี เช่น ภ.ง.ด.1ก, ภ.ง.ด.2, ภ.ง.ด.3, ภ.ง.ด.53 เป็นต้น';