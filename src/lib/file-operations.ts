// src/lib/file-operations.ts
import { createClient } from '@/lib/supabase/client';
import { Attachment } from '@/types';

const supabase = createClient();

export interface FileDeleteResult {
  success: boolean;
  error?: string;
}

/**
 * ลบไฟล์จาก Supabase Storage และอัพเดต database
 */
// Parse Supabase public storage URL to extract bucket and file path
function parseSupabasePublicUrl(fileUrl: string, fallbackBucket?: string): { bucket: string; filePath: string } {
  const url = new URL(fileUrl);
  const pathname = decodeURIComponent(url.pathname);
  // Typical pattern: /storage/v1/object/public/<bucket>/<path>
  const match = pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (match) {
    return { bucket: match[1], filePath: match[2] };
  }

  // Fallback: search for known bucket segment in path
  const pathSegments = pathname.split('/').filter(Boolean);
  const knownBuckets = ['attachments', 'wht_certificates', 'public'];
  if (fallbackBucket) knownBuckets.unshift(fallbackBucket);
  for (const candidate of knownBuckets) {
    const idx = pathSegments.indexOf(candidate);
    if (idx !== -1 && idx < pathSegments.length - 1) {
      return {
        bucket: candidate,
        filePath: pathSegments.slice(idx + 1).join('/'),
      };
    }
  }
  throw new Error(`Cannot parse bucket/file path from URL: ${fileUrl}`);
}

export async function deleteFile(
  fileUrl: string,
  bucketName?: string
): Promise<FileDeleteResult> {
  try {
    const { bucket, filePath } = parseSupabasePublicUrl(fileUrl, bucketName);

    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (storageError) {
      throw storageError;
    }

    return { success: true };
    
  } catch (error) {
    console.error('Error deleting file:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * ลบไฟล์หลายไฟล์พร้อมกัน
 */
export async function deleteFiles(
  fileUrls: string[],
  bucketName?: string
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  for (const fileUrl of fileUrls) {
    const result = await deleteFile(fileUrl, bucketName);
    if (!result.success && result.error) {
      errors.push(`${fileUrl}: ${result.error}`);
    }
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * อัพเดต transaction attachments หลังจากลบไฟล์
 */
export async function removeAttachmentFromTransaction(
  transactionId: string,
  fileUrl: string,
  attachmentType: 'document_attachments' | 'slip_attachments' | 'wht_certificate_attachment'
): Promise<FileDeleteResult> {
  try {
    // Get current transaction data
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError) throw fetchError;
    if (!transaction) throw new Error('Transaction not found');

    let updates: any = {};

    if (attachmentType === 'wht_certificate_attachment') {
      // For WHT certificate, just set to null
      updates.wht_certificate_attachment = null;
    } else {
      // For arrays, remove the matching file
      const currentAttachments = transaction[attachmentType] || [];
      const updatedAttachments = currentAttachments.filter(
        (attachment: Attachment) => attachment.url !== fileUrl
      );
      updates[attachmentType] = updatedAttachments;
    }

    // Update transaction in database
    const { error: updateError } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId);

    if (updateError) throw updateError;

    return { success: true };
    
  } catch (error) {
    console.error('Error updating transaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * ลบไฟล์และอัพเดต transaction ในคำสั่งเดียว
 */
export async function deleteFileAndUpdateTransaction(
  transactionId: string,
  fileUrl: string,
  attachmentType: 'document_attachments' | 'slip_attachments' | 'wht_certificate_attachment',
  bucketName?: string
): Promise<FileDeleteResult> {
  try {
    // If not provided, infer bucket by attachment type (optional optimization)
    const inferredBucket = bucketName ?? (attachmentType === 'wht_certificate_attachment' ? 'wht_certificates' : undefined);
    // Delete file from storage first
    const deleteResult = await deleteFile(fileUrl, inferredBucket);
    if (!deleteResult.success) {
      throw new Error(deleteResult.error);
    }

    // Update transaction
    const updateResult = await removeAttachmentFromTransaction(
      transactionId, 
      fileUrl, 
      attachmentType
    );
    
    if (!updateResult.success) {
      throw new Error(updateResult.error);
    }

    return { success: true };
    
  } catch (error) {
    console.error('Error in deleteFileAndUpdateTransaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * ตรวจสอบว่าไฟล์มีอยู่ใน Storage หรือไม่
 */
export async function checkFileExists(
  fileUrl: string,
  bucketName?: string
): Promise<boolean> {
  try {
    const { bucket, filePath } = parseSupabasePublicUrl(fileUrl, bucketName);

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'));

    if (error) return false;
    
    const fileName = filePath.split('/').pop();
    return data.some(file => file.name === fileName);
    
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}