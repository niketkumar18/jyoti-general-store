import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  X, 
  Share2, 
  ArrowUpRight, 
  PackagePlus, 
  Calendar, 
  FileText,
  Clock,
  Building2,
  Phone,
  FileSpreadsheet,
  Plus,
  Tag,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { Vendor, VendorLedgerEntry } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { db } from '../../db';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { openWhatsAppVendorLedger } from '../../utils/whatsapp';
import { exportVendorKhataToCsv } from '../../utils/excelExport';
import { VendorPaymentModal } from './VendorPaymentModal';
import { VendorPurchaseModal } from './VendorPurchaseModal';

interface VendorLedgerModalProps {
  isOpen: boolean;
  vendor: Vendor | null;
  onClose: () => void;
}

export const VendorLedgerModal: React.FC<VendorLedgerModalProps> = ({
  isOpen,
  vendor,
  onClose
}) => {
  const { language, t } = useLanguage();
  const { settings } = useSettings();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PURCHASE' | 'PAYMENT'>('ALL');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Live query for current vendor state (so balance updates immediately)
  const currentVendor = useLiveQuery(
    () => {
      if (!vendor || !vendor.id) return Promise.resolve(null);
      return db.vendors.get(vendor.id);
    },
    [vendor?.id]
  ) || vendor;

  // Live query for ledger entries for this vendor
  const ledgerEntries = useLiveQuery(
    () => {
      if (!vendor || !vendor.id) return Promise.resolve([]);
      return db.vendorLedger
        .where('vendorId')
        .equals(vendor.id)
        .reverse()
        .sortBy('createdAt');
    },
    [vendor?.id]
  ) || [];

  if (!isOpen || !currentVendor) return null;

  const handleShareWhatsApp = () => {
    openWhatsAppVendorLedger(currentVendor, ledgerEntries, settings);
  };

  const handleExportCsv = () => {
    exportVendorKhataToCsv(currentVendor, ledgerEntries);
  };

  const filteredEntries = ledgerEntries.filter((entry) => {
    if (activeFilter === 'ALL') return true;
    return entry.type === activeFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  {currentVendor.firmName || currentVendor.name}
                </h2>
                {currentVendor.firmName && (
                  <span className="text-xs bg-indigo-900/60 text-indigo-200 border border-indigo-700/50 px-2 py-0.5 rounded-full font-semibold">
                    {currentVendor.name}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-3 mt-0.5">
                {currentVendor.mobile && (
                  <span>📞 {currentVendor.mobile}</span>
                )}
                {currentVendor.category && (
                  <span>🏷️ {currentVendor.category}</span>
                )}
                {currentVendor.address && (
                  <span className="hidden sm:inline">📍 {currentVendor.address}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="p-2 sm:px-3 sm:py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              title="CSV डाउनलोड करें"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="p-2 sm:px-3 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="WhatsApp पर हिसाब भेजें"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Balance Summary */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Current Balance (देना है) */}
            <div className="bg-white rounded-2xl border border-rose-200 p-3.5 shadow-sm">
              <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                वर्तमान बकाया (सप्लायर को देना है)
              </span>
              <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-0.5">
                {formatCurrency(currentVendor.currentBalance || 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {currentVendor.currentBalance > 0 ? '⚠️ बकाया भुगतान बाकी है' : '✅ सारा हिसाब चुकता है'}
              </p>
            </div>

            {/* Total Purchased */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                कुल माल खरीद (Total Purchases)
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {formatCurrency(currentVendor.totalPurchased || 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                कुल खरीद प्रविष्टियाँ: {ledgerEntries.filter(e => e.type === 'PURCHASE').length}
              </p>
            </div>

            {/* Total Paid */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                कुल भुगतान किया (Total Paid)
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
                {formatCurrency(currentVendor.totalPaid || 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                भुगतान प्रविष्टियाँ: {ledgerEntries.filter(e => e.type === 'PAYMENT').length}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-200/80">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  activeFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                सभी लेन-देन ({ledgerEntries.length})
              </button>
              <button
                onClick={() => setActiveFilter('PURCHASE')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  activeFilter === 'PURCHASE'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                📦 माल खरीद ({ledgerEntries.filter(e => e.type === 'PURCHASE').length})
              </button>
              <button
                onClick={() => setActiveFilter('PAYMENT')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  activeFilter === 'PAYMENT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                💰 भुगतान ({ledgerEntries.filter(e => e.type === 'PAYMENT').length})
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPurchaseModal(true)}
                className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                <span>+ नया माल खरीद</span>
              </button>

              <button
                onClick={() => setShowPaymentModal(true)}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>रुपये भुगतान करें</span>
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Entries Table / List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {filteredEntries.length > 0 ? (
            <div className="space-y-3">
              {filteredEntries.map((entry) => {
                const isPurchase = entry.type === 'PURCHASE';
                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-3.5 sm:p-4 shadow-sm transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* Left: Type badge + Description */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isPurchase
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isPurchase ? (
                            <PackagePlus className="w-5 h-5" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                                isPurchase
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isPurchase ? '📦 माल खरीद' : '💰 भुगतान'}
                            </span>
                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(entry.createdAt)}
                            </span>
                            {entry.paymentMode && (
                              <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.2 font-semibold rounded">
                                {entry.paymentMode === 'CASH' ? 'नकद' : entry.paymentMode === 'UPI' ? 'UPI' : 'बैंक'}
                              </span>
                            )}
                            {entry.billNumber && (
                              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.2 rounded font-medium">
                                बिल #{entry.billNumber}
                              </span>
                            )}
                          </div>

                          {/* Item or description */}
                          <div className="mt-1">
                            {isPurchase && entry.itemName ? (
                              <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                                {entry.itemName}{' '}
                                {entry.quantity && entry.unit && (
                                  <span className="text-indigo-700 font-black">
                                    ({entry.quantity} {entry.unit})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="font-extrabold text-slate-900 text-sm">
                                {entry.description || 'सप्लायर भुगतान'}
                              </div>
                            )}
                            {entry.referenceNo && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                UTR / Ref: {entry.referenceNo}
                              </div>
                            )}
                            {isPurchase && entry.description && entry.description !== entry.itemName && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                {entry.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amounts & Remaining Balance */}
                      <div className="text-left sm:text-right shrink-0 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl sm:rounded-none">
                        <div className="text-xs text-slate-500 font-semibold">
                          {isPurchase ? 'कुल खरीद लागत' : 'भुगतान राशि'}
                        </div>
                        <div
                          className={`text-lg sm:text-xl font-black ${
                            isPurchase ? 'text-indigo-950' : 'text-emerald-700'
                          }`}
                        >
                          {formatCurrency(entry.amount)}
                        </div>

                        {/* If purchase had partial paid & remaining due */}
                        {isPurchase && (
                          <div className="text-xs space-y-0.5 mt-0.5">
                            <span className="text-emerald-700 font-bold mr-2">
                              दिया: {formatCurrency(entry.paidAmount || 0)}
                            </span>
                            {(entry.dueAmount || 0) > 0 && (
                              <span className="text-rose-600 font-extrabold">
                                बाकी: {formatCurrency(entry.dueAmount || 0)}
                              </span>
                            )}
                          </div>
                        )}

                        {typeof entry.balanceAfter === 'number' && (
                          <div className="text-[11px] text-slate-500 font-medium mt-1">
                            कुल बकाया: <span className="font-bold text-slate-700">{formatCurrency(entry.balanceAfter)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-600">कोई लेन-देन नहीं मिला</p>
              <p className="text-xs text-slate-400 mt-1">
                इस सप्लायर से नया माल खरीद या भुगतान दर्ज करें।
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            सप्लायर खाता - कुल प्रविष्टियाँ: <span className="font-bold text-slate-800">{ledgerEntries.length}</span>
          </div>
          <button
            onClick={onClose}
            className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all"
          >
            बंद करें (Close)
          </button>
        </div>
      </div>

      {/* Submodals */}
      <VendorPurchaseModal
        isOpen={showPurchaseModal}
        initialVendorId={currentVendor.id}
        onClose={() => setShowPurchaseModal(false)}
      />

      <VendorPaymentModal
        isOpen={showPaymentModal}
        vendor={currentVendor}
        onClose={() => setShowPaymentModal(false)}
      />
    </div>
  );
};
