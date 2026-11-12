import React from 'react';
import { Trash2, Plus, Minus, Receipt, ShoppingBag } from 'lucide-react';
import type { CartItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatUnit } from '../../utils/formatters';

interface CartTableProps {
  cart: CartItem[];
  discount: number;
  onUpdateQuantity: (itemId: number, newQty: number) => void;
  onUpdatePrice: (itemId: number, newPrice: number) => void;
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

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subtotal - discount);

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
            className="text-xs text-rose-300 hover:text-rose-100 underline"
          >
            {t('clear_cart')}
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
        {cart.length > 0 ? (
          cart.map((item) => {
            const isWeight = item.unit === 'KG' || item.unit === 'LITRE';
            const step = isWeight ? 0.25 : 1;

            return (
              <div
                key={item.itemId}
                className="py-2.5 px-2 flex items-center justify-between gap-2 hover:bg-slate-50 rounded-xl transition-all"
              >
                {/* Item Name & Rate */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">
                    {item.nameHi || item.nameEn}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>
                      @{formatCurrency(item.salePrice)} / {formatUnit(item.unit, language)}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                  <button
                    onClick={() => {
                      const next = Math.max(0, Number((item.quantity - step).toFixed(2)));
                      if (next === 0) {
                        onRemoveItem(item.itemId);
                      } else {
                        onUpdateQuantity(item.itemId, next);
                      }
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600 shadow-sm transition-all"
                    title="कम करें"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="number"
                    step={isWeight ? "0.05" : "1"}
                    min="0"
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        if (val === 0) onRemoveItem(item.itemId);
                        else onUpdateQuantity(item.itemId, val);
                      }
                    }}
                    className="w-14 text-center font-bold text-slate-900 text-xs bg-transparent focus:outline-none"
                  />

                  <button
                    onClick={() => {
                      const next = Number((item.quantity + step).toFixed(2));
                      onUpdateQuantity(item.itemId, next);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm transition-all"
                    title="बढ़ाएं"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="w-18 text-right font-extrabold text-sm text-slate-900">
                  {formatCurrency(item.total)}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => onRemoveItem(item.itemId)}
                  className="text-slate-400 hover:text-rose-500 p-1 rounded-md"
                  title="हटाएं"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5">
          {/* Subtotal */}
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{t('subtotal')}</span>
            <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
          </div>

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
