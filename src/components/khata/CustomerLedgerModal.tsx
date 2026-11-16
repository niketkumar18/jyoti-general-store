import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  X, 
  Share2, 
  ArrowDownLeft, 
  Receipt, 
  Calendar, 
  FileText,
  Clock,
  ShoppingBag,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import type { Customer, Invoice, InvoiceItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { db } from '../../db';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { CreditBadge } from '../common/CreditBadge';
import { openWhatsAppReminder } from '../../utils/whatsapp';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { InvoiceViewModal } from '../bill/InvoiceViewModal';

interface CustomerLedgerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  isOpen,
  customer,
  onClose
}) => {
  const { language, t } = useLanguage();
  const { settings } = useSettings();
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'INVOICES'>('LEDGER');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Live Query customer ledger entries sorted chronologically
  const ledgerEntries = useLiveQuery(
    () => {
      if (!customer || !customer.id) return Promise.resolve([]);
      return db.ledger
        .where('customerId')
        .equals(customer.id)
        .reverse()
        .sortBy('createdAt');
    },
    [customer?.id]
  ) || [];

  // Live Query customer invoices
  const customerInvoices = useLiveQuery(
    () => {
      if (!customer || !customer.id) return Promise.resolve([]);
      return db.invoices
        .where('customerId')
        .equals(customer.id)
        .reverse()
        .sortBy('createdAt');
    },
    [customer?.id]
  ) || [];

  // Live updated customer record
  const currentCustomer = useLiveQuery(
    () => {
      if (!customer || !customer.id) return Promise.resolve(null);
      return db.customers.get(customer.id);
    },
    [customer?.id]
  ) || customer;

  // Invoice lookup map by invoiceId or invoiceNumber
  const invoiceMap = useMemo(() => {
    const map = new Map<string | number, Invoice>();
    customerInvoices.forEach((inv) => {
      if (inv.id) map.set(inv.id, inv);
      if (inv.invoiceNumber) map.set(inv.invoiceNumber, inv);
    });
    return map;
  }, [customerInvoices]);

  if (!isOpen || !currentCustomer) return null;

  const handleSendReminder = () => {
    openWhatsAppReminder(currentCustomer, settings);
  };

  const handleViewInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
  };

  const handleViewLedgerBill = (entry: any) => {
    // Check if matched invoice exists in map
    let inv: Invoice | undefined;
    if (entry.billId && invoiceMap.has(entry.billId)) {
      inv = invoiceMap.get(entry.billId);
    } else if (entry.invoiceNumber && invoiceMap.has(entry.invoiceNumber)) {
      inv = invoiceMap.get(entry.invoiceNumber);
    }

    if (inv) {
      setSelectedInvoice(inv);
      return;
    }

    // Construct fallback invoice object from ledger data
    const fallbackItems: InvoiceItem[] = entry.items && entry.items.length > 0
      ? entry.items
      : [
          {
            itemId: 0,
            nameEn: entry.description || 'Kirana Items',
            nameHi: entry.description || 'किराना सामान',
            unit: 'PACKET',
            quantity: 1,
            unitPrice: entry.amount,
            total: entry.amount
          }
        ];

    const fallbackInvoice: Invoice = {
      id: entry.billId || entry.id,
      invoiceNumber: entry.invoiceNumber || `BILL-${entry.id}`,
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      customerMobile: currentCustomer.mobile,
      items: fallbackItems,
      subtotal: entry.amount,
      discount: 0,
      grandTotal: entry.amount,
      paidAmount: 0,
      dueAmount: entry.amount,
      paymentMethod: 'CREDIT',
      syncedToGoogle: entry.syncedToGoogle || false,
      createdAt: entry.createdAt
    };

    setSelectedInvoice(fallbackInvoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg sm:text-xl">
                {currentCustomer.name}
              </h3>
              <CreditBadge riskLevel={currentCustomer.riskLevel} />
            </div>
            <p className="text-emerald-200 text-xs sm:text-sm mt-0.5">
              📞 {currentCustomer.mobile} {currentCustomer.address ? `• ${currentCustomer.address}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Khata Balance Summary Cards */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">कुल बकाया (Due)</span>
            <div className="text-xl font-black text-rose-600 mt-0.5">
              {formatCurrency(currentCustomer.currentBalance)}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">उधारी सीमा (Limit)</span>
            <div className="text-xl font-black text-slate-800 mt-0.5">
              {formatCurrency(currentCustomer.creditLimit)}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
            <button
              onClick={() => setShowReceiveModal(true)}
              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>{t('receive_payment')}</span>
            </button>
          </div>
        </div>

        {/* Tabs: Ledger vs Invoices History */}
        <div className="px-4 pt-3 pb-1 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'LEDGER'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>खाता बही (उधार/जमा)</span>
              <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {ledgerEntries.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('INVOICES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'INVOICES'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-700" />
              <span>दुकान के सभी बिल (Invoices)</span>
              <span className="bg-emerald-700 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {customerInvoices.length}
              </span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500 hidden sm:inline">
            {activeTab === 'LEDGER' ? 'सामान व उधारी का विवरण' : 'बिल रसीद व प्रिंट'}
          </span>
        </div>

        {/* Tab Content: Ledger */}
        {activeTab === 'LEDGER' && (
          <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0">
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs sm:text-sm min-w-[580px]">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 sm:p-3 w-28">{t('date_col')}</th>
                    <th className="p-2.5 sm:p-3">विवरण एवं खरीदा गया सामान (Purchased Items)</th>
                    <th className="p-2.5 sm:p-3 text-right text-rose-700">{t('debit_col')}</th>
                    <th className="p-2.5 sm:p-3 text-right text-emerald-700">{t('credit_col')}</th>
                    <th className="p-2.5 sm:p-3 text-right">{t('running_bal_col')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerEntries.length > 0 ? (
                    ledgerEntries.map((entry) => {
                      const isDebit = entry.type === 'DEBIT';
                      
                      // Look up items from entry or matched invoice
                      let itemsToDisplay: InvoiceItem[] = [];
                      if (entry.items && entry.items.length > 0) {
                        itemsToDisplay = entry.items;
                      } else {
                        const matchedInv = (entry.billId && invoiceMap.get(entry.billId)) ||
                          (entry.invoiceNumber && invoiceMap.get(entry.invoiceNumber));
                        if (matchedInv && matchedInv.items) {
                          itemsToDisplay = matchedInv.items;
                        }
                      }

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Date & Time */}
                          <td className="p-2.5 sm:p-3 text-slate-600 text-xs align-top whitespace-nowrap">
                            <div className="font-semibold text-slate-800">
                              {new Date(entry.createdAt).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                {new Date(entry.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </td>

                          {/* Description & Itemized Products */}
                          <td className="p-2.5 sm:p-3 align-top">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-slate-900">
                                {entry.description}
                              </span>
                              {entry.invoiceNumber && (
                                <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                  #{entry.invoiceNumber}
                                </span>
                              )}
                            </div>

                            {/* Itemized purchased products display */}
                            {itemsToDisplay.length > 0 ? (
                              <div className="mt-2 space-y-1.5">
                                <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                                  <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                                  <span>खरीदा गया सामान ({itemsToDisplay.length} प्रकार के आइटम):</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {itemsToDisplay.map((it, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100/70 border border-amber-200/90 text-amber-950 px-2 py-1 rounded-lg text-xs font-medium shadow-2xs"
                                    >
                                      <span className="font-bold text-slate-900">
                                        {it.nameHi || it.nameEn}
                                      </span>
                                      <span className="bg-amber-200/70 text-amber-900 px-1.5 py-0.2 rounded font-bold text-[10px]">
                                        {it.quantity} {it.unit}
                                      </span>
                                      <span className="text-amber-800 font-semibold text-[11px]">
                                        @ ₹{it.unitPrice} = ₹{Math.round(it.total)}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : entry.itemsSummary ? (
                              <div className="mt-1.5 text-xs text-amber-900 bg-amber-50 border border-amber-200/80 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                <ShoppingBag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="font-medium">सामान: {entry.itemsSummary}</span>
                              </div>
                            ) : null}

                            {/* View Bill Button */}
                            {isDebit && (
                              <div className="mt-2">
                                <button
                                  onClick={() => handleViewLedgerBill(entry)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                                >
                                  <Receipt className="w-3 h-3 text-emerald-600" />
                                  <span>🧾 पूरी बिल रसीद देखें (View Bill / PDF)</span>
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Debit */}
                          <td className="p-2.5 sm:p-3 text-right font-black text-rose-600 align-top text-xs sm:text-sm whitespace-nowrap">
                            {isDebit ? formatCurrency(entry.amount) : '—'}
                          </td>

                          {/* Credit */}
                          <td className="p-2.5 sm:p-3 text-right font-black text-emerald-600 align-top text-xs sm:text-sm whitespace-nowrap">
                            {!isDebit ? (
                              <div>
                                <div>{formatCurrency(entry.amount)}</div>
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded font-normal">
                                  रुपये जमा
                                </span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>

                          {/* Running Balance */}
                          <td className="p-2.5 sm:p-3 text-right font-black text-slate-900 align-top text-xs sm:text-sm whitespace-nowrap">
                            {formatCurrency(entry.runningBalance)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                        कोई पूर्व खाता लेन-देन उपलब्ध नहीं है।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: Invoices History */}
        {activeTab === 'INVOICES' && (
          <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0">
            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
              <table className="w-full text-left text-xs sm:text-sm min-w-[580px]">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 sm:p-3">बिल # एवं तारीख</th>
                    <th className="p-2.5 sm:p-3">सामान विवरण (Items)</th>
                    <th className="p-2.5 sm:p-3 text-right">कुल बिल (Total)</th>
                    <th className="p-2.5 sm:p-3 text-right">जमा (Paid)</th>
                    <th className="p-2.5 sm:p-3 text-right text-rose-600">उधार (Due)</th>
                    <th className="p-2.5 sm:p-3 text-center">कार्रवाई</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerInvoices.length > 0 ? (
                    customerInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 sm:p-3 align-top whitespace-nowrap">
                          <div className="font-extrabold text-emerald-800 font-mono">
                            #{inv.invoiceNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {formatDateTime(inv.createdAt, language)}
                          </div>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 inline-block mt-1">
                            {inv.paymentMethod}
                          </span>
                        </td>

                        <td className="p-2.5 sm:p-3 align-top">
                          <div className="text-xs font-semibold text-slate-800">
                            {inv.items.length} आइटम्स:
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {inv.items.map((it, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded font-medium"
                              >
                                {it.nameHi || it.nameEn} ({it.quantity} {it.unit})
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="p-2.5 sm:p-3 text-right font-black text-slate-900 align-top">
                          {formatCurrency(inv.grandTotal)}
                        </td>

                        <td className="p-2.5 sm:p-3 text-right font-bold text-emerald-700 align-top">
                          {formatCurrency(inv.paidAmount)}
                        </td>

                        <td className="p-2.5 sm:p-3 text-right font-bold text-rose-600 align-top">
                          {inv.dueAmount > 0 ? formatCurrency(inv.dueAmount) : '—'}
                        </td>

                        <td className="p-2.5 sm:p-3 text-center align-top">
                          <button
                            onClick={() => handleViewInvoiceDetails(inv)}
                            className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-2xs flex items-center gap-1 mx-auto transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>देखें / पर्ची</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                        इस ग्राहक का कोई बिल इतिहास नहीं मिला।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 justify-between items-center shrink-0 sticky bottom-0 z-10">
          <button
            onClick={handleSendReminder}
            className="w-full sm:w-auto py-2 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('send_reminder_whatsapp')}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2 px-4 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            बंद करें
          </button>
        </div>
      </div>

      {/* Quick Receive Payment Modal */}
      <ReceivePaymentModal
        isOpen={showReceiveModal}
        customer={currentCustomer}
        onClose={() => setShowReceiveModal(false)}
      />

      {/* Printable Thermal Receipt / PDF / WhatsApp Invoice View Modal */}
      {selectedInvoice && (
        <InvoiceViewModal
          isOpen={!!selectedInvoice}
          invoice={selectedInvoice}
          customerTotalBalance={currentCustomer.currentBalance}
          onClose={() => setSelectedInvoice(null)}
          onStartNewBill={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};
