// src/app/dashboard/[businessId]/settings/categories/page.tsx
"use client";

import { useState, useEffect, useCallback, Fragment, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PlusCircle, Edit, Trash2, Save, X, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { seedDefaultCategories } from '@/lib/default-categories';

type EditableCategory = Partial<Category> & { 
  isEditing?: boolean; 
  children?: EditableCategory[];
  isExpanded?: boolean;
};

const CategoryListItem = ({
  category,
  onUpdate,
  onDelete,
  onToggleEdit,
  onFieldChange,
  onToggleExpand,
  level = 0,
  allCategories,
  categoryTypeOptions,
}: {
  category: EditableCategory;
  onUpdate: (category: EditableCategory) => void;
  onDelete: (id: string) => void;
  onToggleEdit: (id: string) => void;
  onFieldChange: (id: string, field: keyof Category, value: any) => void;
  onToggleExpand: (id: string) => void;
  level?: number;
  allCategories: EditableCategory[];
  categoryTypeOptions: { value: string; label: string }[];
}) => {
  const hasChildren = category.children && category.children.length > 0;
  const parentOptions = allCategories
    .filter(c => c.type === category.type && c.id !== category.id && !category.children?.some(child => child.id === c.id)) // Prevent circular dependencies
    .map(c => ({ value: c.id!, label: c.name! }));

  return (
    <>
      <div 
        className={`flex items-center gap-2 p-2 rounded-md transition-colors hover:bg-gray-100 ${level > 0 ? 'bg-gray-50' : 'bg-white'}`}
      >
        <div className="flex-grow flex items-center gap-1">
           <div style={{ paddingLeft: `${level * 24}px` }} className="flex items-center">
            {hasChildren ? (
              <button onClick={() => onToggleExpand(category.id!)} className="p-1 rounded-full hover:bg-gray-200">
                {category.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            ) : <div className="w-6"></div>}
          </div>
          {category.isEditing ? (
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-2 items-center w-full">
              <Input value={category.name} onChange={(e) => onFieldChange(category.id!, 'name', e.target.value)} />
              <CustomSelect
                value={category.type!}
                onChange={(value) => onFieldChange(category.id!, 'type', value)}
                options={categoryTypeOptions}
              />
              <CustomSelect
                value={category.parent_id || ''}
                onChange={(value) => onFieldChange(category.id!, 'parent_id', value || null)}
                options={[{ value: '', label: 'ไม่มีหมวดหมู่หลัก' }, ...parentOptions]}
                placeholder="เลือกหมวดหมู่หลัก"
              />
            </div>
          ) : (
            <span className="font-medium text-gray-700">{category.name}</span>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          {category.isEditing ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => onUpdate(category)}><Save className="h-4 w-4 text-green-600" /></Button>
              <Button variant="secondary" size="sm" onClick={() => onToggleEdit(category.id!)}><X className="h-4 w-4 text-gray-600" /></Button>
            </>
          ) : (
            <>
              <Button variant="link" size="sm" onClick={() => onToggleEdit(category.id!)} >
                <Edit className="h-4 w-4 text-blue-600" />
              </Button>
              <Button variant="link" size="sm" onClick={() => onDelete(category.id!)} >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      </div>
      {hasChildren && category.isExpanded && category.children && (
        <div className="pl-4">
          {category.children.map(child => (
            <CategoryListItem
              key={child.id}
              category={child}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onToggleEdit={onToggleEdit}
              onFieldChange={onFieldChange}
              onToggleExpand={onToggleExpand}
              level={level + 1}
              allCategories={allCategories}
              categoryTypeOptions={categoryTypeOptions}
            />
          ))}
        </div>
      )}
    </>
  );
};


export default function CategoriesPage() {
  const [categories, setCategories] = useState<EditableCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expense' as const, parent_id: '' });
  const [isAdding, setIsAdding] = useState(false);
  const params = useParams();
  const businessId = params.businessId as string;
  const [isSeeding, setIsSeeding] = useState(false);

  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('businessid', businessId)
      .order('parent_id', { ascending: true, nullsFirst: true })
      .order('name', { ascending: true });

    if (error) {
      setError('ไม่สามารถดึงข้อมูลหมวดหมู่ได้: ' + error.message);
    } else {
      const processedData = data.map(c => ({ ...c, isExpanded: !c.parent_id }));
      setCategories(processedData);
    }
    setLoading(false);
  }, [businessId, supabase]);

  useEffect(() => {
    if (businessId) {
      fetchCategories();
    }
  }, [businessId, fetchCategories]);

  const handleSeedCategories = async () => {
    setIsSeeding(true);
    setError(null);
    try {
      // The seeding function is now non-destructive
      await seedDefaultCategories(businessId);
      await fetchCategories();
    } catch (err: any) {
      setError('เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่เริ่มต้น: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      alert('กรุณากรอกชื่อหมวดหมู่');
      return;
    }
    setIsAdding(true);
    const { data, error } = await supabase
      .from('categories')
      .insert({
        businessid: businessId,
        name: newCategory.name,
        type: newCategory.type,
        parent_id: newCategory.parent_id || null,
      })
      .select()
      .single();

    if (error) {
      setError('ไม่สามารถเพิ่มหมวดหมู่ได้: ' + error.message);
    } else if (data) {
      // Optimistic append
      setCategories(prev => [...prev, { ...data, isExpanded: true }]);
      setNewCategory({ name: '', type: 'expense', parent_id: '' });
    }
    setIsAdding(false);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้? การกระทำนี้จะลบหมวดหมู่ย่อยทั้งหมดด้วย')) return;

    const childrenIdsToDelete: string[] = [];
    const findChildren = (parentId: string) => {
        const children = categories.filter(c => c.parent_id === parentId);
        for (const child of children) {
            childrenIdsToDelete.push(child.id!);
            findChildren(child.id!);
        }
    };
    findChildren(id);

    const idsToDelete = [id, ...childrenIdsToDelete];
    const { error } = await supabase.from('categories').delete().in('id', idsToDelete);

    if (error) {
      setError('ไม่สามารถลบหมวดหมู่ได้: ' + error.message);
    } else {
      setCategories(categories.filter((cat) => !idsToDelete.includes(cat.id!)));
    }
  };
  
  const handleUpdateCategory = async (category: EditableCategory) => {
    if (!category.id || !category.name) return;

    const { data, error } = await supabase
      .from('categories')
      .update({ name: category.name, type: category.type, parent_id: category.parent_id })
      .eq('id', category.id)
      .select()
      .single();

    if (error) {
        setError('ไม่สามารถอัปเดตหมวดหมู่ได้: ' + error.message);
    } else if (data) {
        const updatedCategories = categories.map(c => c.id === data.id ? { ...c, ...data, isEditing: false } : c);
        setCategories(updatedCategories);
    }
  };

  const toggleEditMode = (id: string) => {
    setCategories(categories.map(c => c.id === id ? { ...c, isEditing: !c.isEditing } : c));
  };

  const toggleExpand = (id: string) => {
    setCategories(categories.map(c => c.id === id ? { ...c, isExpanded: !c.isExpanded } : c));
  };

  const handleFieldChange = (id: string, field: keyof Category, value: any) => {
    setCategories(categories.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const categoryTypeOptions = [
    { value: 'income', label: 'รายรับ' },
    { value: 'cogs', label: 'ต้นทุน' },
    { value: 'expense', label: 'ค่าใช้จ่าย' },
  ];

  // Memoized per-type trees to reduce heavy recalculation on each render
  const trees = useMemo(() => {
    const byType = {
      income: categories.filter(c => c.type === 'income'),
      cogs: categories.filter(c => c.type === 'cogs'),
      expense: categories.filter(c => c.type === 'expense'),
    } as Record<'income' | 'cogs' | 'expense', EditableCategory[]>;

    const buildTreeFast = (items: EditableCategory[]): EditableCategory[] => {
      const childrenMap = new Map<string | null, EditableCategory[]>();
      for (const it of items) {
        const key = (it.parent_id || null) as string | null;
        const arr = childrenMap.get(key) || [];
        arr.push(it);
        childrenMap.set(key, arr);
      }
      const attach = (node: EditableCategory): EditableCategory => ({
        ...node,
        children: (childrenMap.get(node.id!) || []).map(attach),
      });
      return (childrenMap.get(null) || []).map(attach);
    };

    return {
      income: buildTreeFast(byType.income),
      cogs: buildTreeFast(byType.cogs),
      expense: buildTreeFast(byType.expense),
    };
  }, [categories]);

  const renderCategoryGroup = (type: 'income' | 'cogs' | 'expense', title: string, tree: EditableCategory[]) => {
    if (!tree || tree.length === 0) return null;
    return (
      <div key={type} className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>
        <div className="space-y-1 p-2 bg-white rounded-lg shadow-sm border">
          {tree.map((cat) => (
             <CategoryListItem
                key={cat.id}
                category={cat}
                onUpdate={handleUpdateCategory}
                onDelete={handleDeleteCategory}
                onToggleEdit={toggleEditMode}
                onFieldChange={handleFieldChange}
                onToggleExpand={toggleExpand}
                allCategories={categories}
                categoryTypeOptions={categoryTypeOptions}
            />
          ))}
        </div>
      </div>
    );
  };

  const parentOptionsByType = useMemo(() => {
    return {
      income: categories.filter(c => c.type === 'income' && !c.parent_id).map(c => ({ value: c.id!, label: c.name! })),
      cogs: categories.filter(c => c.type === 'cogs' && !c.parent_id).map(c => ({ value: c.id!, label: c.name! })),
      expense: categories.filter(c => c.type === 'expense' && !c.parent_id).map(c => ({ value: c.id!, label: c.name! })),
    } as Record<'income' | 'cogs' | 'expense', { value: string; label: string }[]>;
  }, [categories]);

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold tracking-tight">ผังบัญชีหมวดหมู่</h2>
            <Button onClick={handleSeedCategories} disabled={isSeeding} variant="outline">
                {isSeeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle size={16} className="mr-2" />}
                เพิ่ม/อัปเดตหมวดหมู่มาตรฐาน
            </Button>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>เพิ่มหมวดหมู่ใหม่</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
                <label className="text-sm font-medium text-gray-600">1. ประเภท</label>
                <CustomSelect
                  value={newCategory.type}
                  onChange={(value) => setNewCategory({ ...newCategory, type: value as any, parent_id: '' })}
                  options={categoryTypeOptions}
                />
            </div>
            <div>
                <label className="text-sm font-medium text-gray-600">2. หมวดหมู่หลัก (ถ้ามี)</label>
                <CustomSelect
                  value={newCategory.parent_id}
                  onChange={(value) => setNewCategory({ ...newCategory, parent_id: value ?? '' })}
                  options={[{ value: '', label: 'ไม่มี (เป็นหมวดหมู่หลัก)' }, ...(parentOptionsByType[newCategory.type as 'income'|'cogs'|'expense'] || [])]}
                />
            </div>
            <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">3. ชื่อหมวดหมู่ใหม่</label>
                <Input
                  placeholder="เช่น ค่าโฆษณาออนไลน์"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleAddCategory} disabled={!newCategory.name.trim() || isAdding}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle size={16} className="mr-2" />}
              {isAdding ? 'กำลังเพิ่ม...' : 'เพิ่มหมวดหมู่'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        {loading ? (
            <div className="flex justify-center items-center h-60"><Loader2 className="h-12 w-12 animate-spin text-gray-400" /></div>
        ) : error ? (
            <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>
        ) : categories.length > 0 ? (
          <>
            {renderCategoryGroup('income', 'หมวดหมู่รายรับ', trees.income)}
            {renderCategoryGroup('cogs', 'หมวดหมู่ต้นทุนขาย/บริการ', trees.cogs)}
            {renderCategoryGroup('expense', 'หมวดหมู่ค่าใช้จ่าย', trees.expense)}
          </>
        ) : (
            <div className="text-center py-16 border-2 border-dashed rounded-lg bg-gray-50">
              <h3 className="text-xl font-semibold text-gray-700">ยังไม่มีผังบัญชี</h3>
              <p className="text-gray-500 mt-2 mb-4">
                เริ่มต้นสร้างผังบัญชีของคุณโดยการเพิ่มหมวดหมู่
                <br />
                หรือใช้ชุดหมวดหมู่มาตรฐานโดยคลิกปุ่มด้านบน
              </p>
            </div>
        )}
      </div>
    </div>
  );
}
