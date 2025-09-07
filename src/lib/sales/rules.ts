// Centralized sales document rules: lock/CTA/status helpers
import { DocumentStatus, Invoice, SalesDoc } from '@/types';

export function canRecordPayment(status: DocumentStatus | string): boolean {
  return status === 'รอชำระ' || status === 'เกินกำหนด' || status === 'ค้างชำระ';
}

export function hasLinkedInvoice(doc: SalesDoc | any): boolean {
  return Boolean(
    doc?.converted_to_invoice_id ||
      doc?.convertedtoinvoiceid ||
      doc?.relatedinvoiceid ||
      doc?.related_invoice_id
  );
}

export function hasLinkedReceipt(doc: SalesDoc | any): boolean {
  return Boolean(doc?.related_receipt_id || doc?.relatedreceiptid);
}

// Compute invoice status after voiding a receipt: either 'เกินกำหนด' or 'รอชำระ'
export function computeInvoiceStatusAfterReceiptVoid(
  invoice: Invoice | (SalesDoc & { duedate?: string; due_date?: string }) | any,
  now: Date = new Date()
): DocumentStatus {
  const dueRaw = invoice?.duedate || invoice?.due_date;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dueDate = dueRaw ? new Date(dueRaw) : today;
  return dueDate < today ? ('เกินกำหนด' as DocumentStatus) : ('รอชำระ' as DocumentStatus);
}

// Forward-lock rule based on resolved timeline
// - Quotation is locked if it has an active (not canceled) invoice or receipt
// - Invoice is locked if it has an active (not canceled) receipt
// - Receipt has no forward lock beyond cancel
export function isForwardLockedFromTimeline(
  doc: SalesDoc,
  timeline: { quotation?: SalesDoc; invoice?: SalesDoc; receipt?: SalesDoc }
): boolean {
  if (doc.type === 'quotation') {
    const invActive = timeline.invoice && timeline.invoice.status !== 'ยกเลิก';
    const recActive = timeline.receipt && timeline.receipt.status !== 'ยกเลิก';
    return Boolean(invActive || recActive);
  }
  if (doc.type === 'invoice') {
    const recActive = timeline.receipt && timeline.receipt.status !== 'ยกเลิก';
    return Boolean(recActive);
  }
  return false;
}
