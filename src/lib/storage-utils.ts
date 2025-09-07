// src/lib/storage-utils.ts

// Sanitize a filename for Supabase Storage keys (ASCII-only, keep extension)
export const sanitizeFileNameForStorage = (filename: string): string => {
  if (!filename) return `${Date.now()}`;
  const parts = filename.split('.');
  const ext = parts.length > 1 ? `.${parts.pop()!.toLowerCase()}` : '';
  const base = parts.join('.') || 'file';
  // Normalize accents, remove diacritics
  const normalized = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  // Replace any non safe chars with underscore
  const safeBase = normalized.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  // Limit length to avoid very long keys
  const trimmed = safeBase.slice(0, 80) || 'file';
  return `${trimmed}${ext || ''}`;
};

// Build a safe storage path
export const buildStoragePath = (folder: string, businessId: string, filename: string): string => {
  const safe = sanitizeFileNameForStorage(filename);
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\/+/, '/');
  return `${safeFolder}/${businessId}/${Date.now()}_${safe}`;
};
