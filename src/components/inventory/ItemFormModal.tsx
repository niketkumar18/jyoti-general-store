import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Sparkles, Package, Save, Plus, Layers, Tag, Building2 } from 'lucide-react';
import type { InventoryItem, UnitType, CategoryType } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { db } from '../../db';
import { useCategories } from '../../utils/categories';
import { useSettings } from '../../context/SettingsContext';
import { syncItemsToGoogleSheets } from '../../utils/googleSheetsSync';
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
  const { settings } = useSettings();
  const { categories, addCategory } = useCategories();
  const vendors = useLiveQuery(() => db.vendors.toArray()) || [];

  const [nameEn, setNameEn] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [category, setCategory] = useState<CategoryType>('flour_grains');
  const [unit, setUnit] = useState<UnitType>('PACKET');
  const [preferredVendorId, setPreferredVendorId] = useState<number | ''>('');
  const [salePrice, setSalePrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [stockQty, setStockQty] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [barcode, setBarcode] = useState('');

  // Bulk / Quantity Discount Rule
  const [enableBulkRule, setEnableBulkRule] = useState(false);
  const [bulkThreshold, setBulkThreshold] = useState<number | ''>('');
  const [bulkPercentage, setBulkPercentage] = useState<number | ''>('');
  const [bulkRate, setBulkRate] = useState<number | ''>('');
  const [isComplementary, setIsComplementary] = useState(false);

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
      setPreferredVendorId(itemToEdit.preferredVendorId ?? '');
      setSalePrice(itemToEdit.salePrice);
      setCostPrice(itemToEdit.costPrice || 0);
      setStockQty(itemToEdit.stockQty);
      setLowStockThreshold(itemToEdit.lowStockThreshold);
      setBarcode(itemToEdit.barcode || '');
      setBulkThreshold(itemToEdit.bulkDiscountThreshold ?? '');
      setBulkPercentage(itemToEdit.bulkDiscountPercentage ?? '');
      setBulkRate(itemToEdit.bulkDiscountRate ?? '');
      setEnableBulkRule(Boolean(itemToEdit.bulkDiscountThreshold && (itemToEdit.bulkDiscountRate || itemToEdit.bulkDiscountPercentage)));
      setIsComplementary(Boolean(itemToEdit.isComplementary));
    } else {
      setNameEn('');
      setNameHi('');
      setCategory(categories[0]?.id || 'flour_grains');
      setUnit('PACKET');
      setPreferredVendorId('');
      setSalePrice(0);
      setCostPrice(0);
      setStockQty(10);
      setLowStockThreshold(5);
      setBarcode('');
      setBulkThreshold('');
      setBulkPercentage('');
      setBulkRate('');
      setEnableBulkRule(false);
      setIsComplementary(false);
    }
    setShowInlineAddCategory(false);
    setNewCatNameHi('');
    setNewCatNameEn('');
  }, [itemToEdit, isOpen]);

  const handleBulkRateChange = (val: number | '') => {
    setBulkRate(val);
    if (typeof val === 'number' && salePrice > 0) {
      const pct = Math.max(0, Math.min(99, Number((((salePrice - val) / salePrice) * 100).toFixed(1))));
      setBulkPercentage(pct);
    }
  };

  const handleBulkPercentageChange = (val: number | '') => {
    setBulkPercentage(val);
    if (typeof val === 'number' && salePrice > 0) {
      const rate = Number((salePrice * (1 - val / 100)).toFixed(2));
      setBulkRate(rate);
    }
  };

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

    const thresholdVal = enableBulkRule && typeof bulkThreshold === 'number' && bulkThreshold > 1 ? bulkThreshold : undefined;
    const percentageVal = enableBulkRule && typeof bulkPercentage === 'number' && bulkPercentage > 0 ? bulkPercentage : undefined;
    const bulkRateVal = enableBulkRule && typeof bulkRate === 'number' && bulkRate > 0 ? bulkRate : undefined;

    const vendorObj = typeof preferredVendorId === 'number'
      ? vendors.find((v) => v.id === preferredVendorId)
      : null;

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
      bulkDiscountThreshold: thresholdVal,
      bulkDiscountPercentage: percentageVal,
      bulkDiscountRate: bulkRateVal,
      isComplementary,
      preferredVendorId: typeof preferredVendorId === 'number' ? preferredVendorId : undefined,
      preferredVendorName: vendorObj ? (vendorObj.firmName || vendorObj.name) : undefined,
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

    if (settings.googleSheetsUrl) {
      syncItemsToGoogleSheets(settings.googleSheetsUrl, settings.googleSheetDocumentUrl)
        .catch(e => console.error('Failed to sync item to Google Sheets:', e));
    }

    if (onSaved) onSaved(savedItem);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[94dvh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
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
          <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
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
                    step="any"
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
                    step="any"
                    value={costPrice || ''}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">थोक खरीद मूल्य (मुनाफे हेतु)</p>
              </div>
            </div>

            {/* Preferred Supplier / Vendor */}
            <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-200/70">
              <label className="block text-xs font-bold text-indigo-950 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>सप्लायर / महाजन (Preferred Vendor) (वैकल्पिक)</span>
              </label>
              <select
                value={preferredVendorId}
                onChange={(e) => setPreferredVendorId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">-- सप्लायर चुनें (वैकल्पिक) --</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.firmName ? `${v.firmName} (${v.name})` : v.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-indigo-700 mt-0.5">
                यह सामान किस सप्लायर से आता है, ताकि नया स्टॉक जोड़ते समय सप्लायर खाता और रेट सिंक रहे।
              </p>
            </div>

            {/* Bulk / Quantity Discount Rule */}
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-700" />
                  <span className="text-xs sm:text-sm font-black text-amber-950">
                    📦 थोक / मात्रा छूट नियम (Quantity Discount Rule)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableBulkRule}
                    onChange={(e) => setEnableBulkRule(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <p className="text-[11px] text-amber-800">
                यदि ग्राहक तय मात्रा या उससे अधिक खरीदे, तो सामान्य रेट के बजाय नया स्पेशल थोक रेट लागू हो जाएगा। (उदा. 1 पीस पर ₹5, लेकिन 30 पीस पर नया रेट ₹4.5/पीस)
              </p>

              {enableBulkRule && (
                <div className="space-y-3 pt-1 border-t border-amber-200/60 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Threshold Qty */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        न्यूनतम मात्रा सीमा (Threshold Qty) *
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={bulkThreshold}
                        onChange={(e) =>
                          setBulkThreshold(
                            e.target.value === '' ? '' : Math.max(2, parseFloat(e.target.value) || 2)
                          )
                        }
                        placeholder="उदा. 30"
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-[10px] text-amber-700 mt-0.5 block">
                        उदा. 30 (30 या अधिक लेने पर)
                      </span>
                    </div>

                    {/* Special Bulk Rate (₹) */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        नया थोक रेट (Special Rate ₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={bulkRate}
                          onChange={(e) =>
                            handleBulkRateChange(
                              e.target.value === '' ? '' : parseFloat(e.target.value) || ''
                            )
                          }
                          placeholder={salePrice > 0 ? `उदा. ${(salePrice * 0.9).toFixed(1)}` : 'उदा. 4.5'}
                          className="w-full pl-6 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <span className="text-[10px] text-amber-700 mt-0.5 block">
                        प्रति {unit} नया स्पेशल रेट
                      </span>
                    </div>

                    {/* Discount Percentage */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-950 mb-1">
                        छूट प्रतिशत (Discount %)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="99"
                          step="any"
                          value={bulkPercentage}
                          onChange={(e) =>
                            handleBulkPercentageChange(
                              e.target.value === ''
                                ? ''
                                : Math.min(99, Math.max(1, parseFloat(e.target.value) || 0))
                            )
                          }
                          placeholder="उदा. 10"
                          className="w-full pr-8 pl-3 py-2 bg-white border border-amber-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="absolute right-3 top-2 text-slate-500 text-sm font-bold">%</span>
                      </div>
                      <span className="text-[10px] text-amber-700 mt-0.5 block">
                        स्वतः गणना या मैन्युअल
                      </span>
                    </div>
                  </div>

                  {/* Preset Quick Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-amber-900 py-0.5">त्वरित विकल्प:</span>
                    {[
                      { qty: 5, pct: 10, label: '5+ पर 10% छूट' },
                      { qty: 10, pct: 15, label: '10+ पर 15% छूट' },
                      { qty: 20, pct: 10, label: '20+ पर 10% छूट' },
                      { qty: 30, pct: 10, label: '30+ पर 10% छूट' },
                      { qty: 50, pct: 20, label: '50+ पर 20% छूट' }
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setBulkThreshold(p.qty);
                          handleBulkPercentageChange(p.pct);
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md border border-amber-300 transition-colors cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Example Preview */}
                  {salePrice > 0 && Number(bulkThreshold) > 1 && (Number(bulkRate) > 0 || Number(bulkPercentage) > 0) && (
                    <div className="bg-white rounded-xl p-2.5 border border-amber-300/80 text-xs text-amber-950 font-medium space-y-1">
                      <div className="font-bold text-amber-900 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>लाइव नियम प्रीव्यू (Live Rule Preview):</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        • 1 से {Number(bulkThreshold) - 1} {unit} तक: <strong>₹{salePrice}</strong> प्रति {unit} (सामान्य दर)
                        <br />
                        • <strong>{bulkThreshold} या अधिक {unit}</strong> पर: <strong>₹{typeof bulkRate === 'number' && bulkRate > 0 ? bulkRate : (salePrice * (1 - Number(bulkPercentage) / 100)).toFixed(2)}</strong> प्रति {unit} (बचत: ₹{(salePrice - (typeof bulkRate === 'number' && bulkRate > 0 ? bulkRate : salePrice * (1 - Number(bulkPercentage) / 100))).toFixed(2)}/{unit}, {bulkPercentage ? `${bulkPercentage}% छूट` : ''})
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Complementary / Free Gift Tag (Optional) */}
            <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎁</span>
                  <div>
                    <span className="text-xs sm:text-sm font-black text-purple-950 block">
                      कॉम्प्लिमेंट्री उत्पाद टैग (Complementary / Free Gift Item)
                    </span>
                    <span className="text-[10px] text-purple-700 font-semibold">वैकल्पिक (Optional)</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isComplementary}
                    onChange={(e) => setIsComplementary(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <p className="text-[11px] text-purple-900 leading-snug font-medium">
                इस उत्पाद को कॉम्प्लिमेंट्री मार्क करने पर यह अंतिम बिलिंग के समय मुफ्त उपहार सूची में दिखाई देगा। बिल में इसका मूल्य ₹0 रहेगा, लेकिन स्टॉक से इसकी मात्रा घटेगी और रिपोर्ट में इसका हिसाब अलग से दिखेगा।
              </p>
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
                  step="any"
                  value={stockQty}
                  onChange={(e) => setStockQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('low_stock_limit')}
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseFloat(e.target.value) || 5)}
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
          </div>

          {/* Action Buttons (Sticky at bottom, always visible on mobile) */}
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0 sticky bottom-0 z-10">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              {language === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
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
