import React, { useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, Tag, Sparkles, Edit2, Check, X, Gift } from 'lucide-react';
import type { CartItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatUnit } from '../../utils/formatters';

interface CartTableProps {
  cart: CartItem[];
  discount: number;
  onUpdateQuantity: (itemId: number, newQty: number) => void;
  onUpdatePrice: (itemId: number, newPrice: number, updateCatalog?: boolean) => void;
  onToggleComplementary?: (itemId: number) => void;
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
  onToggleComplementary,
  onRemoveItem,
  onClearCart,
  onSetDiscount,
  onProceedToPay
}) => {
  const { language, t } = useLanguage();

  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [tempPrice, setTempPrice] = useState<number | ''>('');
  const [tempQtyStr, setTempQtyStr] = useState<string>('');
  const [updateCatalogPermanently, setUpdateCatalogPermanently] = useState(false);
  const [inlineQtyStrings, setInlineQtyStrings] = useState<Record<number, string>>({});

  const startEditing = (item: CartItem) => {
    setEditingItemId(item.itemId);
    setTempPrice(item.salePrice);
    setTempQtyStr(String(item.quantity));
    setUpdateCatalogPermanently(false);
  };

  const saveEdit = (itemId: number) => {
    const parsedQty = parseFloat(tempQtyStr);
    if (!isNaN(parsedQty) && parsedQty > 0) {
      onUpdateQuantity(itemId, parsedQty);
    }
    if (typeof tempPrice === 'number' && tempPrice > 0) {
      onUpdatePrice(itemId, tempPrice, updateCatalogPermanently);
    }
    setEditingItemId(null);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.isComplementary ? 0 : item.total), 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const totalBulkSavings = cart.reduce(
    (sum, item) =>
      sum +
      (item.isComplementary
        ? item.salePrice * item.quantity
        : item.isBulkDiscountApplied
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
              item.bulkDiscountThreshold && (item.bulkDiscountRate || item.bulkDiscountPercentage)
            );
            const remainingForBulk = hasBulkRule
              ? Math.max(0, Number((item.bulkDiscountThreshold! - item.quantity).toFixed(2)))
              : 0;

            const isEditing = editingItemId === item.itemId;
            const currentInlineQty = inlineQtyStrings[item.itemId] ?? String(item.quantity);

            return (
              <div
                key={item.itemId}
                className={`p-3 rounded-2xl border transition-all ${
                  item.isComplementary
                    ? 'bg-purple-50/70 border-purple-300 shadow-2xs'
                    : isEditing
                    ? 'bg-amber-50/80 border-amber-300 shadow-sm'
                    : 'bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
                }`}
              >
                {/* Top Row: Name, Current Rate & Line Total with Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">
                        {item.nameHi || item.nameEn}
                      </h4>
                      {item.isComplementary && (
                        <span className="text-[10px] font-black text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-300">
                          🎁 मुफ्त (₹0)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-600">
                        {item.isComplementary ? (
                          <>
                            <span className="line-through text-slate-400">@{formatCurrency(item.salePrice)}</span>
                            <span className="text-purple-700 font-extrabold ml-1">@₹0 / {formatUnit(item.unit, language)}</span>
                          </>
                        ) : (
                          <>@{formatCurrency(item.effectivePrice || item.salePrice)} / {formatUnit(item.unit, language)}</>
                        )}
                      </span>

                      {/* Edit Rate & Qty Button */}
                      {!item.isComplementary && (
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
                      )}

                      {/* Toggle Complementary Button */}
                      {onToggleComplementary && (
                        <button
                          type="button"
                          onClick={() => onToggleComplementary(item.itemId)}
                          className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-all cursor-pointer ${
                            item.isComplementary
                              ? 'bg-purple-200 text-purple-950 border-purple-400 font-black'
                              : 'bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 border-slate-200'
                          }`}
                          title="इस सामान को कॉम्प्लिमेंट्री (मुफ्त उपहार) बनाएं"
                        >
                          <Gift className="w-2.5 h-2.5" />
                          <span>{item.isComplementary ? 'मुफ्त उपहार (सक्रिय)' : 'मुफ्त बनाएं'}</span>
                        </button>
                      )}

                      {/* Bulk Discount Applied Badge */}
                      {!item.isComplementary && item.isBulkDiscountApplied ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                          <Tag className="w-2.5 h-2.5 text-amber-700" />
                          <span>
                            {item.bulkDiscountRate ? `स्पेशल रेट @ ₹${item.bulkDiscountRate}` : `${item.bulkDiscountPercentage}% थोक छूट`}
                          </span>
                        </span>
                      ) : !item.isComplementary && hasBulkRule && remainingForBulk > 0 ? (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          💡 {remainingForBulk} {item.unit} और लें = {item.bulkDiscountRate ? `स्पेशल ₹${item.bulkDiscountRate} रेट` : `${item.bulkDiscountPercentage}% छूट`}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Line Total & Remove button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      {item.isComplementary ? (
                        <div className="font-black text-sm text-purple-700">
                          ₹0.00
                        </div>
                      ) : (
                        <>
                          {item.isBulkDiscountApplied && (
                            <div className="line-through text-slate-400 text-[10px]">
                              {formatCurrency(item.salePrice * item.quantity)}
                            </div>
                          )}
                          <div className="font-black text-base text-slate-900">
                            {formatCurrency(item.total)}
                          </div>
                        </>
                      )}
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
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">
                        मात्रा: <strong className="text-slate-800 font-extrabold">{item.quantity} {formatUnit(item.unit, language)}</strong>
                      </span>

                      {/* Quick Fractional Weight Chips (especially for loose weight items like 900gm!) */}
                      {isWeight && (
                        <div className="flex items-center gap-1">
                          {[
                            { label: '250g', val: 0.25 },
                            { label: '500g', val: 0.5 },
                            { label: '900g', val: 0.9 },
                            { label: '1kg', val: 1 }
                          ].map((chip) => (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() => onUpdateQuantity(item.itemId, chip.val)}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                item.quantity === chip.val
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5 border border-slate-200 shadow-2xs self-end sm:self-auto">
                      <button
                        onClick={() => {
                          const next = Math.max(0, Number((item.quantity - step).toFixed(3)));
                          if (next === 0) {
                            onRemoveItem(item.itemId);
                          } else {
                            onUpdateQuantity(item.itemId, next);
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600 shadow-xs transition-all cursor-pointer font-bold"
                        title="कम करें"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      {/* Text Input with String State so '0.' and '0.900' can be typed without resetting or deleting! */}
                      <input
                        type="text"
                        inputMode="decimal"
                        value={currentInlineQty}
                        onChange={(e) => {
                          const text = e.target.value;
                          setInlineQtyStrings((prev) => ({ ...prev, [item.itemId]: text }));
                          const val = parseFloat(text);
                          if (!isNaN(val) && val > 0) {
                            onUpdateQuantity(item.itemId, val);
                          }
                        }}
                        onBlur={() => {
                          const text = inlineQtyStrings[item.itemId];
                          if (text !== undefined) {
                            const val = parseFloat(text);
                            if (isNaN(val) || val <= 0) {
                              onUpdateQuantity(item.itemId, item.quantity);
                            }
                            setInlineQtyStrings((prev) => {
                              const copy = { ...prev };
                              delete copy[item.itemId];
                              return copy;
                            });
                          }
                        }}
                        className="w-16 text-center font-black text-slate-900 text-xs bg-transparent focus:outline-none focus:bg-white rounded"
                        placeholder="0.0"
                      />

                      <button
                        onClick={() => {
                          const next = Number((item.quantity + step).toFixed(3));
                          onUpdateQuantity(item.itemId, next);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 shadow-xs transition-all cursor-pointer font-bold"
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
                      {/* Edit Quantity (supports 0.900 cleanly) */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          मात्रा ({formatUnit(item.unit, language)}):
                        </label>
                        <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-slate-300 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseFloat(tempQtyStr) || item.quantity;
                              const next = Math.max(step, Number((current - step).toFixed(3)));
                              setTempQtyStr(String(next));
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={tempQtyStr}
                            onChange={(e) => setTempQtyStr(e.target.value)}
                            placeholder="उदा. 0.900"
                            className="w-full text-center font-black text-xs text-slate-900 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseFloat(tempQtyStr) || item.quantity;
                              const next = Number((current + step).toFixed(3));
                              setTempQtyStr(String(next));
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        {isWeight && (
                          <div className="flex gap-1 mt-1 justify-center">
                            {[0.25, 0.5, 0.9, 1].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setTempQtyStr(String(val))}
                                className="text-[9px] px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold cursor-pointer"
                              >
                                {val >= 1 ? `${val}kg` : `${val * 1000}g`}
                              </button>
                            ))}
                          </div>
                        )}
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
                            step="any"
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
          <div className="text-center py-12 px-4 text-slate-400 space-y-2">
            <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-medium">{t('empty_cart_msg')}</p>
          </div>
        )}
      </div>

      {/* Cart Summary & Pay CTA */}
      {cart.length > 0 && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2.5">
          {totalBulkSavings > 0 && (
            <div className="bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center justify-between text-xs text-emerald-950 font-bold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>कुल छूट / मुफ्त उपहार बचत:</span>
              </span>
              <span>{formatCurrency(totalBulkSavings)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-xs text-slate-600 font-medium px-1">
            <span>उप-योग (Subtotal):</span>
            <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
          </div>

          {/* Flat Discount Input Row */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Tag className="w-3 h-3 text-emerald-600" />
                <span>छूट (Flat Rupee ₹):</span>
              </span>
              <div className="relative w-28">
                <span className="absolute left-2 top-1 text-xs text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  step="any"
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                    onSetDiscount(val);
                  }}
                  placeholder="0"
                  className="w-full pl-5 pr-2 py-0.5 bg-amber-50/50 border border-amber-300 rounded-lg text-right font-black text-xs text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap items-center gap-1">
              {[0, 5, 10, 20, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onSetDiscount(amt)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                    discount === amt
                      ? 'bg-emerald-700 text-white border-emerald-800'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  {amt === 0 ? 'हटाएं' : `-₹${amt}`}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  const paise = Number((subtotal % 1).toFixed(2));
                  if (paise > 0) {
                    onSetDiscount(paise);
                  } else {
                    const remainder = subtotal % 10;
                    const d = remainder > 0 ? remainder : (subtotal % 5);
                    onSetDiscount(d > 0 ? d : 0);
                  }
                }}
                className="text-[9px] font-black px-1.5 py-0.5 rounded border bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 cursor-pointer"
              >
                🎯 राउंड ऑफ
              </button>
            </div>
          </div>

          {discount > 0 && (
            <div className="flex justify-between items-center text-xs text-emerald-700 font-bold px-1">
              <span>छूट (Discount):</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-black text-slate-900 uppercase">कुल देय (Total):</span>
            <span className="text-xl font-black text-emerald-800">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <button
            onClick={onProceedToPay}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:to-green-700 active:scale-98 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
          >
            <span>भुगतान करें (Pay {formatCurrency(grandTotal)}) ➔</span>
          </button>
        </div>
      )}
    </div>
  );
};