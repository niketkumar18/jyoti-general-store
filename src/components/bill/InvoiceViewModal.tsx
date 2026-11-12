import React from 'react';
import { 
  Printer, 
  Share2, 
  Download, 
  X, 
  CheckCircle, 
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import type { Invoice, Customer, ShopSettings } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { openWhatsAppBill } from '../../utils/whatsapp';
import { generateInvoicePdf } from '../../utils/pdfGenerator';

interface InvoiceViewModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  customerTotalBalance?: number;
  onClose: () => void;
  onStartNewBill: () => void;
}

export const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({
  isOpen,
  invoice,
  customerTotalBalance,
  onClose,
  onStartNewBill
}) => {
  const { language, t } = useLanguage();
  const { settings } = useSettings();

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    generateInvoicePdf(invoice, settings, customerTotalBalance);
  };

  const handleWhatsApp = () => {
    openWhatsAppBill(invoice, settings, customerTotalBalance);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-emerald-300" />
            <div>
              <h3 className="font-extrabold text-base">
                {language === 'hi' ? 'बिल सफलतापूर्वक बन गया!' : 'Invoice Generated!'}
              </h3>
              <p className="text-emerald-200 text-xs">
                #{invoice.invoiceNumber} • {formatDateTime(invoice.createdAt, language)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Visual Preview */}
        <div className="p-4 bg-slate-100 overflow-y-auto flex-1 flex justify-center">
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 sm:p-5 w-full max-w-xs text-xs font-mono text-slate-800 space-y-3 print:shadow-none print:border-none print:w-full">
            {/* Shop Header */}
            <div className="text-center space-y-0.5">
              <h4 className="font-black text-sm text-slate-950 uppercase tracking-wide">
                {settings.shopName}
              </h4>
              <p className="text-[10px] text-slate-500">{settings.tagline}</p>
              <p className="text-[10px] text-slate-600">{settings.address}</p>
              <p className="text-[10px] text-slate-600">फोन: {settings.mobile}</p>
              {settings.gstin && (
                <p className="text-[10px] text-slate-600">GST: {settings.gstin}</p>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between text-[11px]">
              <span>बिल #{invoice.invoiceNumber}</span>
              <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
            </div>

            {invoice.customerName && (
              <div className="flex justify-between text-[11px] font-bold">
                <span>ग्राहक: {invoice.customerName}</span>
                {invoice.customerMobile && <span>{invoice.customerMobile}</span>}
              </div>
            )}

            {/* Items Table */}
            <div className="border-t border-dashed border-slate-300 pt-2 space-y-1.5">
              <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500 border-b border-slate-200 pb-1">
                <span className="w-1/2">सामान</span>
                <span className="w-1/4 text-center">मात्रा</span>
                <span className="w-1/4 text-right">रुपये</span>
              </div>

              {invoice.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px]">
                  <span className="w-1/2 truncate font-medium">
                    {item.nameHi || item.nameEn}
                  </span>
                  <span className="w-1/4 text-center text-slate-600">
                    {item.quantity} {item.unit}
                  </span>
                  <span className="w-1/4 text-right font-bold">
                    {Math.round(item.total)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>कुल जोड़ (Subtotal):</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-[11px] text-emerald-700">
                  <span>छूट (Discount):</span>
                  <span>-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm border-t border-slate-900 pt-1 text-slate-950">
                <span>कुल देय (Total):</span>
                <span>{formatCurrency(invoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>जमा भुगतान ({invoice.paymentMethod}):</span>
                <span>{formatCurrency(invoice.paidAmount)}</span>
              </div>
              {invoice.dueAmount > 0 && (
                <div className="flex justify-between text-[11px] font-bold text-rose-700">
                  <span>इस बिल का उधार:</span>
                  <span>{formatCurrency(invoice.dueAmount)}</span>
                </div>
              )}
              {typeof customerTotalBalance === 'number' && (
                <div className="flex justify-between text-[11px] font-bold bg-amber-50 p-1 rounded text-amber-900">
                  <span>कुल शेष उधारी बकाया:</span>
                  <span>{formatCurrency(customerTotalBalance)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[10px] text-slate-500 space-y-0.5">
              <p>🙏 धन्यवाद! फिर पधारें 🙏</p>
              <p className="text-[9px] text-slate-400">Powered by DEN Kirana POS</p>
            </div>
          </div>
        </div>

        {/* 1-Click WhatsApp + PDF + Print Actions */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2.5">
          {/* Primary 1-Click WhatsApp Button */}
          <button
            onClick={handleWhatsApp}
            className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{t('save_and_whatsapp')} (1-Click)</span>
          </button>

          {/* Download PDF & Print Grid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadPdf}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>डाउनलोड PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>थर्मल प्रिंट</span>
            </button>
          </div>

          {/* Start New Bill */}
          <button
            onClick={onStartNewBill}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all"
          >
            + नया बिल बनाएं (Next Customer)
          </button>
        </div>
      </div>
    </div>
  );
};
