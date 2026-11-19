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
  Calculator,
  Camera,
  Upload,
  ImageIcon,
  Trash2,
  Eye
} from 'lucide-react';
import { db } from '../../db';
import type { Vendor, InventoryItem, UnitType } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatUnit } from '../../utils/formatters';
import { playSuccessChime } from '../../utils/audio';
import { syncTwoWay } from '../../utils/googleSheetsSync';

interface VendorPurchaseModalProps {
  isOpen: boolean;
  initialVendorId?: number | null;
  initialItemId?: number | null;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export const VendorPurchaseModal: React.FC<VendorPurchaseModalProps> = ({
  isOpen,
  initialVendorId,
  initialItemId,
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
  const [ratePerUnit, setRatePerUnit] = useState<number | ''>(50);
  const [totalCost, setTotalCost] = useState<number | ''>(500);
  const [newSellingPrice, setNewSellingPrice] = useState<number | ''>('');
  const [updateMainGridPrices, setUpdateMainGridPrices] = useState<boolean>(true);
  const [paidAmount, setPaidAmount] = useState<number | ''>(200);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [billNumber, setBillNumber] = useState('');
  const [billImage, setBillImage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('फोटो का साइज 8MB से कम होना चाहिए');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setBillImage(result);
    };
    reader.readAsDataURL(file);
  };

  // Quick Add Vendor inline state
  const [showQuickAddVendor, setShowQuickAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorFirm, setNewVendorFirm] = useState('');
  const [newVendorMobile, setNewVendorMobile] = useState('');

  // Synchronize initialVendorId and fallback to first vendor or item vendor
  useEffect(() => {
    if (initialVendorId) {
      setSelectedVendorId(initialVendorId);
    } else if (vendors.length > 0 && selectedVendorId === '') {
      setSelectedVendorId(vendors[0].id || '');
    }
  }, [initialVendorId, vendors]);

  // Synchronize initialItemId when opened from stock page
  useEffect(() => {
    if (initialItemId) {
      setSelectedItemId(initialItemId);
    }
  }, [initialItemId, isOpen]);

  // When an existing item is selected, update unit, rate, selling price and vendor automatically
  useEffect(() => {
    if (typeof selectedItemId === 'number') {
      const matched = items.find((i) => i.id === selectedItemId);
      if (matched) {
        setUnit(matched.unit);
        if (typeof matched.costPrice === 'number' && matched.costPrice > 0) {
          setRatePerUnit(matched.costPrice);
          if (typeof quantity === 'number' && quantity > 0) {
            setTotalCost(Number((quantity * matched.costPrice).toFixed(2)));
          }
        }
        if (typeof matched.salePrice === 'number') {
          setNewSellingPrice(matched.salePrice);
        }
        // Auto-select preferred supplier if present and no vendor was explicitly chosen
        if (matched.preferredVendorId && !initialVendorId) {
          setSelectedVendorId(matched.preferredVendorId);
        }
      }
    }
  }, [selectedItemId, items, initialVendorId]);

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

  const handleQuantityChange = (val: number | '') => {
    setQuantity(val);
    if (typeof val === 'number' && typeof ratePerUnit === 'number' && ratePerUnit > 0) {
      setTotalCost(Number((val * ratePerUnit).toFixed(2)));
    }
  };

  const handleRateChange = (val: number | '') => {
    setRatePerUnit(val);
    if (typeof val === 'number' && typeof quantity === 'number' && quantity > 0) {
      setTotalCost(Number((quantity * val).toFixed(2)));
    }
  };

  const handleTotalCostChange = (val: number | '') => {
    setTotalCost(val);
    if (typeof val === 'number' && typeof quantity === 'number' && quantity > 0) {
      setRatePerUnit(Number((val / quantity).toFixed(2)));
    }
  };

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
    if (!selectedItemId) {
      alert('कृपया वह सामान चुनें जिसका नया स्टॉक आया है, या "+ नया सामान" चुनें');
      return;
    }
    if (numQty <= 0) {
      alert('कृपया वैध मात्रा (Quantity) दर्ज करें');
      return;
    }
    if (typeof ratePerUnit !== 'number' || ratePerUnit <= 0) {
      alert('कृपया वैध खरीद दर (Rate per unit) दर्ज करें');
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
        const effectiveCost = typeof ratePerUnit === 'number' && ratePerUnit > 0 ? ratePerUnit : calculatedUnitCost;
        const createdItemId = await db.items.add({
          nameHi: customItemName.trim(),
          nameEn: customItemName.trim(),
          category: customCategory,
          unit: unit,
          salePrice: Number(customSalePrice) || Math.round(effectiveCost * 1.25),
          costPrice: effectiveCost,
          stockQty: numQty,
          lowStockThreshold: 5,
          preferredVendorId: vendor.id,
          preferredVendorName: vendor.firmName || vendor.name,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        finalItemId = createdItemId as number;
        finalItemName = customItemName.trim();
      } else if (currentItem && currentItem.id) {
        finalItemId = currentItem.id;
        finalItemName = currentItem.nameHi || currentItem.nameEn;
        
        // Auto-increment existing item stock & update catalog prices
        const newStock = Number((currentItem.stockQty + numQty).toFixed(2));
        const effectiveCost = typeof ratePerUnit === 'number' && ratePerUnit > 0 ? ratePerUnit : (calculatedUnitCost > 0 ? calculatedUnitCost : currentItem.costPrice);
        const effectiveSale = (updateMainGridPrices && typeof newSellingPrice === 'number' && newSellingPrice > 0)
          ? newSellingPrice
          : currentItem.salePrice;

        await db.items.update(currentItem.id, {
          stockQty: newStock,
          costPrice: effectiveCost,
          salePrice: effectiveSale,
          preferredVendorId: vendor.id,
          preferredVendorName: vendor.firmName || vendor.name,
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
      const effectiveEntryCost = typeof ratePerUnit === 'number' && ratePerUnit > 0 ? ratePerUnit : calculatedUnitCost;
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
        unitCostPrice: effectiveEntryCost,
        billNumber: billNumber.trim() || undefined,
        billImageUrl: billImage || undefined,
        description: `माल खरीद: ${finalItemName} (${numQty} ${unit} @ ₹${effectiveEntryCost}/${unit}) — नकद: ₹${numPaid}, उधार: ₹${calculatedDue}`,
        runningBalance: newBal,
        syncedToGoogle: false,
        createdAt: Date.now()
      });

      // 4. Auto-sync to Google Sheets in background
      if (settings.googleSheetsUrl) {
        syncTwoWay(settings.googleSheetsUrl, settings.googleSheetDocumentUrl)
          .catch((e) => console.error('Vendor purchase sync error:', e));
      }

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
                      step="any"
                      min="0"
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
                  step="any"
                  min="0.001"
                  required
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value ? parseFloat(e.target.value) : '')}
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

            {/* 4. Rate per Unit & Total Purchase Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-2xl">
              {/* Rate per Unit (Rate per kg/pc) */}
              <div>
                <label className="block text-xs font-black text-indigo-950 mb-1">
                  खरीद दर प्रति {unit} (Rate per {unit}) (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-indigo-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={ratePerUnit}
                    onChange={(e) => handleRateChange(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="उदा. 120"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-indigo-300 rounded-xl text-base font-black text-indigo-950 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
                {currentItem && (
                  <p className="text-[10px] text-indigo-700 font-semibold mt-1">
                    पिछली खरीद दर: <strong>₹{currentItem.costPrice || 0} / {unit}</strong>
                  </p>
                )}
              </div>

              {/* Total Purchase Bill Amount (Auto-Calculated) */}
              <div>
                <label className="block text-xs font-black text-indigo-950 mb-1">
                  कुल खरीद बिल राशि (Total Cost) (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={totalCost}
                    onChange={(e) => handleTotalCostChange(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="उदा. 1200"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  मात्रा × दर = {numQty} × ₹{typeof ratePerUnit === 'number' ? ratePerUnit : 0} = ₹{numTotalCost}
                </p>
              </div>
            </div>

            {/* 5. Update Main POS Grid Rates (Catalog Selling Price) */}
            {currentItem && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-extrabold text-amber-950 block">
                      दुकान में बिक्री रेट (Customer Sale Price in Grid):
                    </span>
                    <span className="text-[10px] text-amber-800">
                      वर्तमान बिक्री रेट: <strong>₹{currentItem.salePrice} / {unit}</strong>
                    </span>
                  </div>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1.5 text-xs font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={newSellingPrice}
                      onChange={(e) => setNewSellingPrice(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder={String(currentItem.salePrice)}
                      className="w-full pl-6 pr-2 py-1.5 bg-white border border-amber-300 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-amber-900 bg-white/80 p-2 rounded-xl border border-amber-200">
                  <input
                    type="checkbox"
                    checked={updateMainGridPrices}
                    onChange={(e) => setUpdateMainGridPrices(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                  />
                  <span>☑️ मुख्य ग्रिड (कैटलॉग) में नई खरीद दर (₹{typeof ratePerUnit === 'number' ? ratePerUnit : 0}) और बिक्री रेट तुरंत अपडेट करें</span>
                </label>
              </div>
            )}

            {/* 6. Paid Amount */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  आज सप्लायर को दिया गया नकद/भुगतान (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
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
                    className="text-[10px] text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded font-bold cursor-pointer"
                  >
                    पूरा नकद (₹{numTotalCost})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(0)}
                    className="text-[10px] text-rose-800 bg-rose-100 hover:bg-rose-200 px-2 py-0.5 rounded font-bold cursor-pointer"
                  >
                    पूरा उधार (देना बाकी: ₹{numTotalCost})
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

            {/* 📸 Vendor Bill Image / Receipt Upload */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    सप्लायर बिल / पर्चा फोटो अपलोड (Bill Photo)
                  </span>
                </div>
                {billImage && (
                  <button
                    type="button"
                    onClick={() => setBillImage(null)}
                    className="text-[11px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>हटाएं</span>
                  </button>
                )}
              </div>

              {billImage ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-black/5 p-2 flex items-center justify-center">
                  <img
                    src={billImage}
                    alt="Vendor Bill"
                    className="max-h-48 w-auto object-contain rounded-lg shadow-sm"
                  />
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-white group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-extrabold text-slate-800 mt-2">
                    बिल की फोटो खींचें या गैलरी से चुनें
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    सप्लायर का पक्का / कच्चा बिल रिकॉर्ड में सुरक्षित रखें
                  </p>
                </div>
              )}
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
