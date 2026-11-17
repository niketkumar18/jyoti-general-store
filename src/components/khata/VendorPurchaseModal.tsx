import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { 
  X, 
  PackagePlus, 
  CheckCircle, 
  Banknote, 
  QrCode, 
  Building2, 
  Plus, 
  ArrowRight,
  Sparkles,
  Calculator
} from 'lucide-react';
import { db } from '../../db';
import type { Vendor, InventoryItem, UnitType } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatUnit } from '../../utils/formatters';
import { playSuccessChime } from '../../utils/audio';

interface VendorPurchaseModalProps {
  isOpen: boolean;
  initialVendorId?: number | null;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export const VendorPurchaseModal: React.FC<VendorPurchaseModalProps> = ({
  isOpen,
  initialVendorId,
  onClose,
  onPurchaseComplete
}) => {
  const { language } = useLanguage();
  const { settings } = useSettings();

  const vendors = useLiveQuery(() => db.vendors.toArray()) || [];
  const items = useLiveQuery(() => db.items.toArray()) || [];

  // Form State
  const [selectedVendorId, setSelectedVendorId] = useState<number | ''>('');
  const [selectedItemId, setSelectedItemId] = useState<number | 'NEW'>('');
  
  // Custom new product if not in list
  const [customItemName, setCustomItemName] = useState('');
  const [customCategory, setCustomCategory] = useState('other');
  const [customSalePrice, setCustomSalePrice] = useState<number | ''>('');

  // Purchase Details
  const [quantity, setQuantity] = useState<number | ''>(10);
  const [unit, setUnit] = useState<UnitType>('KG');
  const [totalCost, setTotalCost] = useState<number | ''>(500);
  const [paidAmount, setPaidAmount] = useState<number | ''>(200);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Add Vendor inline state
  const [showQuickAddVendor, setShowQuickAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorFirm, setNewVendorFirm] = useState('');
  const [newVendorMobile, setNewVendorMobile] = useState('');

  useEffect(() => {
    if (initialVendorId) {
      setSelectedVendorId(initialVendorId);
    } else if (vendors.length > 0 && selectedVendorId === '') {
      setSelectedVendorId(vendors[0].id || '');
    }
  }, [initialVendorId, vendors]);

  // When an existing item is selected, update unit automatically
  useEffect(() => {
    if (typeof selectedItemId === 'number') {
      const matched = items.find((i) => i.id === selectedItemId);
      if (matched) {
        setUnit(matched.unit);
      }
    }
  }, [selectedItemId, items]);

  if (!isOpen) return null;

  const currentItem = typeof selectedItemId === 'number' 
    ? items.find((i) => i.id === selectedItemId) 
    : null;

  const currentVendor = typeof selectedVendorId === 'number'
    ? vendors.find((v) => v.id === selectedVendorId)
    : null;

  const numQty = typeof quantity === 'number' && quantity > 0 ? quantity : 0;
  const numTotalCost = typeof totalCost === 'number' && totalCost >= 0 ? totalCost : 0;
  const numPaid = typeof paidAmount === 'number' && paidAmount >= 0 ? paidAmount : 0;
  const calculatedDue = Math.max(0, numTotalCost - numPaid);
  const calculatedUnitCost = numQty > 0 ? Number((numTotalCost / numQty).toFixed(2)) : 0;

  // Quick Add Vendor inline
  const handleQuickAddVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;

    const newV: Omit<Vendor, 'id'> = {
      name: newVendorName.trim(),
      firmName: newVendorFirm.trim() || undefined,
      mobile: newVendorMobile.trim() || '0000000000',
      currentBalance: 0,
      totalPurchased: 0,
      totalPaid: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const newId = await db.vendors.add(newV as any);
    setSelectedVendorId(newId as number);
    setShowQuickAddVendor(false);
    setNewVendorName('');
    setNewVendorFirm('');
    setNewVendorMobile('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId || typeof selectedVendorId !== 'number') {
      alert('कृपया सप्लायर (Vendor) चुनें या नया जोड़ें');
      return;
    }
    if (numQty <= 0) {
      alert('कृपया वैध मात्रा (Quantity) दर्ज करें');
      return;
    }
    if (numTotalCost <= 0) {
      alert('कृपया कुल खरीद राशि दर्ज करें');
      return;
    }

    const vendor = await db.vendors.get(selectedVendorId);
    if (!vendor) {
      alert('सप्लायर नहीं मिला');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalItemId: number | undefined;
      let finalItemName = '';

      // 1. Resolve or Create Inventory Item
      if (selectedItemId === 'NEW') {
        if (!customItemName.trim()) {
          alert('कृपया नए सामान का नाम दर्ज करें');
          setIsSubmitting(false);
          return;
        }
        const createdItemId = await db.items.add({
          nameHi: customItemName.trim(),
          nameEn: customItemName.trim(),
          category: customCategory,
          unit: unit,
          salePrice: Number(customSalePrice) || Math.round(calculatedUnitCost * 1.25),
          costPrice: calculatedUnitCost,
          stockQty: numQty,
          lowStockThreshold: 5,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        finalItemId = createdItemId as number;
        finalItemName = customItemName.trim();
      } else if (currentItem && currentItem.id) {
        finalItemId = currentItem.id;
        finalItemName = currentItem.nameHi || currentItem.nameEn;
        
        // Auto-increment existing item stock!
        const newStock = Number((currentItem.stockQty + numQty).toFixed(2));
        await db.items.update(currentItem.id, {
          stockQty: newStock,
          costPrice: calculatedUnitCost > 0 ? calculatedUnitCost : currentItem.costPrice,
          updatedAt: Date.now()
        });
      }

      // 2. Update Vendor Balance and Totals
      const prevBal = vendor.currentBalance || 0;
      const newBal = prevBal + calculatedDue; // Increase payable debt
      const newPurchased = (vendor.totalPurchased || 0) + numTotalCost;
      const newPaidTotal = (vendor.totalPaid || 0) + numPaid;

      await db.vendors.update(vendor.id!, {
        currentBalance: newBal,
        totalPurchased: newPurchased,
        totalPaid: newPaidTotal,
        updatedAt: Date.now()
      });

      // 3. Create Vendor Ledger Entry
      await db.vendorLedger.add({
        vendorId: vendor.id!,
        vendorName: vendor.name,
        type: 'PURCHASE',
        amount: numTotalCost,
        paidAmount: numPaid,
        dueAmount: calculatedDue,
        paymentMode: paymentMode,
        itemId: finalItemId,
        itemName: finalItemName,
        itemQuantity: numQty,
        itemUnit: unit,
        unitCostPrice: calculatedUnitCost,
        billNumber: billNumber.trim() || undefined,
        description: `माल खरीद: ${finalItemName} (${numQty} ${unit} @ ₹${calculatedUnitCost}/${unit}) — नकद: ₹${numPaid}, उधार: ₹${calculatedDue}`,
        runningBalance: newBal,
        createdAt: Date.now()
      });

      if (settings.enableSound) {
        playSuccessChime();
      }
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch (err) {}

      if (onPurchaseComplete) onPurchaseComplete();
      onClose();
    } catch (err: any) {
      console.error('Failed to record stock purchase:', err);
      alert('माल खरीद दर्ज करने में त्रुटि: ' + (err?.message || 'अज्ञात समस्या'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/80 rounded-xl">
              <PackagePlus className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">
                📦 नया माल खरीद दर्ज करें (Stock Purchase)
              </h3>
              <p className="text-emerald-200 text-xs">
                सप्लायर से आया माल स्टॉक में जोड़ें और उधारी/नकद हिसाब अपडेट करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
            {/* 1. Vendor Selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>सप्लायर / महाजन का नाम (Vendor) *</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickAddVendor(!showQuickAddVendor)}
                  className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ नया सप्लायर</span>
                </button>
              </div>

              {!showQuickAddVendor ? (
                <div>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(Number(e.target.value) || '')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    required
                  >
                    <option value="">-- सप्लायर चुनें --</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.firmName ? `(${v.firmName})` : ''} — बकाया: ₹{v.currentBalance}
                      </option>
                    ))}
                  </select>

                  {currentVendor && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1">
                      <span>📞 {currentVendor.mobile}</span>
                      <span>
                        वर्तमान बकाया देना: <strong className="text-amber-700">{formatCurrency(currentVendor.currentBalance)}</strong>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-emerald-300 rounded-xl p-2.5 space-y-2 animate-in fade-in">
                  <div className="text-xs font-bold text-emerald-900">
                    नया सप्लायर विवरण जोड़ें:
                  </div>
                  <input
                    type="text"
                    placeholder="सप्लायर का नाम * (उदा. श्री राम ट्रेडर्स)"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="फर्म / दुकान का नाम"
                      value={newVendorFirm}
                      onChange={(e) => setNewVendorFirm(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                    <input
                      type="tel"
                      placeholder="10 अंकों का फोन नंबर"
                      value={newVendorMobile}
                      onChange={(e) => setNewVendorMobile(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowQuickAddVendor(false)}
                      className="px-2.5 py-1 border border-slate-300 text-slate-600 rounded text-xs"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickAddVendorSubmit}
                      className="px-3 py-1 bg-emerald-700 text-white font-bold rounded text-xs shadow-xs"
                    >
                      सुरक्षित करें
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Product to Stock */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                दुकान का सामान (Product / Item) *
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedItemId(val === 'NEW' ? 'NEW' : Number(val));
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                required
              >
                <option value="">-- सामान चुनें --</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.nameHi || it.nameEn} (मौजूदा स्टॉक: {it.stockQty} {it.unit})
                  </option>
                ))}
                <option value="NEW">+ नया सामान (जो दुकान में पहले से नहीं है)</option>
              </select>

              {/* If New Item selected */}
              {selectedItemId === 'NEW' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 mt-2">
                  <div className="text-xs font-bold text-amber-900">
                    नए सामान का विवरण:
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="उदा. चीनी (Sugar) / फार्च्यून तेल"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                    >
                      <option value="flour_grains">आटा, चावल व अनाज</option>
                      <option value="dal_pulses">दाल व दलहन</option>
                      <option value="oil_ghee">तेल व घी</option>
                      <option value="spices_masala">मसाले</option>
                      <option value="snacks_biscuit">नाश्ता व बिस्कुट</option>
                      <option value="other">अन्य</option>
                    </select>

                    <input
                      type="number"
                      placeholder="अनुमानित बिक्री दर (₹)"
                      value={customSalePrice}
                      onChange={(e) => setCustomSalePrice(e.target.value ? Number(e.target.value) : '')}
                      className="px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Quantity & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  खरीदी गई मात्रा (Quantity) *
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="उदा. 10"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  इकाई (Unit)
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as UnitType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 cursor-pointer focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="KG">किलोग्राम (KG)</option>
                  <option value="PACKET">पैकेट (PACKET)</option>
                  <option value="PIECE">पीस (PIECE)</option>
                  <option value="LITRE">लीटर (LITRE)</option>
                  <option value="GM">ग्राम (GM)</option>
                  <option value="ML">मिलीलीटर (ML)</option>
                  <option value="DOZEN">दर्जन (DOZEN)</option>
                </select>
              </div>
            </div>

            {/* Stock Increase Preview */}
            {currentItem && numQty > 0 && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 flex items-center justify-between">
                <span>📦 स्टॉक में वृद्धि:</span>
                <span className="font-bold">
                  {currentItem.stockQty} {unit} + {numQty} {unit} = <strong className="text-emerald-700 font-black text-sm">{Number((currentItem.stockQty + numQty).toFixed(2))} {unit}</strong>
                </span>
              </div>
            )}

            {/* 4. Total Cost & Paid Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  कुल खरीद बिल राशि (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="उदा. 500"
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {calculatedUnitCost > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    खरीद दर: <strong>{formatCurrency(calculatedUnitCost)} / {unit}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  आज दिया गया नकद/भुगतान (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="उदा. 200"
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-base font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => setPaidAmount(numTotalCost)}
                    className="text-[10px] text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-1.5 py-0.5 rounded font-bold"
                  >
                    पूरा नकद
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(0)}
                    className="text-[10px] text-rose-800 bg-rose-100 hover:bg-rose-200 px-1.5 py-0.5 rounded font-bold"
                  >
                    पूरा उधार (₹0)
                  </button>
                </div>
              </div>
            </div>

            {/* Calculated Remaining Due Owed to Vendor */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs sm:text-sm font-bold transition-all ${
              calculatedDue > 0
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}>
              <div className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-slate-600" />
                <span>
                  {calculatedDue > 0 
                    ? 'सप्लायर को बकाया देना बाकी (Udhar Due):' 
                    : 'पूरा भुगतान हो गया (Full Paid):'}
                </span>
              </div>
              <span className={`text-base font-black ${calculatedDue > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                {formatCurrency(calculatedDue)}
              </span>
            </div>

            {/* 5. Payment Mode & Bill No */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  भुगतान का माध्यम
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      paymentMode === 'CASH'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    नकद
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('UPI')}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      paymentMode === 'UPI'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('BANK')}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      paymentMode === 'BANK'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    बैंक
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  चालान / बिल सं. (वैकल्पिक)
                </label>
                <input
                  type="text"
                  placeholder="उदा. INV-904"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                टिप्पणी (Optional Note)
              </label>
              <input
                type="text"
                placeholder="उदा. चीनी की 1 बोरी आई, 2 दिन बाद बाकी देंगे"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Action Buttons (Sticky Footer) */}
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0 sticky bottom-0 z-10">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              रद्द करें
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'स्टॉक अपडेट हो रहा है...'
                  : 'स्टॉक में जोड़ें व खाता अपडेट करें'}
              </span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
