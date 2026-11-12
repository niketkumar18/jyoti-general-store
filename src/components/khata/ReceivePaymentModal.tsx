import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, CheckCircle, Banknote, QrCode, ArrowDownLeft } from 'lucide-react';
import type { Customer, ShopSettings } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, calculateRiskLevel } from '../../utils/formatters';
import { playSuccessChime } from '../../utils/audio';
import { db } from '../../db';

interface ReceivePaymentModalProps {
  isOpen: boolean;
  customer: Customer | null;
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

  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !customer) return null;

  const currentBalance = customer.currentBalance;
  const newBalance = Math.max(0, currentBalance - (amount || 0));

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('कृपया वैध जमा राशि दर्ज करें');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedBalance = currentBalance - amount;
      const updatedRisk = calculateRiskLevel(updatedBalance, customer.creditLimit);

      if (customer.id) {
        // Update customer balance
        await db.customers.update(customer.id, {
          currentBalance: updatedBalance,
          riskLevel: updatedRisk,
          updatedAt: Date.now()
        });

        // Add CREDIT ledger entry
        await db.ledger.add({
          customerId: customer.id,
          customerName: customer.name,
          type: 'CREDIT',
          amount: amount,
          paymentMode,
          description: notes.trim() || `${paymentMode === 'CASH' ? 'नकद' : 'UPI ऑनलाइन'} भुगतान जमा किया`,
          runningBalance: updatedBalance,
          syncedToGoogle: false,
          createdAt: Date.now()
        });
      }

      if (settings.enableSound) {
        playSuccessChime();
      }
      try {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      } catch (e) {
        // ignore
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-green-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 rounded-xl">
              <ArrowDownLeft className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                रुपये जमा करें (Receive Payment)
              </h3>
              <p className="text-emerald-200 text-xs">{customer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleReceivePayment} className="p-5 space-y-4">
          {/* Current Due Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex justify-between items-center text-sm">
            <span className="text-amber-900 font-bold">वर्तमान कुल उधारी:</span>
            <span className="text-lg font-black text-rose-600">
              {formatCurrency(currentBalance)}
            </span>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              जमा की गई राशि (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400">₹</span>
              <input
                type="number"
                required
                min="1"
                max={currentBalance > 0 ? currentBalance * 2 : 100000}
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xl font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          </div>

          {/* Quick Clear Balance Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAmount(currentBalance)}
              className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg transition-all"
            >
              पूरा हिसाब चुकता करें ({formatCurrency(currentBalance)})
            </button>
            {currentBalance > 500 && (
              <button
                type="button"
                onClick={() => setAmount(Math.floor(currentBalance / 2))}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200"
              >
                आधा ({formatCurrency(Math.floor(currentBalance / 2))})
              </button>
            )}
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              भुगतान का माध्यम:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  paymentMode === 'CASH'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>नकद (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('UPI')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  paymentMode === 'UPI'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>UPI ऑनलाइन</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              टिप्पणी (Optional Note)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="उदा. Google Pay से आया / दुकान पर दिया"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
            />
          </div>

          {/* Result Banner */}
          <div className="bg-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
            <span className="text-slate-600 font-semibold">जमा के बाद शेष उधारी:</span>
            <span className="text-sm font-black text-slate-900">
              {formatCurrency(newBalance)}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'जमा हो रहा है...' : 'जमा सुरक्षित करें'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
