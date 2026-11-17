import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  CheckCircle, 
  Banknote, 
  QrCode, 
  Building2, 
  ArrowUpRight,
  Receipt,
  Wallet
} from 'lucide-react';
import type { Vendor } from '../../types';
import { db } from '../../db';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency } from '../../utils/formatters';
import { playSuccessChime } from '../../utils/audio';

interface VendorPaymentModalProps {
  isOpen: boolean;
  vendor: Vendor | null;
  onClose: () => void;
  onPaymentComplete?: (newBalance: number) => void;
}

export const VendorPaymentModal: React.FC<VendorPaymentModalProps> = ({
  isOpen,
  vendor,
  onClose,
  onPaymentComplete
}) => {
  const { language, t } = useLanguage();
  const { settings } = useSettings();

  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK'>('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vendor) {
      // Suggest full clearing or remaining balance if positive
      if (vendor.currentBalance > 0) {
        setAmount(vendor.currentBalance);
      } else {
        setAmount('');
      }
      setPaymentMode('CASH');
      setReferenceNo('');
      setNotes('');
    }
  }, [vendor, isOpen]);

  if (!isOpen || !vendor) return null;

  const currentBalance = vendor.currentBalance || 0;
  const numAmount = typeof amount === 'number' && amount > 0 ? amount : 0;
  const balanceAfter = Math.max(0, currentBalance - numAmount);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      alert('कृपया वैध भुगतान राशि दर्ज करें (Enter a valid amount)');
      return;
    }

    if (!vendor.id) return;

    setIsSubmitting(true);
    try {
      const updatedBalance = Math.max(0, currentBalance - numAmount);
      const updatedTotalPaid = (vendor.totalPaid || 0) + numAmount;

      // 1. Update vendor record
      await db.vendors.update(vendor.id, {
        currentBalance: updatedBalance,
        totalPaid: updatedTotalPaid,
        updatedAt: Date.now()
      });

      // 2. Add entry to db.vendorLedger
      const vendorDisplayName = vendor.firmName 
        ? `${vendor.firmName} (${vendor.name})` 
        : vendor.name;

      const desc = notes.trim() || 
        `${paymentMode === 'CASH' ? 'नकद' : paymentMode === 'UPI' ? 'UPI ऑनलाइन' : 'बैंक ट्रांसफर'} भुगतान किया गया`;

      await db.vendorLedger.add({
        vendorId: vendor.id,
        vendorName: vendorDisplayName,
        type: 'PAYMENT',
        amount: numAmount,
        paidAmount: numAmount,
        balanceAfter: updatedBalance,
        paymentMode,
        referenceNo: referenceNo.trim() || undefined,
        description: desc,
        createdAt: Date.now()
      });

      if (settings.enableSound) {
        playSuccessChime();
      }
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch (err) {
        // ignore
      }

      if (onPaymentComplete) {
        onPaymentComplete(updatedBalance);
      }
      onClose();
    } catch (err) {
      console.error('Failed to record vendor payment:', err);
      alert('सप्लायर भुगतान दर्ज करने में त्रुटि हुई');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">सप्लायर को भुगतान (Pay Vendor)</h2>
              <p className="text-xs text-blue-100 font-medium">महाजन उधारी चुकता करें</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handlePay} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Vendor Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  सप्लायर / महाजन
                </p>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {vendor.firmName || vendor.name}
                </h3>
                {vendor.firmName && (
                  <p className="text-xs text-slate-600 font-medium">मालिक: {vendor.name}</p>
                )}
                {vendor.mobile && (
                  <p className="text-xs text-slate-500 mt-0.5">📞 {vendor.mobile}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                  वर्तमान बकाया (देना है)
                </span>
                <span className="text-xl font-black text-rose-600">
                  {formatCurrency(currentBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Pay Buttons */}
          {currentBalance > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">त्वरित चयन (Quick Select):</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAmount(currentBalance)}
                  className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all ${
                    amount === currentBalance
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  पूरा हिसाब चुकता ({formatCurrency(currentBalance)})
                </button>
                {[500, 1000, 2000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-all ${
                      amount === preset
                        ? 'bg-slate-800 text-white border-slate-800'
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
              भुगतान राशि (Amount to Pay) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-lg font-black text-slate-400">₹</span>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                  setAmount(isNaN(val as number) ? '' : val);
                }}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2.5 text-2xl font-black text-slate-900 bg-white border-2 border-slate-300 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Balance Preview */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">
              भुगतान के बाद शेष बकाया (Remaining Due):
            </span>
            <span className="text-base font-black text-blue-950">
              {formatCurrency(balanceAfter)}
            </span>
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
              भुगतान माध्यम (Payment Mode)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={`py-2.5 px-3 rounded-2xl border-2 font-black text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMode === 'CASH'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span>नकद (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('UPI')}
                className={`py-2.5 px-3 rounded-2xl border-2 font-black text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMode === 'UPI'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <QrCode className="w-5 h-5 text-blue-600" />
                <span>ऑनलाइन (UPI)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('BANK')}
                className={`py-2.5 px-3 rounded-2xl border-2 font-black text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMode === 'BANK'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>बैंक ट्रांसफर</span>
              </button>
            </div>
          </div>

          {/* Reference / UTR Number (if UPI or BANK) */}
          {(paymentMode === 'UPI' || paymentMode === 'BANK') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                UTR / संदर्भ संख्या / चेक नंबर (वैकल्पिक)
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="उदा. UTR12345678"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              विवरण / नोट (वैकल्पिक)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="उदा. चीनी बिल का भुगतान, नकद दिया"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !numAmount || numAmount <= 0}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 active:scale-98 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle className="w-5 h-5" />
              <span>
                {isSubmitting ? 'भुगतान दर्ज हो रहा है...' : `₹${numAmount.toLocaleString('en-IN')} का भुगतान दर्ज करें`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
