import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Customer, InventoryItem, CartItem, Invoice } from '../../types';
import { ItemSearchGrid } from './ItemSearchGrid';
import { CartTable } from './CartTable';
import { CustomerSelect } from './CustomerSelect';
import { PaymentModal } from './PaymentModal';
import { CreditRiskModal } from '../common/CreditRiskModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { InvoiceViewModal } from '../bill/InvoiceViewModal';
import { ItemFormModal } from '../inventory/ItemFormModal';
import { playBeepSound } from '../../utils/audio';
import { calculateItemPricing } from '../../utils/pricing';
import { formatCurrency } from '../../utils/formatters';

export const PosScreen: React.FC = () => {
  const items = useLiveQuery(() => db.items.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [mobileTab, setMobileTab] = useState<'ITEMS' | 'CART'>('ITEMS');

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showQuickAddItem, setShowQuickAddItem] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);
  const [updatedCustomerBalance, setUpdatedCustomerBalance] = useState<number | undefined>(undefined);

  // Risk Warning Modal State
  const [riskModalData, setRiskModalData] = useState<{
    isOpen: boolean;
    customer: Customer | null;
    requestedCredit: number;
    onProceed: () => void;
  }>({
    isOpen: false,
    customer: null,
    requestedCredit: 0,
    onProceed: () => {}
  });

  // Cart Handlers
  const handleAddToCart = (item: InventoryItem, qty = 1) => {
    playBeepSound();
    setCart((prev) => {
      const existingIndex = prev.findIndex((c) => c.itemId === item.id);
      if (existingIndex > -1) {
        const copy = [...prev];
        const newQty = Number((copy[existingIndex].quantity + qty).toFixed(2));
        const pricing = calculateItemPricing(
          copy[existingIndex].salePrice,
          newQty,
          copy[existingIndex].bulkDiscountThreshold,
          copy[existingIndex].bulkDiscountPercentage
        );
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantity: newQty,
          effectivePrice: pricing.effectiveUnitPrice,
          isBulkDiscountApplied: pricing.isBulkApplied,
          total: pricing.total
        };
        return copy;
      } else {
        const pricing = calculateItemPricing(
          item.salePrice,
          qty,
          item.bulkDiscountThreshold,
          item.bulkDiscountPercentage
        );
        return [
          ...prev,
          {
            itemId: item.id!,
            nameEn: item.nameEn,
            nameHi: item.nameHi,
            unit: item.unit,
            quantity: qty,
            salePrice: item.salePrice,
            costPrice: item.costPrice,
            bulkDiscountThreshold: item.bulkDiscountThreshold,
            bulkDiscountPercentage: item.bulkDiscountPercentage,
            effectivePrice: pricing.effectiveUnitPrice,
            isBulkDiscountApplied: pricing.isBulkApplied,
            total: pricing.total
          }
        ];
      }
    });
  };

  const handleUpdateQuantity = (itemId: number, newQty: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          const pricing = calculateItemPricing(
            item.salePrice,
            newQty,
            item.bulkDiscountThreshold,
            item.bulkDiscountPercentage
          );
          return {
            ...item,
            quantity: newQty,
            effectivePrice: pricing.effectiveUnitPrice,
            isBulkDiscountApplied: pricing.isBulkApplied,
            total: pricing.total
          };
        }
        return item;
      })
    );
  };

  const handleUpdatePrice = async (itemId: number, newPrice: number, updateCatalog: boolean = false) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.itemId === itemId) {
          const pricing = calculateItemPricing(
            newPrice,
            item.quantity,
            item.bulkDiscountThreshold,
            item.bulkDiscountPercentage
          );
          return {
            ...item,
            salePrice: newPrice,
            effectivePrice: pricing.effectiveUnitPrice,
            isBulkDiscountApplied: pricing.isBulkApplied,
            total: pricing.total
          };
        }
        return item;
      })
    );

    if (updateCatalog) {
      try {
        await db.items.update(itemId, {
          salePrice: newPrice,
          price: newPrice,
          updatedAt: Date.now()
        });
      } catch (err) {
        console.error('Failed to update catalog price:', err);
      }
    }
  };

  const handleRemoveItem = (itemId: number) => {
    setCart((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const handleClearCart = () => {
    if (cart.length > 0 && confirm('क्या आप बिल खाली करना चाहते हैं?')) {
      setCart([]);
      setDiscount(0);
    }
  };

  // Barcode Scanned
  const handleBarcodeScanned = (barcode: string) => {
    const matched = items.find((i) => i.barcode === barcode);
    if (matched) {
      handleAddToCart(matched, 1);
    } else {
      alert(`बारकोड "${barcode}" का कोई सामान नहीं मिला।`);
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 min-h-[calc(100dvh-125px)] lg:h-[calc(100vh-115px)] flex flex-col relative pb-20 lg:pb-0">
      {/* Mobile Segmented Switcher (Visible only on < lg) */}
      <div className="lg:hidden flex bg-slate-200/90 p-1 rounded-2xl mb-2.5 gap-1 shrink-0 shadow-xs">
        <button
          type="button"
          onClick={() => setMobileTab('ITEMS')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'ITEMS'
              ? 'bg-white text-emerald-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🛍️ सामान सूची (Catalog)</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('CART')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'CART'
              ? 'bg-white text-emerald-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🛒 बिल व ग्राहक</span>
          {cart.length > 0 && (
            <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full overflow-hidden flex-1">
        {/* Left Column: Product Search, Category Pills & Grid (7 cols on desktop) */}
        <div className={`lg:col-span-7 xl:col-span-8 flex-col h-full overflow-hidden ${mobileTab === 'ITEMS' ? 'flex' : 'hidden lg:flex'}`}>
          <ItemSearchGrid
            items={items}
            onAddToCart={handleAddToCart}
            onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
            onOpenQuickAddItem={() => setShowQuickAddItem(true)}
          />
        </div>

        {/* Right Column: Customer Selector & Cart Checkout (5 cols on desktop) */}
        <div className={`lg:col-span-5 xl:col-span-4 flex-col h-full space-y-2.5 overflow-hidden ${mobileTab === 'CART' ? 'flex' : 'hidden lg:flex'}`}>
          {/* Back to Catalog Switcher for Mobile */}
          <div className="lg:hidden flex items-center justify-between pb-1">
            <button
              onClick={() => setMobileTab('ITEMS')}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200"
            >
              <span>← + और सामान जोड़ें (Add Items)</span>
            </button>
            <span className="text-xs text-slate-500 font-semibold">
              कुल {cart.length} सामान
            </span>
          </div>

          {/* Customer Selection Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2.5 sm:p-3 shadow-sm shrink-0">
            <CustomerSelect
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={(cust) => setSelectedCustomer(cust)}
            />
          </div>

          {/* Cart Table */}
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
            <CartTable
              cart={cart}
              discount={discount}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdatePrice={handleUpdatePrice}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onSetDiscount={setDiscount}
              onProceedToPay={() => setShowPaymentModal(true)}
            />
          </div>
        </div>
      </div>

      {/* Floating Bottom Cart Bar for Mobile when browsing items */}
      {cart.length > 0 && mobileTab === 'ITEMS' && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30 animate-in slide-in-from-bottom-4 duration-200">
          <button
            onClick={() => setMobileTab('CART')}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 active:scale-98 text-white rounded-2xl shadow-xl shadow-emerald-900/40 flex items-center justify-between font-black border border-emerald-400/30"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white px-2 py-0.5 rounded-lg text-xs font-black">
                {cart.length} सामान
              </span>
              <span className="text-sm font-bold text-emerald-100">
                कुल: <strong className="text-white text-base">{formatCurrency(grandTotal)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs font-extrabold bg-white text-emerald-900 px-3 py-1.5 rounded-xl shadow-sm">
              <span>बिल देखें ➔</span>
            </div>
          </button>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        cart={cart}
        subtotal={subtotal}
        discount={discount}
        grandTotal={grandTotal}
        customer={selectedCustomer}
        onUpdatePrice={handleUpdatePrice}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClose={() => setShowPaymentModal(false)}
        onOpenCustomerSelect={() => {
          setShowPaymentModal(false);
        }}
        onTriggerRiskWarning={(cust, reqCredit, onConfirm) => {
          setShowPaymentModal(false);
          setRiskModalData({
            isOpen: true,
            customer: cust,
            requestedCredit: reqCredit,
            onProceed: () => {
              setRiskModalData((prev) => ({ ...prev, isOpen: false }));
              onConfirm();
            }
          });
        }}
        onInvoiceCreated={(invoice, updatedBal) => {
          setShowPaymentModal(false);
          setCreatedInvoice(invoice);
          setUpdatedCustomerBalance(updatedBal);
          setShowInvoiceModal(true);
        }}
      />

      {/* Credit Risk Warning Modal (Red Zone) */}
      {riskModalData.isOpen && riskModalData.customer && (
        <CreditRiskModal
          isOpen={riskModalData.isOpen}
          customer={riskModalData.customer}
          requestedCredit={riskModalData.requestedCredit}
          onProceed={riskModalData.onProceed}
          onCancel={() => {
            setRiskModalData((prev) => ({ ...prev, isOpen: false }));
            setShowPaymentModal(true);
          }}
        />
      )}

      {/* Barcode Scanner Camera Modal */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onScan={handleBarcodeScanned}
        onClose={() => setShowBarcodeScanner(false)}
      />

      {/* 10-Second Quick Item Add Modal */}
      <ItemFormModal
        isOpen={showQuickAddItem}
        onClose={() => setShowQuickAddItem(false)}
      />

      {/* Invoice Receipt Modal */}
      <InvoiceViewModal
        isOpen={showInvoiceModal}
        invoice={createdInvoice}
        customerTotalBalance={updatedCustomerBalance}
        onClose={() => setShowInvoiceModal(false)}
        onStartNewBill={() => {
          setShowInvoiceModal(false);
          setCart([]);
          setDiscount(0);
          setSelectedCustomer(null);
        }}
      />
    </div>
  );
};
