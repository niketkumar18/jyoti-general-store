import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { ProductCategory } from '../types';

export const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: 'dal_pulses', nameHi: 'दाल व दलहन', nameEn: 'Dal & Pulses', isDefault: true },
  { id: 'flour_grains', nameHi: 'आटा, चावल व अनाज', nameEn: 'Flour & Grains', isDefault: true },
  { id: 'oil_ghee', nameHi: 'तेल व घी', nameEn: 'Oil & Ghee', isDefault: true },
  { id: 'spices_masala', nameHi: 'मसाले व नमक', nameEn: 'Spices & Salt', isDefault: true },
  { id: 'soap_detergent', nameHi: 'साबुन व सर्फ', nameEn: 'Soap & Detergent', isDefault: true },
  { id: 'snacks_biscuit', nameHi: 'नाश्ता व बिस्कुट', nameEn: 'Snacks & Biscuits', isDefault: true },
  { id: 'beverages', nameHi: 'चाय, कॉफी व पेय', nameEn: 'Beverages & Tea', isDefault: true },
  { id: 'dairy', nameHi: 'दूध व डेयरी', nameEn: 'Milk & Dairy', isDefault: true },
  { id: 'personal_care', nameHi: 'पर्सनल केयर', nameEn: 'Personal Care', isDefault: true },
  { id: 'household', nameHi: 'घरेलू सामान', nameEn: 'Household Goods', isDefault: true },
  { id: 'other', nameHi: 'अन्य सामान', nameEn: 'Other Items', isDefault: true }
];

export function createCategorySlug(name: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return base ? `cat_${base}_${Date.now().toString().slice(-4)}` : `cat_${Date.now()}`;
}

export function getCategoryLabel(
  categoryId: string,
  categories: ProductCategory[],
  language: 'hi' | 'en' = 'hi'
): string {
  const found = categories.find((c) => c.id === categoryId);
  if (!found) return categoryId;
  return language === 'hi' ? (found.nameHi || found.nameEn) : (found.nameEn || found.nameHi);
}

export function useCategories() {
  const customCategoriesRecord = useLiveQuery(
    () => db.settings.get('custom_categories')
  );

  const customCategories: ProductCategory[] = customCategoriesRecord?.value || [];

  const categories = useMemo(() => {
    return [...DEFAULT_CATEGORIES, ...customCategories];
  }, [customCategories]);

  const addCategory = async (nameHi: string, nameEn?: string): Promise<ProductCategory> => {
    const trimmedHi = nameHi.trim();
    const trimmedEn = (nameEn || '').trim() || trimmedHi;

    if (!trimmedHi) {
      throw new Error('श्रेणी का नाम आवश्यक है');
    }

    const id = createCategorySlug(trimmedEn || trimmedHi);
    const newCategory: ProductCategory = {
      id,
      nameHi: trimmedHi,
      nameEn: trimmedEn,
      isDefault: false,
      createdAt: Date.now()
    };

    const currentRecord = await db.settings.get('custom_categories');
    const existingList: ProductCategory[] = currentRecord?.value || [];
    const updatedList = [...existingList, newCategory];

    await db.settings.put({
      key: 'custom_categories',
      value: updatedList
    });

    return newCategory;
  };

  const deleteCategory = async (categoryId: string): Promise<void> => {
    const currentRecord = await db.settings.get('custom_categories');
    const existingList: ProductCategory[] = currentRecord?.value || [];
    const updatedList = existingList.filter((c) => c.id !== categoryId);

    await db.settings.put({
      key: 'custom_categories',
      value: updatedList
    });
  };

  return {
    categories,
    customCategories,
    addCategory,
    deleteCategory,
    getLabel: (catId: string, lang: 'hi' | 'en' = 'hi') => getCategoryLabel(catId, categories, lang)
  };
}
