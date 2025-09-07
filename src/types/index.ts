// src/types/index.ts

export interface Business {
  id: string;
  ownerid: string;
  businessname: string;
  created_at: string;
  company_address?: string;
  tax_id?: string;
  logo_url?: string | null;
  bank_details?: string;
  invoice_prefix?: string;
  quotation_prefix?: string;
  receipt_prefix?: string;
  name?: string; // Added for compatibility
}

export interface DocumentCounter {
    id: string; // business_id
    invoice_next_number: number;
    quotation_next_number: number;
    receipt_next_number: number;
}

export interface Customer {
  id: string;
  businessid: string;
  
  contact_type: 'corporate' | 'individual';
  code?: string;
  
  // For Corporate
  legal_entity_type: string | null;
  company_name: string | null;
  branch_type: 'main' | 'branch' | 'unspecified' | null;
  branch_number: string | null;

  // For Individual
  prefix: string | null;
  first_name: string | null;
  last_name: string | null;

  name: string; 
  tax_id: string | null;
  
  // Address
  address: string;
  street_address: string | null;
  subdistrict: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  
  // Contact Info
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  fax: string | null;
}


export interface Service {
  id: string;
  businessid: string;
  name: string;
  description?: string;
  unitprice: number;
}


export type TransactionType = "income" | "cogs" | "expense";
export type VatType = 'include' | 'exclude' | 'none';

export type TransactionStatus =
  | 'รอเอกสาร'
  | 'รอชำระ'
  | 'รอส่ง หัก ณ ที่จ่าย'
  | 'รอรับเงิน'
  | 'รอรับ หัก ณ ที่จ่าย'
  | 'เกินกำหนด'
  | 'เสร็จสมบูรณ์'
  | 'ยกเลิก';

export interface Attachment {
  name: string;
  url: string;
  type: string;
}

export interface PendingDocument {
  id: string;
  description: string;
}

export interface Transaction {
  id: string;
  businessid: string;
  date: Date | string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  status: TransactionStatus;
  attachment_status: 'pending' | 'completed' | 'none';
  vat_type: VatType;
  subtotal: number;
  vat_amount: number;
  document_attachments?: Attachment[];
  slip_attachments?: Attachment[];
  pending_documents?: PendingDocument[];
  withholdingtax_rate?: number | null;
  withholdingtax?: number | null;
  wht_certificate_attachment?: Attachment | null;
  isdeleted?: boolean;
  created_at: string;
  source_recurring_id?: string;
  source_doc_id?: string;
  wht_rate?: number; // Added for compatibility
}

export interface Category {
    id: string;
    businessid: string;
    name: string;
    type: "cogs" | "expense" | "income";
    parent_id?: string | null;
}

export interface AiLearning {
    id: string;
    businessid: string;
    vendor_name: string;
    category_id: string;
    category_name: string;
}

export interface RecurringTransaction {
    id:string;
    businessid: string;
    user_id: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    start_date: string;
    end_date?: string | null;
    category_id?: string | null;
    last_created_date?: string | null;
    next_due_date?: string | null;
    is_active: boolean;
    created_at: string;
}

export interface DocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  discount?: number;
}

export type DocumentStatus = 
  | 'ฉบับร่าง' 
  | 'รอตอบรับ' 
  | 'ยอมรับแล้ว' 
  | 'ปฏิเสธแล้ว' 
  | 'ชำระแล้ว' 
  | 'เกินกำหนด' 
  | 'ยกเลิก' 
  | 'รอชำระ'
  | 'ค้างชำระ'
  | 'สมบูรณ์'; // [ใหม่] เพิ่มสถานะสำหรับใบเสร็จ

export interface SalesDocument {
  id: string;
  businessid: string;
  doc_number: string;
  customer_name: string;
  customer_address: string;
  issue_date: string;
  due_date?: string;
  items: DocumentItem[];
  subtotal: number;
  vat_amount: number;
  grand_total: number;
  status: DocumentStatus;
  notes?: string;
  created_at: string; 
  discount_amount?: number;
  withholding_tax_amount?: number;
}

export interface Quotation extends SalesDocument {
  type: 'quotation';
  expiry_date: string;
  converted_to_invoice_id?: string | null;
  accepted_date?: string | null; 
}

export interface ProformaInvoice extends SalesDocument {
  type: 'proforma';
  expiry_date: string;
  converted_to_invoice_id?: string | null;
  accepted_date?: string | null;
}

export interface Invoice extends SalesDocument {
  type: 'invoice';
  related_quotation_id?: string;
  related_transaction_id?: string | null;
  related_receipt_id?: string | null;
}

// [ใหม่] เพิ่ม Interface สำหรับใบเสร็จ
export interface Receipt extends SalesDocument {
    type: 'receipt';
    related_invoice_id: string;
    related_transaction_id: string;
    payment_date: string;
}

export interface CreditNote extends SalesDocument {
    type: 'credit-note';
    original_invoice_id: string;
    original_invoice_number: string;
    reason: string;
}

export interface DebitNote extends SalesDocument {
    type: 'debit-note';
    original_invoice_id: string;
    original_invoice_number: string;
    reason: string;
}

export type SalesDoc = Quotation | ProformaInvoice | Invoice | CreditNote | DebitNote | Receipt;


export type FirestoreTransactionData = Omit<Transaction, 'id' | 'date' | 'created_at'> & {
    date: string;
    created_at: string;
};

