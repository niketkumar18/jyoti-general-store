import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { 
  X, 
  CheckCircle, 
  Banknote, 
  QrCode, 
  ArrowDownLeft, 
  Search, 
  User, 
  Phone, 
  Users,
  RefreshCw,
  Plus
} from 'lucide-react';
import type { Customer, ShopSettings } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, calculateRiskLevel } from '../../utils/formatters';
import { playSuccessChime } from '../../utils/audio';
import { db } from '../../db';
import { syncTwoWay, syncPendingToGoogleSheets } from '../../utils/googleSheetsSync';
import { CustomerFormModal } from './CustomerFormModal';

interface ReceivePaymentModalProps {
  isOpen: boolean;
  customer?: Customer | null;
  onClose: () => void;
  onPaymentReceived?: (newBalance: number) => void;
}

export const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({
  isOpen,
  customer,
  onClose,
  onPaymentReceived
}) => {
  const { language, t } = useLanguage();
  const { settings } = useSettings();

  const allCustomers = useLiveQuery(() => db.customers.toArray()) || [];

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);

  // Initialize or update selected customer when prop changes
  useEffect(() => {
    if (isOpen) {
      if (customer) {
        setSelectedCustomer(customer);
        if (customer.currentBalance > 0) {
          setAmount(customer.currentBalance);
        } else {
          setAmount('');
        }
      } else {
        setSelectedCustomer(null);
        setAmount('');
      }
      setCustomerSearchQuery('');
      setPaymentMode('CASH');
      setNotes('');
    }
  }, [customer, isOpen]);

  // When selected customer changes
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    if (c.currentBalance > 0) {
      setAmount(c.currentBalance);
    } else {
      setAmount('');
    }
  };

  // Filtered customer list for search
  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    const sorted = [...allCustomers].sort((a, b) => {
      // Prioritize customers with pending dues
      if (b.currentBalance !== a.currentBalance) {
        return b.currentBalance - a.currentBalance;
      }
      return a.name.localeCompare(b.name);
    });

    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [allCustomers, customerSearchQuery]);

  if (!isOpen) return null;

  const currentBalance = selectedCustomer?.currentBalance || 0;
  const numAmount = typeof amount === 'number' && amount > 0 ? amount : 0;
  const newBalance = Math.max(0, currentBalance - numAmount);

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedCustomer.id) {
      alert('कृपया पहले ग्राहक का चयन करें');
      return;
    }

    if (!numAmount || numAmount <= 0) {
      alert('कृपया वैध जमा राशि दर्ज करें');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedBalance = currentBalance - numAmount;
      const updatedRisk = calculateRiskLevel(updatedBalance, selectedCustomer.creditLimit);

      // 1. Update customer balance in IndexedDB
      await db.customers.update(selectedCustomer.id, {
        currentBalance: updatedBalance,
        riskLevel: updatedRisk,
        updatedAt: Date.now()
      });

      // 2. Add CREDIT ledger entry
      await db.ledger.add({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        type: 'CREDIT',
        amount: numAmount,
        paymentMode,
        description: notes.trim() || `${paymentMode === 'CASH' ? 'नकद' : 'UPI ऑनलाइन'} भुगतान जमा किया`,
        runningBalance: updatedBalance,
        syncedToGoogle: false,
        createdAt: Date.now()
      });

      // 3. Instant 2-way sync to Google Sheets
      if (settings.googleSheetsUrl) {
        syncTwoWay(settings.googleSheetsUrl, settings.googleSheetDocumentUrl)
          .catch((e) => console.error('Real-time Google Sheets sync error:', e));
      }

      if (settings.enableSound) {
        playSuccessChime();
      }
      try {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      } catch (e) {}

      if (onPaymentReceived) onPaymentReceived(updatedBalance);
      onClose();
    } catch (err) {
      console.error('Failed to log payment:', err);
      alert('भुगतान दर्ज करने में त्रुटि हुई');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-xl">
              <ArrowDownLeft className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                पेमेंट-इन (रुपये जमा करें)
              </h3>
              <p className="text-emerald-200 text-xs">
                {selectedCustomer ? `ग्राहक: ${selectedCustomer.name}` : 'ग्राहक का चयन करें'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* STEP 1: CUSTOMER SELECTION (If no customer selected) */}
          {!selectedCustomer ? (
            <div className="p-4 sm:p-5 flex-1 min-h-0 flex flex-col space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  किस ग्राहक से रुपये प्राप्त हुए? (Select Customer)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    autoFocus
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="ग्राहक का नाम या मोबाइल नंबर खोजें..."
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Quick Add Customer inline link */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="text-slate-500 font-medium">
                  {customerSearchQuery ? 'खोज परिणाम' : 'उधारी वाले ग्राहक पहले:'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  className="text-emerald-700 hover:text-emerald-800 font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ नया ग्राहक जोड़ें</span>
                </button>
              </div>

              {/* Customer List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl p-1 bg-slate-50/50">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => {
                    const hasDue = c.currentBalance > 0;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-3 hover:bg-white rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ${
                            hasDue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {c.name.slice(0, 1)}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                            <p className="text-xs text-slate-500">📞 {c.mobile}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          {hasDue ? (
                            <>
                              <span className="text-xs font-black text-rose-600 block">
                                {formatCurrency(c.currentBalance)}
                              </span>
                              <span className="text-[10px] text-rose-700 font-bold">उधार बाकी</span>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              चुकता (₹0)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    कोई ग्राहक नहीं मिला। ऊपर '+ नया ग्राहक जोड़ें' पर क्लिक करें।
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STEP 2: PAYMENT FORM (When customer IS selected) */
            <form onSubmit={handleReceivePayment} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
                {/* Selected Customer Card with "बदलें" button */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-emerald-700" />
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {selectedCustomer.name}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">📞 {selectedCustomer.mobile}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="py-1.5 px-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-indigo-700 flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="दूसरा ग्राहक चुनें"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ग्राहक बदलें</span>
                  </button>
                </div>

                {/* Current Due Banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex justify-between items-center text-sm">
                  <span className="text-amber-900 font-bold text-xs uppercase tracking-wider">
                    वर्तमान कुल उधारी (बाकी):
                  </span>
                  <span className="text-xl font-black text-rose-600">
                    {formatCurrency(currentBalance)}
                  </span>
                </div>

                {/* Quick Preset Buttons */}
                {currentBalance > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 block">
                      त्वरित चयन (Quick Amount):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAmount(currentBalance)}
                        className={`text-xs font-black px-2.5 py-1 rounded-xl border transition-all ${
                          amount === currentBalance
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        पूरा हिसाब ({formatCurrency(currentBalance)})
                      </button>
                      {[100, 200, 500, 1000, 2000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(preset)}
                          className={`text-xs font-bold px-2 py-1 rounded-xl border transition-all ${
                            amount === preset
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          ₹{preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    जमा की जाने वाली राशि (Amount Received) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-xl font-black text-slate-400">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      autoFocus
                      value={amount}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                        setAmount(isNaN(val as number) ? '' : val);
                      }}
                      placeholder="0.00"
                      className="w-full pl-9 pr-4 py-2.5 text-2xl font-black text-slate-900 bg-white border-2 border-slate-300 rounded-2xl focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Remaining Balance Preview */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900">
                    जमा के बाद शेष उधारी (Remaining Due):
                  </span>
                  <span className="text-base font-black text-emerald-950">
                    {formatCurrency(newBalance)}
                  </span>
                </div>

                {/* Payment Mode Selector */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    भुगतान का प्रकार (Mode)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('CASH')}
                      className={`p-2.5 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                        paymentMode === 'CASH'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>नकद (Cash)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMode('UPI')}
                      className={`p-2.5 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                        paymentMode === 'UPI'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      <span>ऑनलाइन (UPI QR)</span>
                    </button>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    टिप्पणी / विवरण (Optional Note)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="उदा. बकाया राशि से ₹500 जमा किए"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Sticky Submit Footer */}
              <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-4 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  रद्द करें
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !numAmount || numAmount <= 0}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 active:scale-98 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {isSubmitting ? 'जमा हो रहा है...' : `₹${numAmount.toLocaleString('en-IN')} जमा दर्ज करें`}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Quick Add Customer Submodal */}
      <CustomerFormModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
      />
    </div>
  );
};
