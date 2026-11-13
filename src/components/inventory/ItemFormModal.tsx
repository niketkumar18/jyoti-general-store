import React, { useState, useEffect } from 'react';
import { X, Sparkles, Package, Save, Plus, Layers } from 'lucide-react';
import type { InventoryItem, UnitType, CategoryType } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { db } from '../../db';
import { useCategories } from '../../utils/categories';
import { CategoryManageModal } from './CategoryManageModal';

interface ItemFormModalProps {
  isOpen: boolean;
  itemToEdit?: InventoryItem | null;
  onClose: () => void;
  onSaved?: (item: InventoryItem) => void;
}

export const ItemFormModal: React.FC<ItemFormModalProps> = ({
  isOpen,
  itemToEdit,
  onClose,
  onSaved
}) => {
  const { language, t } = useLanguage();
  const { categories, addCategory } = useCategories();

  const [nameEn, setNameEn] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [category, setCategory] = useState<CategoryType>('flour_grains');
  const [unit, setUnit] = useState<UnitType>('PACKET');
  const [salePrice, setSalePrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [stockQty, setStockQty] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [barcode, setBarcode] = useState('');

  // Category management modals & inline quick add
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);
  const [newCatNameHi, setNewCatNameHi] = useState('');
  const [newCatNameEn, setNewCatNameEn] = useState('');

  useEffect(() => {
    if (itemToEdit) {
      setNameEn(itemToEdit.nameEn);
      setNameHi(itemToEdit.nameHi);
      setCategory(itemToEdit.category);
      setUnit(itemToEdit.unit);
      setSalePrice(itemToEdit.salePrice);
      setCostPrice(itemToEdit.costPrice || 0);
      setStockQty(itemToEdit.stockQty);
      setLowStockThreshold(itemToEdit.lowStockThreshold);
      setBarcode(itemToEdit.barcode || '');
    } else {
      setNameEn('');
      setNameHi('');
      setCategory(categories[0]?.id || 'flour_grains');
      setUnit('PACKET');
      setSalePrice(0);
      setCostPrice(0);
      setStockQty(10);
      setLowStockThreshold(5);
      setBarcode('');
    }
    setShowInlineAddCategory(false);
    setNewCatNameHi('');
    setNewCatNameEn('');
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleQuickAddCategory = async () => {
    if (!newCatNameHi.trim()) {
      alert('कृपया श्रेणी का नाम दर्ज करें');
      return;
    }
    try {
      const created = await addCategory(
        newCatNameHi.trim(),
        newCatNameEn.trim() || newCatNameHi.trim()
      );
      setCategory(created.id);
      setNewCatNameHi('');
      setNewCatNameEn('');
      setShowInlineAddCategory(false);
    } catch (err: any) {
      alert(err?.message || 'श्रेणी जोड़ने में विफल');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameHi && !nameEn) {
      alert('कृपया सामान का नाम दर्ज करें');
      return;
    }

    const payload: Omit<InventoryItem, 'id'> = {
      nameEn: nameEn.trim() || nameHi.trim(),
      nameHi: nameHi.trim() || nameEn.trim(),
      category,
      unit,
      salePrice: Number(salePrice) || 0,
      costPrice: Number(costPrice) || 0,
      stockQty: Number(stockQty) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      barcode: barcode.trim() || undefined,
      createdAt: itemToEdit?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    let savedItem: InventoryItem;
    if (itemToEdit?.id) {
      await db.items.update(itemToEdit.id, payload);
      savedItem = { ...payload, id: itemToEdit.id };
    } else {
      const newId = await db.items.add(payload as any);
      savedItem = { ...payload, id: newId as number };
    }

    if (onSaved) onSaved(savedItem);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-700/80 rounded-xl">
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="font-extrabold text-base sm:text-lg">
                  {itemToEdit
                    ? (language === 'hi' ? 'सामान विवरण संशोधित करें' : 'Edit Inventory Item')
                    : (language === 'hi' ? '10-सेकंड में नया सामान जोड़ें' : 'Fast 10-Second Item Add')}
                </h3>
                <p className="text-emerald-200 text-xs">
                  {itemToEdit
                    ? 'दर, स्टॉक या बारकोड बदलें'
                    : 'न्यूनतम जानकारी के साथ तुरंत कैटलॉग में जोड़ें'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            {/* Bilingual Name Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('product_name_hi')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="उदा. अरहर दाल / फार्च्यून रिफाइंड तेल"
                  value={nameHi}
                  onChange={(e) => setNameHi(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('product_name_en')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Toor Dal / Fortune Oil"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Category & Unit with Add Category option */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {t('category')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowInlineAddCategory(!showInlineAddCategory)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ नई</span>
                  </button>
                </div>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nameHi} ({cat.nameEn})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowManageCategories(true)}
                  className="mt-1 text-[10px] text-slate-500 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <Layers className="w-3 h-3" />
                  <span>श्रेणियां प्रबंधित करें...</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('unit')}
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="PACKET">पैकेट (Packet)</option>
                  <option value="KG">किलोग्राम (KG)</option>
                  <option value="GM">ग्राम (GM)</option>
                  <option value="LITRE">लीटर (Litre)</option>
                  <option value="ML">मिली (ML)</option>
                  <option value="PIECE">पीस (Piece)</option>
                  <option value="DOZEN">दर्जन (Dozen)</option>
                </select>
              </div>
            </div>

            {/* Inline Quick Add Category Box */}
            {showInlineAddCategory && (
              <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-2xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-black text-emerald-900">
                  <span className="flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>+ नई श्रेणी जोड़ें (Add Category):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInlineAddCategory(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="श्रेणी नाम (उदा. पूजा सामग्री)"
                    value={newCatNameHi}
                    onChange={(e) => setNewCatNameHi(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <input
                    type="text"
                    placeholder="English Name (Optional)"
                    value={newCatNameEn}
                    onChange={(e) => setNewCatNameEn(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleQuickAddCategory}
                    className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>श्रेणी सुरक्षित करें</span>
                  </button>
                </div>
              </div>
            )}

            {/* Pricing: Sale Price & Cost Price */}
            <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
              <div>
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  {t('sale_price')} *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={salePrice || ''}
                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-emerald-700 mt-0.5">दुकान बिक्री मूल्य</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('cost_price')} (वैकल्पिक)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 text-sm font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice || ''}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">थोक खरीद मूल्य (मुनाफे हेतु)</p>
              </div>
            </div>

            {/* Stock Quantity & Low Stock Threshold */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('stock_qty')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockQty}
                  onChange={(e) => setStockQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('low_stock_limit')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Barcode (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                बारकोड (वैकल्पिक)
              </label>
              <input
                type="text"
                placeholder="उदा. 89010300021"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                बारकोड स्कैनर से स्कैन करने पर यह सामान तुरंत बिल में जुड़ जाएगा।
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                {language === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{t('save_item')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Manager Modal */}
      <CategoryManageModal
        isOpen={showManageCategories}
        onClose={() => setShowManageCategories(false)}
        onCategorySelected={(newId) => {
          setCategory(newId);
          setShowManageCategories(false);
        }}
      />
    </>
  );
};
