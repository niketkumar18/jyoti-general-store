import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  X, 
  Share2, 
  ArrowDownLeft, 
  Receipt, 
  Calendar, 
  FileText,
  Clock
} from 'lucide-react';
import type { Customer } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { db } from '../../db';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { CreditBadge } from '../common/CreditBadge';
import { openWhatsAppReminder } from '../../utils/whatsapp';
import { ReceivePaymentModal } from './ReceivePaymentModal';

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

  // Live updated customer record
  const currentCustomer = useLiveQuery(
    () => {
      if (!customer || !customer.id) return Promise.resolve(null);
      return db.customers.get(customer.id);
    },
    [customer?.id]
  ) || customer;

  if (!isOpen || !currentCustomer) return null;

  const handleSendReminder = () => {
    openWhatsAppReminder(currentCustomer, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-4 sm:p-5 flex items-center justify-between">
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
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow flex items-center justify-center gap-1.5 transition-all"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>{t('receive_payment')}</span>
            </button>
          </div>
        </div>

        {/* Chronological Ledger Table */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>खाता विवरण इतिहास (Ledger Transactions)</span>
            </h4>
            <span className="text-xs text-slate-500">{ledgerEntries.length} प्रविष्टियां</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-2.5">{t('date_col')}</th>
                  <th className="p-2.5">{t('bill_desc_col')}</th>
                  <th className="p-2.5 text-right">{t('debit_col')}</th>
                  <th className="p-2.5 text-right">{t('credit_col')}</th>
                  <th className="p-2.5 text-right">{t('running_bal_col')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerEntries.length > 0 ? (
                  ledgerEntries.map((entry) => {
                    const isDebit = entry.type === 'DEBIT';
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 text-slate-600 text-xs whitespace-nowrap">
                          {formatDateTime(entry.createdAt, language)}
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-800">
                            {entry.description}
                          </div>
                          {entry.invoiceNumber && (
                            <div className="text-[10px] text-emerald-700 font-mono">
                              #{entry.invoiceNumber}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-bold text-rose-600">
                          {isDebit ? formatCurrency(entry.amount) : '—'}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-600">
                          {!isDebit ? formatCurrency(entry.amount) : '—'}
                        </td>
                        <td className="p-2.5 text-right font-extrabold text-slate-900">
                          {formatCurrency(entry.runningBalance)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                      कोई पूर्व खाता लेन-देन उपलब्ध नहीं है।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 justify-between items-center">
          <button
            onClick={handleSendReminder}
            className="w-full sm:w-auto py-2 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('send_reminder_whatsapp')}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto py-2 px-4 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100"
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
    </div>
  );
};
