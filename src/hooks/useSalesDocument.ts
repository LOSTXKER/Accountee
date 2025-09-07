// src/hooks/useSalesDocument.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SalesDoc, Business, DocumentStatus, Quotation, Invoice, ProformaInvoice, Receipt, DocumentItem, Transaction, Customer, Service, TransactionStatus, VatType } from '@/types';
import { resolveTimeline } from '@/lib/sales/timeline-utils';
import { canRecordPayment, computeInvoiceStatusAfterReceiptVoid, isForwardLockedFromTimeline } from '@/lib/sales/rules';
import { useCustomers } from './useCustomers';
import { useServices } from './useServices';
import { PostgrestError } from '@supabase/supabase-js';

// Helper to convert date strings to ISO strings for Supabase
const toISOString = (date: Date | string | undefined | null) => {
    if (!date) return null;
    return new Date(date).toISOString();
};

const supabase = createClient();

export function useSalesDocument() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { businessId, docId } = params as { businessId: string, docId?: string };

    const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [businessData, setBusinessData] = useState<Partial<Business>>({});
    const [docData, setDocData] = useState<SalesDoc | null>(null);

    const [docType, setDocType] = useState<SalesDoc['type']>('quotation');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [manualCustomerName, setManualCustomerName] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    // ใช้วันที่ปัจจุบันตาม timezone ท้องถิ่นเป็นค่าเริ่มต้น
    const [issueDate, setIssueDate] = useState(() => {
        const today = new Date();
        const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
        return localDate.toISOString().split('T')[0];
    });
    const [dueDate, setDueDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [items, setItems] = useState<DocumentItem[]>([{ description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [withholdingTaxAmount, setWithholdingTaxAmount] = useState<number>(0);
    const [vatRate] = useState(7);
    const [sourceDocId, setSourceDocId] = useState<string | null>(null);

    const { customers, loading: customersLoading } = useCustomers(businessId);
    const { services, loading: servicesLoading } = useServices(businessId);

    const totals = useMemo(() => {
        const itemsSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
        const subtotalAfterDiscount = itemsSubtotal - discountAmount;
        const calculatedVat = subtotalAfterDiscount * (vatRate / 100);
        const totalAfterVat = subtotalAfterDiscount + calculatedVat;
        const finalGrandTotal = totalAfterVat - withholdingTaxAmount;
        return {
            subtotal: itemsSubtotal,
            vatAmount: calculatedVat,
            grandTotal: finalGrandTotal
        };
    }, [items, discountAmount, withholdingTaxAmount, vatRate]);

    const populateForm = useCallback((data: SalesDoc, isConverting: boolean = false) => {
        setDocData(data);
        if (!isConverting) {
            setDocType(data.type);
        }
        // Handle both underscore and no-underscore field names safely
        const issueDateValue = (data as any).issuedate || (data as any).issue_date;
        if (isConverting) {
            // ใช้วันที่ปัจจุบันตาม timezone ท้องถิ่น
            const today = new Date();
            const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
            setIssueDate(localDate.toISOString().split('T')[0]);
        } else {
            setIssueDate(issueDateValue ? new Date(issueDateValue).toISOString().split('T')[0] : 
                (() => {
                    const today = new Date();
                    const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
                    return localDate.toISOString().split('T')[0];
                })());
        }
        
        // Handle customer name field variations
        const customerName = (data as any).customername || (data as any).customer_name || '';
        setManualCustomerName(customerName);
        
        // Handle customer address field variations  
        const customerAddr = (data as any).customeraddress || (data as any).customer_address || '';
        setCustomerAddress(customerAddr);
        
        setItems(data.items);
        
        // Handle discount amount field variations
        const discountAmt = (data as any).discountamount || (data as any).discount_amount || 0;
        setDiscountAmount(discountAmt);
        
        // Handle withholding tax field variations
        const whtAmt = (data as any).withholdingtaxamount || (data as any).withholding_tax_amount || 0;
        setWithholdingTaxAmount(whtAmt);

        if (!isConverting) {
            // Handle due date field variations
            const dueDateValue = (data as any).duedate || (data as any).due_date;
            const due = dueDateValue ? new Date(dueDateValue).toISOString().split('T')[0] : '';
            
            // Handle expiry date field variations
            const expiryDateValue = (data as any).expirydate || (data as any).expiry_date;
            const expiry = expiryDateValue ? new Date(expiryDateValue).toISOString().split('T')[0] : '';
            setDueDate(due);
            setExpiryDate(expiry);
        }

        const customer = customers.find(c => c.name === data.customer_name && c.address === data.customer_address);
        if (customer) { setSelectedCustomerId(customer.id); }
        setIsLoading(false);
    }, [customers]);

    // Helper: determine if current document should be forward-locked (a forward doc exists and isn't canceled)
    const isForwardLocked = useCallback(async (doc: SalesDoc): Promise<boolean> => {
        try {
            const tl = await resolveTimeline(supabase, doc);
            return isForwardLockedFromTimeline(doc, tl as any);
        } catch {
            return false;
        }
    }, []);

    // Helper: allocate a new document number using document_counters with optimistic CAS retry
    const allocateDocumentNumber = useCallback(async (type: SalesDoc['type']): Promise<string> => {
        // Fetch prefixes
        const currentYear = new Date().getFullYear();
        const { data: biz } = await supabase
            .from('businesses')
            .select('invoice_prefix, quotation_prefix, receipt_prefix')
            .eq('id', businessId)
            .single();
        const defaultPrefixes: Record<SalesDoc['type'], string> = {
            quotation: `QT-${currentYear}-`,
            proforma: `PF-${currentYear}-`,
            invoice: `INV-${currentYear}-`,
            'credit-note': `CN-${currentYear}-`,
            'debit-note': `DN-${currentYear}-`,
            receipt: `RC-${currentYear}-`,
        } as any;
        const prefix = type === 'invoice'
            ? (biz?.invoice_prefix || defaultPrefixes.invoice)
            : type === 'quotation'
            ? (biz?.quotation_prefix || defaultPrefixes.quotation)
            : type === 'receipt'
            ? (biz?.receipt_prefix || defaultPrefixes.receipt)
            : (defaultPrefixes as any)[type] || `DOC-${currentYear}-`;

        // Ensure counter row exists
        let counterRow: any = null;
        {
            const { data: c } = await supabase
                .from('document_counters')
                .select('invoice_next_number, quotation_next_number, receipt_next_number')
                .eq('business_id', businessId)
                .maybeSingle();
            if (!c) {
                await supabase.from('document_counters').insert({
                    business_id: businessId,
                    invoice_next_number: 1,
                    quotation_next_number: 1,
                    receipt_next_number: 1,
                });
            } else {
                counterRow = c;
            }
        }

        const fieldMap: Record<SalesDoc['type'], keyof any> = {
            quotation: 'quotation_next_number',
            proforma: 'quotation_next_number', // share with quotation unless a dedicated counter exists
            invoice: 'invoice_next_number',
            'credit-note': 'invoice_next_number',
            'debit-note': 'invoice_next_number',
            receipt: 'receipt_next_number',
        } as any;

        const field = fieldMap[type] as 'invoice_next_number' | 'quotation_next_number' | 'receipt_next_number';

        // CAS update retry loop
        for (let attempt = 0; attempt < 5; attempt++) {
            let currentVal: number;
            if (attempt === 0 && counterRow && typeof counterRow[field] === 'number') {
                currentVal = counterRow[field];
            } else {
                const { data: c2 } = await supabase
                    .from('document_counters')
                    .select(`${field}`)
                    .eq('business_id', businessId)
                    .single();
                currentVal = (c2 as any)?.[field] || 1;
            }

            const nextVal = currentVal + 1;
            const updatePayload: any = { [field]: nextVal };
            const { data: upd, error: updErr } = await supabase
                .from('document_counters')
                .update(updatePayload)
                .eq('business_id', businessId)
                .eq(field, currentVal)
                .select(field)
                .maybeSingle();

            if (updErr) {
                // Retry on conflict-like behavior
                continue;
            }
            if (!upd) {
                // No rows updated due to race; retry
                await new Promise(res => setTimeout(res, 50));
                continue;
            }

            // Allocated number is the previous value (currentVal)
            const numberPart = String(currentVal).padStart(4, '0');
            return `${prefix}${numberPart}`;
        }

        // Fallback if CAS failed repeatedly
        const ts = Date.now().toString().slice(-4);
        return `${prefix}${ts}`;
    }, [businessId]);

    const fetchDocument = useCallback(async () => {
        if (!docId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('sales_documents').select('*').eq('id', docId).single();
            if (error) throw error;
            if (data) {
                populateForm(data as SalesDoc);
            } else {
                setDocData(null);
            }
        } catch (error) { console.error("Error fetching document:", error); }
        finally {
             setIsLoading(false);
        }
    }, [docId, populateForm]);

    useEffect(() => {
        if (customersLoading || servicesLoading) return;

    const docTypeFromUrl = searchParams.get('type') as SalesDoc['type'] | null;
    const fromQuotationId = searchParams.get('fromQuotationId');
    const fromInvoiceId = searchParams.get('fromInvoiceId');
    const fromDocumentId = searchParams.get('fromDocId');

        const fetchSourceDoc = async (id: string, targetDocType: 'invoice' | 'receipt') => {
            const { data, error } = await supabase.from('sales_documents').select('*').eq('id', id).single();
            if (error) {
                console.error('Error fetching source document:', error);
                alert('ไม่พบเอกสารต้นฉบับ');
                router.push(`/dashboard/${businessId}/sales`);
                return;
            }
            if (data) {
                // Enforce forward-lock: do not allow creating further docs from a source that already has a forward doc
                try {
                    const locked = await isForwardLocked(data as SalesDoc);
                    if (locked) {
                        alert('ไม่สามารถสร้างเอกสารถัดไปได้ เนื่องจากแหล่งเอกสารมีเอกสารขั้นถัดไปอยู่แล้ว');
                        router.push(`/dashboard/${businessId}/sales/${id}`);
                        return;
                    }
                } catch {}
                // If converting a quotation to invoice but it already has a linked invoice, redirect to that invoice instead of creating a duplicate.
                if (targetDocType === 'invoice') {
                    const linkedInvoiceId = (data as any)?.convertedtoinvoiceid || (data as any)?.converted_to_invoice_id;
                    if (linkedInvoiceId) {
                        router.push(`/dashboard/${businessId}/sales/${linkedInvoiceId}`);
                        return;
                    }
                }
                setMode('new');
                setDocType(targetDocType);
                setSourceDocId(id);
                populateForm(data as SalesDoc, true);
            }
        };

        if (docId) {
            setMode('view');
            fetchDocument();
        } else {
            setMode('new');
            // ตั้งวันที่เป็นปัจจุบันทุกครั้งที่เข้าหน้าสร้างเอกสารใหม่ (ใช้ timezone ท้องถิ่น)
            const today = new Date();
            const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
            const todayLocal = localDate.toISOString().split('T')[0];
            setIssueDate(todayLocal);
            
            if (fromQuotationId) {
                fetchSourceDoc(fromQuotationId, 'invoice');
            } else if (fromInvoiceId) {
                fetchSourceDoc(fromInvoiceId, 'receipt');
            } else if (fromDocumentId) {
                // Duplicate from any existing document
                const fetchDuplicate = async () => {
                    const { data, error } = await supabase.from('sales_documents').select('*').eq('id', fromDocumentId).single();
                    if (!error && data) {
                        setMode('new');
                        // Use type from URL if provided, else keep original type
                        setDocType((docTypeFromUrl as SalesDoc['type']) || (data as SalesDoc).type);
                        setSourceDocId(null); // duplication should not link source
                        populateForm(data as SalesDoc, true); // isConverting = true เพื่อใช้วันที่ปัจจุบัน
                    } else {
                        console.error('Cannot duplicate: source document not found', error);
                    }
                };
                fetchDuplicate();
            } else {
                setDocType(docTypeFromUrl || 'quotation');
                setIsLoading(false);
            }
        }
        
        const fetchBusinessDetails = async () => {
            if (!businessId) return;
            const { data, error } = await supabase.from('businesses').select('*').eq('id', businessId).single();
            if (data) setBusinessData(data);
        };
        fetchBusinessDetails();
    }, [docId, searchParams, businessId, router, populateForm, customersLoading, servicesLoading, fetchDocument]);

    // Auto-fill due date and expiry date based on issue date
    useEffect(() => {
        if (issueDate && mode === 'new') {
            const issueDateTime = new Date(issueDate);
            if (!isNaN(issueDateTime.getTime())) {
                // Add 7 days to issue date
                const sevenDaysLater = new Date(issueDateTime);
                sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
                const sevenDaysLaterString = sevenDaysLater.toISOString().split('T')[0];
                
                // Auto-fill due date for invoices
                if (docType === 'invoice' && !dueDate) {
                    setDueDate(sevenDaysLaterString);
                }
                
                // Auto-fill expiry date for quotations and proforma invoices
                if ((docType === 'quotation' || docType === 'proforma') && !expiryDate) {
                    setExpiryDate(sevenDaysLaterString);
                }
            }
        }
    }, [issueDate, docType, mode, dueDate, expiryDate]);
    
    const handleEdit = () => { setMode('edit'); };

    const handleSave = async (statusOverride?: DocumentStatus) => {
        if (!manualCustomerName) { alert("กรุณากรอกชื่อลูกค้า"); return; }
        if (!businessId) { alert("ไม่พบข้อมูล Business ID"); return; }
        
        setIsSubmitting(true);
        
        // ตรวจสอบว่า business ID มีอยู่จริงหรือไม่
        try {
            const { data: business, error: bizError } = await supabase
                .from('businesses')
                .select('id')
                .eq('id', businessId)
                .single();
                
            if (bizError || !business) {
                console.error("Business not found:", bizError);
                alert(`ไม่พบข้อมูลธุรกิจ (ID: ${businessId})`);
                setIsSubmitting(false);
                return;
            }
        } catch (e) {
            console.error("Error checking business:", e);
            alert("เกิดข้อผิดพลาดในการตรวจสอบข้อมูลธุรกิจ");
            setIsSubmitting(false);
            return;
        }
        
        let finalStatus: DocumentStatus;
        if (statusOverride) { 
            finalStatus = statusOverride; 
        } else if (mode === 'edit' && docData) { 
            finalStatus = docData.status; 
        } else if (docType === 'invoice') { 
            finalStatus = 'รอชำระ'; 
        } else if (docType === 'receipt') { 
            finalStatus = 'ชำระแล้ว'; 
        } else { 
            finalStatus = 'รอตอบรับ'; 
        }
        
        // Map to DB column names (no underscores) for compatibility with current schema and RPC
        const currentDateTime = new Date().toISOString();
        const actualIssueDate = mode === 'new' ? currentDateTime : toISOString(issueDate);
        
        const commonDataDb = {
            // DB-style keys (no underscores) - consistent with table schema
            businessid: businessId,
            customername: manualCustomerName.trim(),
            customeraddress: customerAddress.trim(),
            issuedate: actualIssueDate,
            items,
            subtotal: totals.subtotal,
            discountamount: discountAmount,
            vatamount: totals.vatAmount,
            withholdingtaxamount: withholdingTaxAmount,
            grandtotal: totals.grandTotal,
            status: finalStatus,
            notes: docData?.notes || ''
        } as any;
        
        try {
            if (mode === 'edit' && docId) {
                // Strict forward-lock enforcement for existing docs
                if (docData && await isForwardLocked(docData)) {
                    alert('ไม่สามารถแก้ไขเอกสารนี้ได้ เนื่องจากมีเอกสารขั้นถัดไปอยู่ กรุณายกเลิกเอกสารที่อยู่ข้างหน้าก่อน');
                    setIsSubmitting(false);
                    return;
                }
                const { error } = await supabase.from('sales_documents').update(commonDataDb).eq('id', docId);
                if (error) throw error;
                setMode('view');
                await fetchDocument();
            } else {
                console.log("Creating new document with RPC:", {
                    businessId,
                    docType,
                    customerName: manualCustomerName,
                    grandTotal: totals.grandTotal
                });
                
                const { data: savedDoc, error } = await supabase.rpc('create_sales_document', {
                    p_business_id: businessId,
                    p_doc_type: docType,
                    // Pass DB-friendly keys to RPC as well
                    p_common_data: commonDataDb,
                    p_due_date: toISOString(dueDate || actualIssueDate),
                    p_expiry_date: toISOString(expiryDate || actualIssueDate),
                    p_source_doc_id: sourceDocId,
                    // Redundant explicit params for compatibility with other function signatures
                    p_customername: manualCustomerName.trim(),
                    p_customeraddress: customerAddress.trim(),
                    p_issuedate: actualIssueDate,
                    p_subtotal: totals.subtotal,
                    p_discountamount: discountAmount,
                    p_vatamount: totals.vatAmount,
                    p_withholdingtaxamount: withholdingTaxAmount,
                    p_grandtotal: totals.grandTotal,
                    p_status: finalStatus,
                    p_notes: docData?.notes || '',
                    p_items: items
                });

                if (error) {
                    console.error("RPC create_sales_document failed:", error);
                    // If the RPC does not exist on this Supabase project, fall back to a direct insert
                    const msg = (error as PostgrestError)?.message || '';
                    const code = (error as PostgrestError)?.code || '';
                    // Also handle HTTP 404 wrapped errors from PostgREST
                    const looksLikeMissing = code === 'PGRST202' 
                        || code === '42883' 
                        || msg.toLowerCase().includes('not found')
                        || msg.includes('Could not find the function')
                        || msg.toLowerCase().includes('function create_sales_document')
                        || msg.toLowerCase().includes('rpc create_sales_document');
                    if (looksLikeMissing) {
                        console.log("Using fallback direct insert method");
                        // Allocate a counter-based document number (fallback path)
                        const generatedDocNumber = await allocateDocumentNumber(docType);
                        
                        // Try direct insert with DB no-underscore column names
                        const insertNoUnderscore: any = {
                            businessid: businessId,
                            type: docType,
                            docnumber: generatedDocNumber,
                            customername: manualCustomerName.trim(),
                            customeraddress: customerAddress.trim(),
                            issuedate: actualIssueDate,
                            items,
                            subtotal: totals.subtotal,
                            discountamount: discountAmount,
                            vatamount: totals.vatAmount,
                            withholdingtaxamount: withholdingTaxAmount,
                            grandtotal: totals.grandTotal,
                            status: finalStatus,
                            notes: docData?.notes || ''
                        };
                        if (docType === 'invoice') {
                            (insertNoUnderscore as any).duedate = toISOString(dueDate || actualIssueDate);
                        } else {
                            (insertNoUnderscore as any).expirydate = toISOString(expiryDate || actualIssueDate);
                        }

                        const { data, error: directInsertError } = await supabase
                            .from('sales_documents')
                            .insert(insertNoUnderscore)
                            .select('id')
                            .single();
                        
                        if (directInsertError) throw directInsertError;
                        
                        const newDocId = data.id;
                        // Link back to source when creating from a quotation to prevent duplicates.
                        if (sourceDocId && docType === 'invoice') {
                            try {
                                await updateSalesDocWithFallback(sourceDocId, [
                                    { converted_to_invoice_id: newDocId },
                                    { relatedinvoiceid: newDocId }
                                ]);
                            } catch (e) {
                                console.error('Failed to link quotation to invoice:', e);
                            }
                        }
                        if (docType === 'receipt' && finalStatus === 'ชำระแล้ว') {
                            // Link both directions: invoice -> receipt, and receipt -> invoice
                            if (sourceDocId) {
                                try {
                                    await updateSalesDocWithFallback(sourceDocId, [
                                        { status: 'ชำระแล้ว', relatedreceiptid: newDocId }
                                    ]);
                                    await updateSalesDocWithFallback(newDocId, [
                                        { relatedinvoiceid: sourceDocId }
                                    ]);
                                } catch (e) {
                                    console.error('Failed to link receipt to invoice (fallback path):', e);
                                }
                            }
                            // Auto-create income transaction for this receipt (direct-insert path)
                            try {
                                // Fetch receipt details for docnumber and related invoice
                                const { data: receiptRow } = await supabase
                                    .from('sales_documents')
                                    .select('id, docnumber, customername, issuedate, withholdingtaxamount, vatamount, subtotal, discountamount, grandtotal, relatedinvoiceid')
                                    .eq('id', newDocId)
                                    .single();

                                // สร้าง income transaction สำหรับใบเสร็จนี้
                                const txStatus: TransactionStatus = (Number((receiptRow as any)?.withholdingtaxamount || withholdingTaxAmount || 0) > 0)
                                    ? 'รอรับ หัก ณ ที่จ่าย'
                                    : 'เสร็จสมบูรณ์';
                                const description = `รายรับจากใบเสร็จ ${receiptRow?.docnumber || ''} (คู่ค้า: ${receiptRow?.customername || manualCustomerName.trim()})`;

                                const insertTx: Partial<Transaction> & { date: string } = {
                                    businessid: businessId,
                                    date: toISOString((receiptRow as any)?.issuedate || issueDate)!,
                                    description,
                                    amount: Number((receiptRow as any)?.grandtotal ?? totals.grandTotal),
                                    type: 'income',
                                    category: 'รายได้จากการให้บริการ',
                                    status: txStatus,
                                    attachment_status: 'none',
                                    vattype: 'include' as VatType,
                                    subtotal: Number((receiptRow as any)?.subtotal ?? Math.max(0, totals.subtotal - discountAmount)),
                                    vatamount: Number((receiptRow as any)?.vatamount ?? totals.vatAmount),
                                    withholdingtax: Number((receiptRow as any)?.withholdingtaxamount ?? (withholdingTaxAmount || 0)),
                                    isdeleted: false,
                                    // ลบ source_doc_id และ created_at ที่ไม่มีใน schema
                                } as any;

                                const { data: txInserted, error: txErr } = await supabase
                                    .from('transactions')
                                    .insert(insertTx as any)
                                    .select('id')
                                    .single();
                                if (!txErr && txInserted?.id && sourceDocId) {
                                    // Link transaction back to invoice for traceability (best-effort, handle both column styles)
                                    try {
                                        await updateSalesDocWithFallback(sourceDocId, [
                                            { relatedtransactionid: txInserted.id },
                                            { related_transaction_id: txInserted.id },
                                        ]);
                                    } catch {}
                                }
                            } catch (e) {
                                console.error('Auto-create income transaction (fallback path) failed:', e);
                            }
                        }

                        // อัปเดต issueDate ในฟอร์มให้ตรงกับวันที่ที่บันทึกจริงในฐานข้อมูล
                        setIssueDate(new Date(currentDateTime).toISOString().split('T')[0]);

                        router.push(`/dashboard/${businessId}/sales/${newDocId}`);
                        return;
                    }

                    throw error;
                }
                
                const newDocId = savedDoc.id;

                // Ensure source quotation is linked to created invoice to avoid duplicate creation affordance.
                if (sourceDocId && docType === 'invoice') {
                    try {
                        await updateSalesDocWithFallback(sourceDocId, [
                            { converted_to_invoice_id: newDocId },
                            { relatedinvoiceid: newDocId }
                        ]);
                    } catch (e) {
                        console.error('Failed to link quotation to invoice (RPC path):', e);
                    }
                }
                if (docType === 'receipt' && finalStatus === 'ชำระแล้ว') {
                    // Link both directions: invoice -> receipt, and receipt -> invoice
                    if (sourceDocId) {
                        try {
                            await updateSalesDocWithFallback(sourceDocId, [
                                { status: 'ชำระแล้ว', relatedreceiptid: newDocId }
                            ]);
                            await updateSalesDocWithFallback(newDocId, [
                                { relatedinvoiceid: sourceDocId }
                            ]);
                        } catch (e) {
                            console.error('Failed to link receipt to invoice (RPC path):', e);
                        }
                    }
                    // Auto-create income transaction for this receipt (RPC path)
                    try {
                        // Fetch receipt details for docnumber and customer
                        const { data: receiptRow } = await supabase
                            .from('sales_documents')
                            .select('id, docnumber, customername, issuedate, subtotal, discountamount, vatamount, withholdingtaxamount, grandtotal')
                            .eq('id', newDocId)
                            .single();

                        // สร้าง income transaction สำหรับใบเสร็จนี้
                        const txStatus: TransactionStatus = (Number((receiptRow as any)?.withholdingtaxamount || withholdingTaxAmount || 0) > 0)
                            ? 'รอรับ หัก ณ ที่จ่าย'
                            : 'เสร็จสมบูรณ์';

                        const description = `รายรับจากใบเสร็จ ${receiptRow?.docnumber || ''} (คู่ค้า: ${receiptRow?.customername || manualCustomerName.trim()})`;

                        const insertTx: Partial<Transaction> & { date: string } = {
                            businessid: businessId,
                            date: toISOString((receiptRow as any)?.issuedate || issueDate)!,
                            description,
                            amount: Number((receiptRow as any)?.grandtotal ?? totals.grandTotal),
                            type: 'income',
                            category: 'รายได้จากการให้บริการ',
                            status: txStatus,
                            attachment_status: 'none',
                            vattype: 'include' as VatType,
                            subtotal: Number((receiptRow as any)?.subtotal ?? Math.max(0, totals.subtotal - discountAmount)),
                            vatamount: Number((receiptRow as any)?.vatamount ?? totals.vatAmount),
                            withholdingtax: Number((receiptRow as any)?.withholdingtaxamount ?? (withholdingTaxAmount || 0)),
                            isdeleted: false,
                            // ลบ source_doc_id และ created_at ที่ไม่มีใน schema
                        } as any;

                        const { data: txInserted, error: txErr } = await supabase
                            .from('transactions')
                            .insert(insertTx as any)
                            .select('id')
                            .single();
                        if (!txErr && txInserted?.id && sourceDocId) {
                            // Link transaction id on related invoice (best-effort)
                            try {
                                await updateSalesDocWithFallback(sourceDocId, [
                                    { relatedtransactionid: txInserted.id },
                                    { related_transaction_id: txInserted.id },
                                ]);
                            } catch {}
                        } else if (sourceDocId) {
                            // ensure invoice link if missed (แม้ไม่มี transaction)
                            try { await updateSalesDocWithFallback(sourceDocId, [{ relatedtransactionid: null }, { related_transaction_id: null }]); } catch {}
                        }
                    } catch (e) {
                        console.error('Auto-create income transaction (RPC path) failed:', e);
                    }
                }

                // อัปเดต issueDate ในฟอร์มให้ตรงกับวันที่ที่บันทึกจริงในฐานข้อมูล
                if (mode === 'new') {
                    setIssueDate(new Date(currentDateTime).toISOString().split('T')[0]);
                }

                router.push(`/dashboard/${businessId}/sales/${newDocId}`);
            }
        } catch (error) { 
            console.error("Error saving document:", error); 
            // แสดงข้อผิดพลาดแบบละเอียด
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            const postgrestError = (error as any)?.message || '';
            const errorCode = (error as any)?.code || '';
            
            console.error("Detailed error info:", {
                message: errorMessage,
                postgrestMessage: postgrestError,
                code: errorCode,
                businessId,
                docType,
                fullError: error
            });
            
            alert(`เกิดข้อผิดพลาดในการบันทึกเอกสาร: ${postgrestError || errorMessage}`); 
        }
        finally { setIsSubmitting(false); }
    };
    
    const handleStatusChange = async (newStatus: DocumentStatus) => { 
        if (!docData) return; 
        try { 
            const { error } = await supabase.from('sales_documents').update({ status: newStatus }).eq('id', docData.id);
            if (error) throw error;
            if (docData) setDocData({...docData, status: newStatus}); 
        } catch (error) { console.error("Error updating status:", error); } 
    };

    const handleAcceptQuotation = async (acceptanceDate: string) => { 
        if (!docData) return; 
        try { 
            const { error } = await supabase.rpc('accept_quotation', { p_doc_id: docData.id, p_acceptance_date: toISOString(acceptanceDate) });
            if (error) throw error;
            fetchDocument(); 
        } catch (error) { console.error("Error accepting quotation:", error); } 
    };
    
    const handleRecordPayment = async () => { 
        if (!docData || docData.type !== 'invoice') return;
        if (!canRecordPayment(docData.status)) return;
        await handleStatusChange('ชำระแล้ว');
        // Navigate directly to create receipt for a smoother flow
        router.push(`/dashboard/${businessId}/sales/new?type=receipt&fromInvoiceId=${docData.id}`);
    };
    
    const handleCreateReceipt = async () => {
        // This function is now deprecated and replaced by the new flow.
        // Kept for now to avoid breaking changes if called elsewhere, but should be removed.
        if (!docData || docData.type !== 'invoice') return;
        if (docData.status !== 'ชำระแล้ว') { alert('กรุณาบันทึกการรับชำระเงินก่อน'); return; }
        router.push(`/dashboard/${businessId}/sales/new?type=receipt&fromInvoiceId=${docData.id}`);
    };

    // Helper: try multiple update payload variants to handle different column names between environments
    const updateSalesDocWithFallback = async (id: string, variants: any[]) => {
        let lastErr: any = null;
        for (const data of variants) {
            const { error } = await supabase.from('sales_documents').update(data).eq('id', id);
            if (!error) return; // success
            lastErr = error;
            const msg = (error as PostgrestError)?.message || '';
            const isMissingColumn = msg.includes("Could not find the '") || msg.toLowerCase().includes('column');
            // If it's not a missing column error, stop retrying and throw immediately
            if (!isMissingColumn) throw error;
            // else try next variant
        }
        if (lastErr) throw lastErr;
    };

    const handleVoidDocument = async () => {
        if (!docData) return;
        if (docData.status === 'ยกเลิก') {
            alert('เอกสารถูกยกเลิกแล้ว');
            return;
        }
        // Additional guard: forward-locked docs cannot be voided until forward docs are canceled
        if (await isForwardLocked(docData)) {
            alert('ไม่สามารถยกเลิกเอกสารนี้ได้ เนื่องจากมีเอกสารขั้นถัดไปอยู่ กรุณายกเลิกเอกสารที่อยู่ข้างหน้าก่อน');
            return;
        }
        if (!window.confirm('ยืนยันการยกเลิกเอกสารนี้หรือไม่? การดำเนินการนี้อาจส่งผลต่อเอกสารที่เกี่ยวข้อง')) return;

        setIsSubmitting(true);
        try {
            // Resolve full timeline with forward + reverse lookups (more robust than RPC-only)
            const timeline = await resolveTimeline(supabase, docData);

            // Check for downstream documents that are not already voided (enforce order: receipt -> invoice -> quotation)
            if (docData.type === 'quotation') {
                if (timeline.receipt && timeline.receipt.status !== 'ยกเลิก') {
                    alert('ไม่สามารถยกเลิกใบเสนอราคาได้ เนื่องจากมีใบเสร็จรับเงินที่เกี่ยวข้อง กรุณายกเลิกใบเสร็จรับเงินก่อน');
                    setIsSubmitting(false);
                    return;
                }
                if (timeline.invoice && timeline.invoice.status !== 'ยกเลิก') {
                    alert('ไม่สามารถยกเลิกใบเสนอราคาได้ เนื่องจากมีใบแจ้งหนี้ที่เกี่ยวข้อง กรุณายกเลิกใบแจ้งหนี้ก่อน');
                    setIsSubmitting(false);
                    return;
                }
            }
            if (docData.type === 'invoice' && timeline.receipt && timeline.receipt.status !== 'ยกเลิก') {
                alert('ไม่สามารถยกเลิกใบแจ้งหนี้ได้ เนื่องจากมีใบเสร็จรับเงินที่เกี่ยวข้อง กรุณายกเลิกใบเสร็จก่อน');
                setIsSubmitting(false);
                return;
            }

            // If voiding a receipt, revert the related invoice's status
            if (docData.type === 'receipt' && timeline.invoice) {
                const newInvoiceStatus: DocumentStatus = computeInvoiceStatusAfterReceiptVoid(timeline.invoice as any);

                try {
                    await updateSalesDocWithFallback(timeline.invoice.id, [
                        { status: newInvoiceStatus, relatedreceiptid: null },
                        { status: newInvoiceStatus, related_receipt_id: null },
                    ]);
                } catch (e: any) {
                    const msg = (e as PostgrestError)?.message || (e?.message ?? '');
                    throw new Error(`Failed to revert invoice status: ${msg}`);
                }
            }

            // If voiding an invoice, revert the related quotation's status to 'ยอมรับแล้ว'
            if (docData.type === 'invoice' && timeline.quotation) {
                // 1) Always set status first
                try {
                    const { error: sErr } = await supabase
                        .from('sales_documents')
                        .update({ status: 'ยอมรับแล้ว' as DocumentStatus })
                        .eq('id', timeline.quotation.id);
                    if (sErr) throw sErr;
                } catch (e: any) {
                    const msg = (e as PostgrestError)?.message || (e?.message ?? '');
                    throw new Error(`Failed to update quotation status: ${msg}`);
                }
                // 2) Best-effort: clear converted-to-invoice link (ignore missing-column errors)
                try {
                    await updateSalesDocWithFallback(timeline.quotation.id, [
                        { convertedtoinvoiceid: null },
                        { converted_to_invoice_id: null },
                    ]);
                } catch (e: any) {
                    const msg = (e as PostgrestError)?.message?.toLowerCase?.() || '';
                    const isMissingCol = msg.includes("could not find the '") || msg.includes('column');
                    if (!isMissingCol) {
                        throw new Error(`Failed to clear converted invoice link: ${(e as PostgrestError)?.message || e?.message || ''}`);
                    }
                    // else ignore
                }
                // 3) Best-effort: clear related-invoice link (ignore missing-column errors)
                try {
                    await updateSalesDocWithFallback(timeline.quotation.id, [
                        { relatedinvoiceid: null },
                        { related_invoice_id: null },
                    ]);
                } catch (e: any) {
                    const msg = (e as PostgrestError)?.message?.toLowerCase?.() || '';
                    const isMissingCol = msg.includes("could not find the '") || msg.includes('column');
                    if (!isMissingCol) {
                        throw new Error(`Failed to clear related invoice link: ${(e as PostgrestError)?.message || e?.message || ''}`);
                    }
                    // else ignore
                }
            }

            // Void the current document
            const { error: voidError } = await supabase
                .from('sales_documents')
                .update({ status: 'ยกเลิก' as DocumentStatus })
                .eq('id', docData.id);

            if (voidError) throw voidError;

            // If voiding a receipt, also cancel the linked income transaction created from it (best-effort)
            if (docData.type === 'receipt') {
                try {
                    // ค้นหา transaction ที่เกี่ยวข้องจาก description (เพราะไม่มี source_doc_id ในฐานข้อมูล)
                    const docNumber = (docData as any).docnumber || (docData as any).doc_number || '';
                    const { data: txFound } = await supabase
                        .from('transactions')
                        .select('id, status')
                        .eq('businessid', businessId)
                        .ilike('description', `%ใบเสร็จ ${docNumber}%`)
                        .eq('isdeleted', false)
                        .limit(1)
                        .maybeSingle();
                    if (txFound?.id) {
                        await supabase
                            .from('transactions')
                            .update({ status: 'ยกเลิก' as TransactionStatus })
                            .eq('id', txFound.id);
                    }
                } catch (e) {
                    console.warn('Failed to cancel linked income transaction for voided receipt:', e);
                }
            }

            // Update local state
            setDocData({ ...docData, status: 'ยกเลิก' });

            // Navigate to previous document in chain
            let redirectUrl: string | null = null;
            if (docData.type === 'receipt' && timeline.invoice) {
                redirectUrl = `/dashboard/${businessId}/sales/${timeline.invoice.id}`;
            } else if (docData.type === 'invoice' && timeline.quotation) {
                redirectUrl = `/dashboard/${businessId}/sales/${timeline.quotation.id}`;
            } else if (docData.type === 'quotation') {
                // No previous doc; go back to quotations list
                redirectUrl = `/dashboard/${businessId}/sales/quotations`;
            } else {
                // Fallback to sales root
                redirectUrl = `/dashboard/${businessId}/sales`;
            }

            // Optional message then redirect
            // alert('เอกสารถูกยกเลิกเรียบร้อยแล้ว');
            router.push(redirectUrl);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            console.error('Error voiding document:', errorMessage);
            alert(`ยกเลิกเอกสารไม่สำเร็จ: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    const handleDelete = async () => {
        // ปิดการลบถาวรตามนโยบายใหม่
        alert('ปิดการลบเอกสารถาวรแล้ว กรุณาใช้การยกเลิกเอกสารแทน');
        return;
    };
    const handleCancel = useCallback(() => {
        // cancel editing/new and go back to view or list
        if (docData && docData.id && mode !== 'new') {
            // revert back to view mode
            setMode('view');
            fetchDocument();
        } else if (sourceDocId) {
            router.push(`/dashboard/${businessId}/sales/${sourceDocId}`);
        } else {
            router.push(`/dashboard/${businessId}/sales`);
        }
    }, [businessId, docData, fetchDocument, router, mode, sourceDocId]);

    return {
        mode, isLoading, isSubmitting, businessId, docId,
        docData, setDocData, businessData, customers, services,
        formState: { docType, setDocType, selectedCustomerId, setSelectedCustomerId, manualCustomerName, setManualCustomerName, customerAddress, setCustomerAddress, issueDate, setIssueDate, dueDate, setDueDate, expiryDate, setExpiryDate, items, setItems, discountAmount, setDiscountAmount, withholdingTaxAmount, setWithholdingTaxAmount },
        totals,
        handleEdit, handleSave, handleStatusChange, handleAcceptQuotation, handleRecordPayment, handleVoidDocument, handleDelete, handleCancel,
        fetchDocument,
        sourceDocId,
    };
}