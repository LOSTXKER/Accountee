import { SalesDoc, Invoice, Quotation, Receipt } from '@/types';

type TimelineResult = { quotation?: Quotation; invoice?: Invoice; receipt?: Receipt };

async function fetchById(supabase: any, id?: string | null) {
  if (!id) return undefined;
  const { data } = await supabase
    .from('sales_documents')
    .select('*')
    .eq('id', id)
    .single();
  return data as any;
}

export async function resolveTimeline(
  supabase: any,
  docData: SalesDoc
): Promise<TimelineResult> {
  let q: Quotation | undefined;
  let inv: Invoice | undefined;
  let r: Receipt | undefined;

  try {
    const { data, error } = await supabase.rpc('get_document_timeline', {
      p_doc_id: docData.id,
    });

    if (error) {
      // Fallback to current document only
      if (docData.type === 'quotation') q = docData as any;
      if (docData.type === 'invoice') inv = docData as any;
      if (docData.type === 'receipt') r = docData as any;
    } else if (data) {
      if (Array.isArray(data)) {
        q = data.find((d: any) => d.type === 'quotation');
        inv =
          data.find((d: any) => d.type === 'invoice') ||
          (docData.type === 'invoice' ? (docData as Invoice) : undefined);
        r = data.find((d: any) => d.type === 'receipt');
      } else if ((data as any)?.document) {
        const doc = (data as any).document as SalesDoc;
        if (doc.type === 'quotation') q = doc as any;
        if (doc.type === 'invoice') inv = doc as any;
        if (doc.type === 'receipt') r = doc as any;
      } else {
        if (docData.type === 'quotation') q = docData as any;
        if (docData.type === 'invoice') inv = docData as any;
        if (docData.type === 'receipt') r = docData as any;
      }
    } else {
      if (docData.type === 'quotation') q = docData as any;
      if (docData.type === 'invoice') inv = docData as any;
      if (docData.type === 'receipt') r = docData as any;
    }

    // Prefer current doc in its type slot
    if (docData.type === 'quotation') q = q || (docData as any);
    if (docData.type === 'invoice') inv = inv || (docData as any);
    if (docData.type === 'receipt') r = r || (docData as any);

    // Enrich timeline by following linkage fields and reverse lookups
    try {
      if (docData.type === 'quotation') {
        const invId =
          (docData as any).convertedtoinvoiceid ||
          (docData as any).converted_to_invoice_id ||
          (docData as any).relatedinvoiceid ||
          (docData as any).related_invoice_id ||
          (inv?.id);
        if (!inv && invId) inv = (await fetchById(supabase, invId)) as any;
        const rId =
          (inv as any)?.relatedreceiptid || (inv as any)?.related_receipt_id || r?.id;
        if (!r && rId) r = (await fetchById(supabase, rId)) as any;
      } else if (docData.type === 'invoice') {
        let qId =
          (docData as any).relatedquotationid ||
          (docData as any).related_quotation_id ||
          q?.id;
        if (!q && qId) {
          q = (await fetchById(supabase, qId)) as any;
        }
        // Reverse lookup by quotation.relatedinvoiceid then quotation.convertedtoinvoiceid
        if (!q) {
          const { data: qCandidates } = await supabase
            .from('sales_documents')
            .select('*')
            .eq('relatedinvoiceid', docData.id)
            .eq('type', 'quotation')
            .limit(1);
          if (qCandidates && qCandidates.length > 0) q = qCandidates[0] as any;
        }
        if (!q) {
          const { data: qCandidates2 } = await supabase
            .from('sales_documents')
            .select('*')
            .eq('convertedtoinvoiceid', docData.id)
            .eq('type', 'quotation')
            .limit(1);
          if (qCandidates2 && qCandidates2.length > 0) q = qCandidates2[0] as any;
        }
        const rId =
          (docData as any).relatedreceiptid ||
          (docData as any).related_receipt_id ||
          r?.id;
        if (!r && rId) r = (await fetchById(supabase, rId)) as any;
      } else if (docData.type === 'receipt') {
        let invId =
          (docData as any).relatedinvoiceid ||
          (docData as any).related_invoice_id ||
          inv?.id;
        if (!inv && invId) inv = (await fetchById(supabase, invId)) as any;
        // Reverse lookup invoice by invoice.relatedreceiptid
        if (!inv) {
          const { data: invCandidates } = await supabase
            .from('sales_documents')
            .select('*')
            .eq('relatedreceiptid', docData.id)
            .eq('type', 'invoice')
            .limit(1);
          if (invCandidates && invCandidates.length > 0) inv = invCandidates[0] as any;
        }
        const qId =
          (inv as any)?.relatedquotationid || (inv as any)?.related_quotation_id || q?.id;
        if (!q && qId) q = (await fetchById(supabase, qId)) as any;
        // Reverse lookup quotation by relatedinvoiceid then convertedtoinvoiceid
        if (!q && inv) {
          const { data: qCandidates } = await supabase
            .from('sales_documents')
            .select('*')
            .eq('relatedinvoiceid', (inv as any).id)
            .eq('type', 'quotation')
            .limit(1);
          if (qCandidates && qCandidates.length > 0) q = qCandidates[0] as any;
        }
        if (!q && inv) {
          const { data: qCandidates2 } = await supabase
            .from('sales_documents')
            .select('*')
            .eq('convertedtoinvoiceid', (inv as any).id)
            .eq('type', 'quotation')
            .limit(1);
          if (qCandidates2 && qCandidates2.length > 0) q = qCandidates2[0] as any;
        }
      }
    } catch (_) {
      // Non-fatal; keep whatever we have
    }
  } catch (err) {
    // Complete fallback - just show current document
    return {
      [docData.type]: docData,
    } as any;
  }

  return { quotation: q, invoice: inv, receipt: r };
}
