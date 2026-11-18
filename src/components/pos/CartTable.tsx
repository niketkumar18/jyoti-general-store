import React, { useState } from 'react';
import { Trash2, Plus, Minus, Receipt, ShoppingBag, Tag, Sparkles, Edit2, Check, X } from 'lucide-react';
import type { CartItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatUnit } from '../../utils/formatters';

interface CartTableProps {
  cart: CartItem[];
  discount: number;
  onUpdateQuantity: (itemId: number, newQty: number) => void;
  onUpdatePrice: (itemId: number, newPrice: number, updateCatalog?: boolean) => void;
  onRemoveItem: (itemId: number) => void;
  onClearCart: () => void;
  onSetDiscount: (discount: number) => void;
  onProceedToPay: () => void;
}

export const CartTable: React.FC<CartTableProps> = ({
  cart,
  discount,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  onClearCart,
  onSetDiscount,
  onProceedToPay
}) => {
  const { language, t } = useLanguage();

  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState<number | ''>('');
  const [tempQty, setTempQty] = useState<number | ''>('');
  const [updateCatalogPermanently, setUpdateCatalogPermanently] = useState(false);

  const startEditing = (item: CartItem) => {
    setEditingItemId(item.itemId);
    setTempPrice(item.salePrice);
    setTempQty(item.quantity);
    setUpdateCatalogPermanently(false);
  };

  const saveEdit = (itemId: number) => {
    if (typeof tempQty === 'number' && tempQty > 0) {
      onUpdateQuantity(itemId, tempQty);
    }
    if (typeof tempPrice === 'number' && tempPrice > 0) {
      onUpdatePrice(itemId, tempPrice, updateCatalogPermanently);
    }
    setEditingItemId(null);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const totalBulkSavings = cart.reduce(
    (sum, item) =>
      sum +
      (item.isBulkDiscountApplied
        ? item.salePrice * item.quantity - item.total
        : 0),
    0
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md flex flex-col h-full overflow-hidden">
      {/* Cart Header */}
      <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm sm:text-base">
            {t('cart_title')} ({cart.length})
          </h3>
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-rose-300 hover:text-rose-100 underline cursor-pointer"
          >
            {t('clear_cart')}
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 min-h-[100px] overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
        {cart.length > 0 ? (
          cart.map((item) => {
            const isWeight = item.unit === 'KG' || item.unit === 'LITRE';
            const step = isWeight ? 0.25 : 1;
            const hasBulkRule = Boolean(
              item.bulkDiscountThreshold && item.bulkDiscountPercentage
            );
            const remainingForBulk = hasBulkRule
              ? Math.max(0, Number((item.bulkDiscountThreshold! - item.quantity).toFixed(2)))
              : 0;

            const isEditing = editingItemId === item.itemId;

            return (
              <div
                key={item.itemId}
                className={`p-3 rounded-2xl border transition-all ${
                  isEditing
                    ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
                }`}
              >
                {/* Top Row: Name, Current Rate & Line Total with Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-extrabold text-slate-900 text-sm truncate">
                      {item.nameHi || item.nameEn}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-600">
                        @{formatCurrency(item.salePrice)} / {formatUnit(item.unit, language)}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingItemId(null);
                          } else {
                            startEditing(item);
                          }
                        }}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-all ${
                          isEditing
                            ? 'bg-amber-200 text-amber-900 border-amber-300'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                        }`}
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{isEditing ? 'संपादन बंद करें' : 'रेट / मात्रा बदलें'}</span>
                      </button>

                      {/* Bulk Discount Applied Badge */}
                      {item.isBulkDiscountApplied ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                          <Tag className="w-2.5 h-2.5 text-amber-700" />
                          <span>{item.bulkDiscountPercentage}% थोक छूट (@ ₹{item.effectivePrice})</span>
                        </span>
                      ) : hasBulkRule && remainingForBulk > 0 ? (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          💡 {remainingForBulk} {item.unit} और लें = {item.bulkDiscountPercentage}% छूट
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Line Total & Remove button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      {item.isBulkDiscountApplied && (
                        <div className="line-through text-slate-400 text-[10px]">
                          {formatCurrency(item.salePrice * item.quantity)}
                        </div>
                      )}
                      <div className="font-black text-base text-slate-900">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.itemId)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      title="हटाएं"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Normal Quick Quantity Control (When NOT in full edit mode) */}
                {!isEditing ? (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      मात्रा: <strong className="text-slate-800 font-extrabold">{item.quantity} {formatUnit(item.unit, language)}</strong>
                    </span>

                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5 border border-slate-200 shadow-2xs">
                      <button
                        onClick={() => {
                          const next = Math.max(0, Number((item.quantity - step).toFixed(2)));
                          if (next === 0) {
                            onRemoveItem(item.itemId);
                          } else {
                            onUpdateQuantity(item.itemId, next);
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600 shadow-xs transition-all cursor-pointer"
                        title="कम करें"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        step={isWeight ? '0.05' : '1'}
                        min="0"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            if (val === 0) onRemoveItem(item.itemId);
                            else onUpdateQuantity(item.itemId, val);
                          }
                        }}
                        className="w-16 text-center font-black text-slate-900 text-xs bg-transparent focus:outline-none"
                      />

                      <button
                        onClick={() => {
                          const next = Number((item.quantity + step).toFixed(2));
                          onUpdateQuantity(item.itemId, next);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 shadow-xs transition-all cursor-pointer"
                        title="बढ़ाएं"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Dedicated Full-Width Edit Panel */
                  <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 space-y-2.5 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Edit Quantity */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          मात्रा ({formatUnit(item.unit, language)}):
                        </label>
                        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-300 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => {
                              const current = typeof tempQty === 'number' ? tempQty : item.quantity;
                              const next = Math.max(step, Number((current - step).toFixed(2)));
                              setTempQty(next);
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            step={isWeight ? '0.05' : '1'}
                            min="0"
                            value={tempQty}
                            onChange={(e) => setTempQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full text-center font-black text-xs text-slate-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const current = typeof tempQty === 'number' ? tempQty : item.quantity;
                              const next = Number((current + step).toFixed(2));
                              setTempQty(next);
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Edit Rate */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          नया रेट (₹):
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full pl-6 pr-2 py-1 bg-white border border-slate-300 rounded-xl font-black text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Catalog Update Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-amber-950 bg-white/90 p-2 rounded-xl border border-amber-200">
                      <input
                        type="checkbox"
                        checked={updateCatalogPermanently}
                        onChange={(e) => setUpdateCatalogPermanently(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                      />
                      <span>☑️ कैटलॉग में भी हमेशा के लिए यह नया रेट अपडेट करें</span>
                    </label>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => saveEdit(item.itemId)}
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 active:scale-95 text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-md shadow-emerald-700/20 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>लागू करें (Save)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingItemId(null)}
                        className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-all"
                      >
                        रद्द करें
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400 space-y-2">
            <Receipt className="w-12 h-12 stroke-[1.5] text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              {t('cart_empty')}
            </p>
          </div>
        )}
      </div>

      {/* Cart Summary & Checkout */}
      {cart.length > 0 && (
        <div className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-200 space-y-2 sm:space-y-2.5 shrink-0 sticky bottom-0 z-10 shadow-md">
          {/* Subtotal */}
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{t('subtotal')}</span>
            <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
          </div>

          {/* Bulk Discount Savings if applicable */}
          {totalBulkSavings > 0 && (
            <div className="flex items-center justify-between text-xs text-amber-900 font-bold bg-amber-100/70 p-2 rounded-xl border border-amber-300">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>थोक मात्रा बचत (Bulk Savings):</span>
              </span>
              <span>-{formatCurrency(totalBulkSavings)}</span>
            </div>
          )}

          {/* Discount Field */}
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{t('discount')}</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                value={discount === 0 ? '' : discount}
                onChange={(e) => onSetDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-18 px-2 py-0.5 text-right font-bold text-slate-800 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Grand Total Bar */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">
              {t('grand_total')}
            </span>
            <span className="text-2xl font-black text-emerald-800 tracking-tight">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          {/* Checkout Button */}
          <button
            onClick={onProceedToPay}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-98 text-white font-black text-base rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{language === 'hi' ? 'भुगतान / बिल बनाएं' : 'Proceed to Pay'}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-mono">
              {formatCurrency(grandTotal)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
