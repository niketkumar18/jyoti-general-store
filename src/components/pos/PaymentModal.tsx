import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  Banknote, 
  QrCode, 
  BookMarked, 
  GitFork, 
  CheckCircle2, 
  X, 
  AlertTriangle,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import type { Customer, CartItem, PaymentMethod, Invoice, ShopSettings } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, calculateRiskLevel } from '../../utils/formatters';
import { playSuccessChime } from '../../utils/audio';
import { db } from '../../db';
import { syncPendingToGoogleSheets } from '../../utils/googleSheetsSync';

interface PaymentModalProps {
  isOpen: boolean;
  cart: CartItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  customer: Customer | null;
  onClose: () => void;
  onInvoiceCreated: (invoice: Invoice, updatedCustomerBal?: number) => void;
  onTriggerRiskWarning: (customer: Customer, requestedCredit: number, onConfirm: () => void) => void;
  onOpenCustomerSelect: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  cart,
  subtotal,
  discount,
  grandTotal,
  customer,
  onClose,
  onInvoiceCreated,
  onTriggerRiskWarning,
  onOpenCustomerSelect
}) => {
  const { language, t } = useLanguage();
  const { settings } = useSettings();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(grandTotal);
  const [splitPaidAmount, setSplitPaidAmount] = useState<number>(Math.floor(grandTotal / 2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadedQr, setShowUploadedQr] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!isOpen) return null;

  // Change to return in cash mode
  const changeToReturn = Math.max(0, cashTendered - grandTotal);
  
  // Calculate paid & due according to method
  let paidAmount = grandTotal;
  let dueAmount = 0;

  if (paymentMethod === 'CREDIT') {
    paidAmount = 0;
    dueAmount = grandTotal;
  } else if (paymentMethod === 'SPLIT') {
    paidAmount = Math.min(grandTotal, Math.max(0, splitPaidAmount));
    dueAmount = Math.max(0, grandTotal - paidAmount);
  }

  // UPI payment URI for dynamic QR code
  // format: upi://pay?pa=shop@upi&pn=ShopName&am=1250&cu=INR&tn=Bill
  const shopUpi = settings.upiId || 'denpos@upi';
  const shopNameEncoded = encodeURIComponent(settings.shopName || 'DEN Kirana');
  const upiPayUrl = `upi://pay?pa=${shopUpi}&pn=${shopNameEncoded}&am=${grandTotal}&cu=INR&tn=DEN-Bill`;

  const processInvoiceCreation = async () => {
    setIsSubmitting(true);
    try {
      // 1. Generate sequential invoice number
      const invoiceCount = await db.invoices.count();
      const invoiceNumber = `DEN-${1000 + invoiceCount + 1}`;

      const invoiceItems = cart.map((c) => ({
        itemId: c.itemId,
        nameEn: c.nameEn,
        nameHi: c.nameHi,
        unit: c.unit,
        quantity: c.quantity,
        unitPrice: c.effectivePrice || c.salePrice,
        originalPrice: c.salePrice,
        discountPercentage: c.isBulkDiscountApplied ? c.bulkDiscountPercentage : undefined,
        costPrice: c.costPrice,
        total: c.total
      }));

      const newInvoice: Omit<Invoice, 'id'> = {
        invoiceNumber,
        customerId: customer?.id,
        customerName: customer ? customer.name : 'नकद ग्राहक (Walk-in)',
        customerMobile: customer ? customer.mobile : '',
        items: invoiceItems,
        subtotal,
        discount,
        grandTotal,
        paidAmount,
        dueAmount,
        paymentMethod,
        syncedToGoogle: false,
        createdAt: Date.now()
      };

      const invoiceId = await db.invoices.add(newInvoice as any);
      const createdInvoice: Invoice = { ...newInvoice, id: invoiceId as number };

      let updatedCustomerBal: number | undefined;

      // 2. If Udhar / Due amount exists, update Customer Ledger & balance
      if (dueAmount > 0 && customer && customer.id) {
        const newBalance = customer.currentBalance + dueAmount;
        const newRisk = calculateRiskLevel(newBalance, customer.creditLimit);

        await db.customers.update(customer.id, {
          currentBalance: newBalance,
          riskLevel: newRisk,
          updatedAt: Date.now()
        });

        const itemsSummary = cart.map(c => `${c.nameHi || c.nameEn} (${c.quantity} ${c.unit})`).join(', ');

        // Add DEBIT ledger entry
        await db.ledger.add({
          customerId: customer.id,
          customerName: customer.name,
          type: 'DEBIT',
          amount: dueAmount,
          paymentMode: 'BILL',
          billId: invoiceId as number,
          invoiceNumber,
          itemsSummary,
          items: invoiceItems,
          description: `बिल #${invoiceNumber}: ${itemsSummary}`,
          runningBalance: newBalance,
          syncedToGoogle: false,
          createdAt: Date.now()
        });

        updatedCustomerBal = newBalance;
      }

      // 3. Decrement Inventory Quantities
      for (const item of cart) {
        const dbItem = await db.items.get(item.itemId);
        if (dbItem) {
          const remainingStock = Math.max(0, Number((dbItem.stockQty - item.quantity).toFixed(2)));
          await db.items.update(item.itemId, {
            stockQty: remainingStock,
            updatedAt: Date.now()
          });
        }
      }

      // 4. Auto-sync in background to Google Sheets if Webhook is configured
      if (settings.googleSheetsUrl) {
        syncPendingToGoogleSheets(settings.googleSheetsUrl, settings.googleSheetDocumentUrl)
          .catch((e) => console.error('Real-time Google Sheets sync error:', e));
      }

      // 5. Confetti and Sound
      if (settings.enableSound) {
        playSuccessChime();
      }
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (e) {
        // ignore
      }

      // Notify parent to open InvoiceViewModal
      onInvoiceCreated(createdInvoice, updatedCustomerBal);
    } catch (err) {
      console.error('Failed to create bill:', err);
      alert('बिल बनाने में त्रुटि हुई');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteBill = () => {
    // If Udhar or Split selected but no registered customer chosen
    if ((paymentMethod === 'CREDIT' || (paymentMethod === 'SPLIT' && dueAmount > 0)) && !customer) {
      alert(
        language === 'hi'
          ? 'उधार बिल बनाने के लिए कृपया ग्राहक का नाम चुनें या नया ग्राहक जोड़ें!'
          : 'Please select or add a customer to extend credit/udhar!'
      );
      onOpenCustomerSelect();
      return;
    }

    // Check Credit Limit if Udhar is involved
    if (dueAmount > 0 && customer) {
      const projectedBalance = customer.currentBalance + dueAmount;
      if (projectedBalance > customer.creditLimit || customer.riskLevel === 'danger') {
        // Trigger Red Zone warning popup
        onTriggerRiskWarning(customer, dueAmount, () => {
          processInvoiceCreation();
        });
        return;
      }
    }

    // Otherwise proceed
    processInvoiceCreation();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg sm:text-xl">
              {language === 'hi' ? 'भुगतान एवं बिल पूर्ण करें' : 'Complete Payment & Bill'}
            </h3>
            <p className="text-emerald-200 text-xs sm:text-sm mt-0.5">
              {customer ? `ग्राहक: ${customer.name}` : 'नकद ग्राहक (Cash Walk-in)'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grand Total Display */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 p-4 text-center">
          <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            {t('grand_total')}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-900 mt-0.5">
            {formatCurrency(grandTotal)}
          </div>
        </div>

        {/* Payment Methods Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <div className="text-xs font-bold text-slate-700">
            {t('payment_method')}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* CASH */}
            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                paymentMethod === 'CASH'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <Banknote className={`w-6 h-6 ${paymentMethod === 'CASH' ? 'text-emerald-600' : 'text-slate-500'}`} />
              <div className="mt-2">
                <div className="font-bold text-sm">{t('pay_cash')}</div>
                <div className="text-[11px] text-slate-500">हाथों-हाथ नकद</div>
              </div>
            </button>

            {/* UPI QR */}
            <button
              type="button"
              onClick={() => setPaymentMethod('UPI')}
              className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                paymentMethod === 'UPI'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <QrCode className={`w-6 h-6 ${paymentMethod === 'UPI' ? 'text-emerald-600' : 'text-slate-500'}`} />
              <div className="mt-2">
                <div className="font-bold text-sm">{t('pay_upi')}</div>
                <div className="text-[11px] text-slate-500">PhonePe, GPay, Paytm</div>
              </div>
            </button>

            {/* UDHAR / CREDIT */}
            <button
              type="button"
              onClick={() => {
                if (!customer) {
                  alert('उधार देने के लिए पहले ग्राहक का नाम चुनें!');
                  onOpenCustomerSelect();
                  return;
                }
                setPaymentMethod('CREDIT');
              }}
              className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                paymentMethod === 'CREDIT'
                  ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <BookMarked className={`w-6 h-6 ${paymentMethod === 'CREDIT' ? 'text-amber-600' : 'text-slate-500'}`} />
              <div className="mt-2">
                <div className="font-bold text-sm">{t('pay_credit')}</div>
                <div className="text-[11px] text-slate-500">खाते में जुड़ेगा</div>
              </div>
            </button>

            {/* SPLIT PAY */}
            <button
              type="button"
              onClick={() => {
                if (!customer) {
                  alert('आधा नकद / आधा उधार के लिए पहले ग्राहक का नाम चुनें!');
                  onOpenCustomerSelect();
                  return;
                }
                setPaymentMethod('SPLIT');
              }}
              className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                paymentMethod === 'SPLIT'
                  ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
              }`}
            >
              <GitFork className={`w-6 h-6 ${paymentMethod === 'SPLIT' ? 'text-blue-600' : 'text-slate-500'}`} />
              <div className="mt-2">
                <div className="font-bold text-sm">{t('pay_split')}</div>
                <div className="text-[11px] text-slate-500">कुछ नकद + कुछ उधार</div>
              </div>
            </button>
          </div>

          {/* DYNAMIC CONTENT PER METHOD */}
          {paymentMethod === 'CASH' && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                {t('amount_received')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-lg text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Cash Suggestions */}
              <div className="flex items-center gap-1.5 pt-1">
                {[grandTotal, Math.ceil(grandTotal / 50) * 50, Math.ceil(grandTotal / 100) * 100, 500, 2000]
                  .filter((v, idx, arr) => v >= grandTotal && arr.indexOf(v) === idx)
                  .slice(0, 4)
                  .map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCashTendered(amount)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-xs font-bold text-slate-700 rounded-lg border border-slate-200 shadow-sm"
                    >
                      ₹{amount}
                    </button>
                  ))}
              </div>

              {changeToReturn > 0 && (
                <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">
                    {t('change_to_return')}
                  </span>
                  <span className="text-lg font-black text-emerald-900">
                    {formatCurrency(changeToReturn)}
                  </span>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'UPI' && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col items-center text-center space-y-3">
              {/* Toggle if merchant uploaded a custom QR image */}
              {settings.qrCodeImageUrl && (
                <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold gap-1">
                  <button
                    type="button"
                    onClick={() => setShowUploadedQr(false)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      !showUploadedQr
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ बिल राशि QR ({formatCurrency(grandTotal)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadedQr(true)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      showUploadedQr
                        ? 'bg-white text-emerald-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📷 दुकान का QR स्टेंडी
                  </button>
                </div>
              )}

              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                {showUploadedQr && settings.qrCodeImageUrl ? (
                  <img
                    src={settings.qrCodeImageUrl}
                    alt="दुकान का QR कोड"
                    className="w-48 h-48 object-contain rounded-xl"
                  />
                ) : (
                  <QRCodeSVG
                    value={upiPayUrl}
                    size={160}
                    level="M"
                    includeMargin={true}
                  />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
                  <span>दुकान की UPI ID:</span>
                  <strong className="text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {shopUpi}
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(shopUpi);
                      setCopiedUpi(true);
                      setTimeout(() => setCopiedUpi(false), 2000);
                    }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                    title="कॉपी करें"
                  >
                    {copiedUpi ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-emerald-700 font-bold mt-1">
                  ग्राहक से कहें कि किसी भी UPI ऐप (GPay, PhonePe, Paytm) से स्कैन कर {formatCurrency(grandTotal)} का भुगतान करें।
                </p>
              </div>
            </div>
          )}

          {paymentMethod === 'CREDIT' && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-900 font-bold">{t('due_balance')}</span>
                <span className="text-base font-extrabold text-amber-900">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              {customer && (
                <div className="text-xs text-amber-800 pt-1 border-t border-amber-200 flex justify-between">
                  <span>खाते में पहले से बकाया: {formatCurrency(customer.currentBalance)}</span>
                  <span>उधारी सीमा: {formatCurrency(customer.creditLimit)}</span>
                </div>
              )}
            </div>
          )}

          {paymentMethod === 'SPLIT' && (
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 space-y-3">
              <div>
                <label className="block text-xs font-bold text-blue-900 mb-1">
                  नकद / UPI द्वारा प्राप्त राशि (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={splitPaidAmount}
                  onChange={(e) => setSplitPaidAmount(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2 bg-white border border-blue-300 rounded-xl font-bold text-base text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-blue-900 font-bold pt-1">
                <span>{t('due_balance')}:</span>
                <span className="text-sm font-extrabold text-rose-600">
                  {formatCurrency(dueAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-2xl transition-all"
          >
            {language === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCompleteBill}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-98 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {isSubmitting
                ? 'बिल बन रहा है...'
                : language === 'hi'
                ? 'बिल पूर्ण करें और रसीद देखें'
                : 'Confirm & View Receipt'}
            </span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
