import React, { useState } from 'react';
import { X, Plus, Minus, Check, PackagePlus } from 'lucide-react';
import type { InventoryItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { syncItemsToGoogleSheets } from '../../utils/googleSheetsSync';
import { db } from '../../db';

interface QuickStockAdjustModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onOpenVendorPurchase?: (itemId: number) => void;
}

export const QuickStockAdjustModal: React.FC<QuickStockAdjustModalProps> = ({
  isOpen,
  item,
  onClose,
  onOpenVendorPurchase
}) => {
  const { language } = useLanguage();
  const { settings } = useSettings();
  const [adjustment, setAdjustment] = useState<number>(10);
  const [mode, setMode] = useState<'ADD' | 'SUBTRACT'>('ADD');

  if (!isOpen || !item) return null;

  const currentStock = item.stockQty;
  const newStock = mode === 'ADD' 
    ? currentStock + Math.abs(adjustment) 
    : Math.max(0, currentStock - Math.abs(adjustment));

  const handleApply = async () => {
    if (item.id) {
      await db.items.update(item.id, {
        stockQty: Number(newStock.toFixed(2)),
        updatedAt: Date.now()
      });
      if (settings.googleSheetsUrl) {
        syncItemsToGoogleSheets(settings.googleSheetsUrl, settings.googleSheetDocumentUrl)
          .catch(e => console.error('Failed to sync adjusted stock:', e));
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">
              {language === 'hi' ? 'स्टॉक जोड़ें / घटाएं' : 'Adjust Stock'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <h4 className="font-bold text-slate-900 text-base">
              {item.nameHi || item.nameEn}
            </h4>
            <p className="text-xs text-slate-500">
              मौजूदा स्टॉक: <strong className="text-slate-800">{currentStock} {item.unit}</strong>
            </p>
          </div>

          {/* Supplier Sync Shortcut Banner */}
          {onOpenVendorPurchase && item.id && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-xs text-indigo-950 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                <PackagePlus className="w-4 h-4 text-indigo-600" />
                <span>सप्लायर से नया माल आया है?</span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-snug">
                सप्लायर खाता, पर्चा और खरीद दर एक साथ सिंक रखने के लिए सप्लायर बिल से स्टॉक जोड़ें।
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVendorPurchase(item.id!);
                }}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <span>🛒 सप्लायर बिल से स्टॉक जोड़ें</span>
              </button>
            </div>
          )}

          {/* Toggle Add / Subtract */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setMode('ADD')}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                mode === 'ADD' ? 'bg-emerald-600 text-white shadow' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>स्टॉक आया (Add)</span>
            </button>

            <button
              onClick={() => setMode('SUBTRACT')}
              className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                mode === 'SUBTRACT' ? 'bg-rose-600 text-white shadow' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Minus className="w-3.5 h-3.5" />
              <span>खराब / वापस (Sub)</span>
            </button>
          </div>

          {/* Adjustment Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              मात्रा ({item.unit})
            </label>
            <input
              type="number"
              min="0.001"
              step="any"
              value={adjustment}
              onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-lg font-black text-center text-slate-900"
            />
          </div>

          {/* Quick Buttons */}
          <div className="flex gap-1.5 justify-center">
            {[5, 10, 25, 50].map((num) => (
              <button
                key={num}
                onClick={() => setAdjustment(num)}
                className="px-3 py-1 bg-slate-100 hover:bg-emerald-100 text-xs font-bold text-slate-700 rounded-lg border border-slate-200"
              >
                +{num}
              </button>
            ))}
          </div>

          {/* Projected Result */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <span className="text-xs text-emerald-800 font-medium">बदलाव के बाद नया स्टॉक:</span>
            <div className="text-xl font-extrabold text-emerald-950 mt-0.5">
              {newStock} {item.unit}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2 shrink-0 sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100"
          >
            {language === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>अपडेट करें</span>
          </button>
        </div>
      </div>
    </div>
  );
};
