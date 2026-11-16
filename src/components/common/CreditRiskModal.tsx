import React from 'react';
import { AlertTriangle, X, ShieldAlert, CheckCircle, Ban } from 'lucide-react';
import type { Customer } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../utils/formatters';

interface CreditRiskModalProps {
  isOpen: boolean;
  customer: Customer;
  requestedCredit: number;
  onProceed: () => void;
  onCancel: () => void;
}

export const CreditRiskModal: React.FC<CreditRiskModalProps> = ({
  isOpen,
  customer,
  requestedCredit,
  onProceed,
  onCancel
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const currentDue = customer.currentBalance;
  const creditLimit = customer.creditLimit;
  const projectedDue = currentDue + requestedCredit;
  const overLimitBy = projectedDue - creditLimit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-500 max-w-lg w-full overflow-hidden scale-100 transition-all flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <ShieldAlert className="w-7 h-7 text-white animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-lg sm:text-xl leading-tight">
                {t('risk_warning_title')}
              </h3>
              <p className="text-red-100 text-xs sm:text-sm">
                {t('risk_warning_desc')}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-slate-800 text-sm sm:text-base">
            <p className="font-medium text-red-900 mb-2">
              ⚠️ <span className="font-bold">{customer.name}</span> की उधारी सीमा ({formatCurrency(creditLimit)}) पहले ही पार हो चुकी है!
            </p>
            <p className="text-xs text-red-700">
              यह ग्राहक <strong>रेड जोन (High Risk)</strong> में है। अतिरिक्त उधार देने पर वसूली में जोखिम हो सकता है।
            </p>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">{t('credit_limit_label')}</div>
              <div className="text-base font-bold text-slate-800">{formatCurrency(creditLimit)}</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">{t('current_due_label')}</div>
              <div className="text-base font-bold text-red-600">{formatCurrency(currentDue)}</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">{t('new_bill_amount')}</div>
              <div className="text-base font-bold text-amber-600">+{formatCurrency(requestedCredit)}</div>
            </div>

            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
              <div className="text-xs text-rose-700 font-medium">{t('total_after_bill')}</div>
              <div className="text-base font-extrabold text-rose-700">{formatCurrency(projectedDue)}</div>
            </div>
          </div>

          <div className="text-xs text-red-600 font-semibold text-center">
            सीमा से अधिक उधारी (Over-limit): {formatCurrency(overLimitBy > 0 ? overLimitBy : 0)}
          </div>

          <p className="text-center font-bold text-slate-800 text-sm pt-1">
            {t('risk_warning_question')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 sm:gap-3 shrink-0 sticky bottom-0 z-10">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Ban className="w-5 h-5 text-red-500" />
            <span>{t('cancel_and_collect_cash')}</span>
          </button>

          <button
            onClick={onProceed}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{t('proceed_anyway')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
