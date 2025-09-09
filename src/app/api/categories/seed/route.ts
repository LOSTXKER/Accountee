// src/app/api/categories/seed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { defaultCategoriesTree, type CategoryNode } from '@/lib/categories-data';

async function insertIfMissing(businessId: string, node: CategoryNode, parentId: string | null = null) {
  const keyMatch = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('businessid', businessId)
    .eq('name', node.name)
    .maybeSingle();

  let currentId = keyMatch.data?.id as string | undefined;
  if (!currentId) {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({
        businessid: businessId,
        name: node.name,
        type: node.type,
        parent_id: parentId,
      })
      .select('id')
      .single();
    if (error) throw error;
    currentId = data.id;
  }
  if (node.children?.length) {
    for (const child of node.children) {
      await insertIfMissing(businessId, child, currentId!);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 });
    }

    // optional sanity: ensure business exists
    const { data: biz, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single();
    if (bizErr || !biz) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    for (const root of defaultCategoriesTree) {
      await insertIfMissing(businessId, root, null);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Seed categories error:', e);
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
