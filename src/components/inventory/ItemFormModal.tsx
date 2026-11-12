import React, { useState, useEffect } from 'react';
import { X, Sparkles, Package, Save } from 'lucide-react';
import type { InventoryItem, UnitType, CategoryType } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { db } from '../../db';

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

  const [nameEn, setNameEn] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [category, setCategory] = useState<CategoryType>('flour_grains');
  const [unit, setUnit] = useState<UnitType>('PACKET');
  const [salePrice, setSalePrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [stockQty, setStockQty] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [barcode, setBarcode] = useState('');

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
      setCategory('flour_grains');
      setUnit('PACKET');
      setSalePrice(0);
      setCostPrice(0);
      setStockQty(10);
      setLowStockThreshold(5);
      setBarcode('');
    }
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

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
                  ? language === 'hi' ? 'सामान विवरण सुधारें' : 'Edit Product'
                  : t('add_10sec_item')}
              </h3>
              <p className="text-emerald-200 text-xs">
                {language === 'hi' ? 'न्यूनतम जानकारी के साथ तुरंत नया आइटम जोड़ें' : 'Create or edit item in 10 seconds'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Dual Language Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('product_name_hi')} *
              </label>
              <input
                type="text"
                required
                placeholder="उदा. अरहर दाल / फॉर्च्यून तेल"
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

          {/* Category & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('category')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryType)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="dal_pulses">दाल व दलहन (Dal)</option>
                <option value="flour_grains">आटा, चावल व अनाज (Grains)</option>
                <option value="oil_ghee">तेल व घी (Oil & Ghee)</option>
                <option value="spices_masala">मसाले व नमक (Spices)</option>
                <option value="soap_detergent">साबुन व सर्फ (Soaps)</option>
                <option value="snacks_biscuit">नाश्ता व बिस्कुट (Snacks)</option>
                <option value="beverages">चाय, कॉफी व पेय (Beverages)</option>
                <option value="dairy">दूध व डेयरी (Dairy)</option>
                <option value="personal_care">पर्सनल केयर</option>
                <option value="other">अन्य</option>
              </select>
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

          {/* Pricing: Sale Price & Cost Price */}
          <div className="grid grid-cols-2 gap-3 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
            <div>
              <label className="block text-xs font-bold text-emerald-900 mb-1">
                {t('sale_price')} *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.5"
                  value={salePrice || ''}
                  onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-base font-extrabold text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('cost_price')} (मुनाफे हेतु)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={costPrice || ''}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Stock & Threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('stock_qty')}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={stockQty}
                onChange={(e) => setStockQty(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('low_stock_limit')}
              </label>
              <input
                type="number"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Barcode (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              बारकोड (वैकल्पिक / Optional)
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="उदा. 890123456789"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
            >
              {language === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{t('save_item')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
