// src/lib/categories-data.ts
// Shared default categories tree for both client and server seeders

export type CategoryNode = {
  name: string;
  type: 'income' | 'cogs' | 'expense';
  children?: CategoryNode[];
};

export const defaultCategoriesTree: CategoryNode[] = [
  // Income Categories
  {
    name: 'รายได้',
    type: 'income',
    children: [
      { name: 'รายได้จากการขายสินค้า', type: 'income' },
      { name: 'รายได้จากการให้บริการ', type: 'income' },
      { name: 'รายได้อื่นๆ', type: 'income' },
    ],
  },

  // Cost of Goods Sold (COGS) Categories
  {
    name: 'ต้นทุนขายและบริการ',
    type: 'cogs',
    children: [
      { name: 'ต้นทุนซื้อสินค้าสำเร็จรูป', type: 'cogs' },
      { name: 'ต้นทุนวัตถุดิบ', type: 'cogs' },
      { name: 'ต้นทุนแรงงานทางตรง', type: 'cogs' },
    ],
  },

  // Expense Categories
  {
    name: 'ค่าใช้จ่ายในการขายและบริหาร',
    type: 'expense',
    children: [
      {
        name: 'ค่าใช้จ่ายด้านพนักงาน',
        type: 'expense',
        children: [
          { name: 'เงินเดือนและโบนัส', type: 'expense' },
          { name: 'ค่าคอมมิชชั่น', type: 'expense' },
          { name: 'เงินสมทบประกันสังคม', type: 'expense' },
        ],
      },
      {
        name: 'ค่าใช้จ่ายสำนักงาน',
        type: 'expense',
        children: [
          { name: 'ค่าเช่า', type: 'expense' },
          { name: 'ค่าสาธารณูปโภค (น้ำ, ไฟ)', type: 'expense' },
          { name: 'ค่าโทรศัพท์และอินเทอร์เน็ต', type: 'expense' },
          { name: 'ค่าวัสดุสิ้นเปลืองสำนักงาน', type: 'expense' },
          { name: 'ค่าซ่อมแซมและบำรุงรักษา', type: 'expense' },
        ],
      },
      {
        name: 'ค่าใช้จ่ายในการเดินทาง',
        type: 'expense',
        children: [
          { name: 'ค่าเดินทาง', type: 'expense' },
          { name: 'ค่าที่พัก', type: 'expense' },
        ],
      },
      {
        name: 'ค่าใช้จ่ายทางการตลาด',
        type: 'expense',
        children: [
          { name: 'ค่าการตลาดและโฆษณา', type: 'expense' },
          { name: 'ค่ารับรอง', type: 'expense' },
        ],
      },
      {
        name: 'ค่าใช้จ่ายทางการเงินและภาษี',
        type: 'expense',
        children: [
          { name: 'ค่าธรรมเนียมธนาคาร', type: 'expense' },
          { name: 'ดอกเบี้ยจ่าย', type: 'expense' },
          { name: 'ภาษีซื้อ (ไม่สามารถขอคืนได้)', type: 'expense' },
        ],
      },
      { name: 'ค่าบริการวิชาชีพ (บัญชี, กฎหมาย)', type: 'expense' },
      { name: 'ค่าเสื่อมราคา', type: 'expense' },
      { name: 'ค่าใช้จ่ายเบ็ดเตล็ด', type: 'expense' },
    ],
  },
];
