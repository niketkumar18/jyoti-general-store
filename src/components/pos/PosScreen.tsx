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

export const PosScreen: React.FC = () => {
  const items = useLiveQuery(() => db.items.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState<number>(0);

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

  const handleUpdatePrice = (itemId: number, newPrice: number) => {
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
    <div className="max-w-7xl mx-auto p-2 sm:p-4 h-[calc(100vh-115px)] flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full overflow-hidden">
        {/* Left Column: Product Search, Category Pills & Grid (7 cols on desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full overflow-hidden">
          <ItemSearchGrid
            items={items}
            onAddToCart={handleAddToCart}
            onOpenBarcodeScanner={() => setShowBarcodeScanner(true)}
            onOpenQuickAddItem={() => setShowQuickAddItem(true)}
          />
        </div>

        {/* Right Column: Customer Selector & Cart Checkout (5 cols on desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full space-y-2.5 overflow-hidden">
          {/* Customer Selection Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
            <CustomerSelect
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={(cust) => setSelectedCustomer(cust)}
            />
          </div>

          {/* Cart Table */}
          <div className="flex-1 overflow-hidden">
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

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        cart={cart}
        subtotal={subtotal}
        discount={discount}
        grandTotal={grandTotal}
        customer={selectedCustomer}
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
