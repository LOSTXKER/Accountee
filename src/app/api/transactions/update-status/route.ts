// src/app/api/transactions/update-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const { transactionId, businessId, status } = await req.json();
    if (!transactionId || !businessId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate transaction ownership
    const { data: tx, error: findErr } = await supabaseAdmin
      .from('transactions')
      .select('id,businessid,isdeleted')
      .eq('id', transactionId)
      .single();

    if (findErr) {
      return NextResponse.json({ error: `Transaction lookup failed: ${findErr.message}` }, { status: 500 });
    }
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    if (tx.isdeleted) {
      return NextResponse.json({ error: 'Transaction is deleted' }, { status: 400 });
    }
    if (tx.businessid !== businessId) {
      return NextResponse.json({ error: 'Forbidden: Business mismatch' }, { status: 403 });
    }

    const { error: updErr } = await supabaseAdmin
      .from('transactions')
      .update({ status })
      .eq('id', transactionId);

    if (updErr) {
      return NextResponse.json({ error: `Update failed: ${updErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
