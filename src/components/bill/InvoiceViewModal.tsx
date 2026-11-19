import React from 'react';
import { 
  Printer, 
  Share2, 
  Download, 
  X, 
  CheckCircle, 
  Store,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import type { Invoice } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { 
  formatCurrency, 
  formatCurrencyPrecise, 
  formatDateDMY, 
  formatDateTime, 
  numberToWordsINR 
} from '../../utils/formatters';
import { openWhatsAppBill } from '../../utils/whatsapp';
import { generateInvoicePdf, printInvoice } from '../../utils/pdfGenerator';

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
    printInvoice(invoice, settings, customerTotalBalance);
  };

  const handleDownloadPdf = () => {
    generateInvoicePdf(invoice, settings, customerTotalBalance);
  };

  const handleWhatsApp = () => {
    openWhatsAppBill(invoice, settings, customerTotalBalance);
  };

  const totalQty = invoice.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const dueDateTimestamp = invoice.createdAt + 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in print-invoice-modal-overlay print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[95dvh] print-invoice-modal-content print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base tracking-tight">
                {language === 'hi' ? 'बिल तैयार है! (Bill of Supply)' : 'Invoice Generated!'}
              </h3>
              <p className="text-slate-400 text-xs">
                #{invoice.invoiceNumber} • {formatDateTime(invoice.createdAt, language)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Bill Area - myBillBook / Vyapar Official Template */}
        <div className="p-3 sm:p-6 bg-slate-200/70 overflow-y-auto flex-1 min-h-0 flex justify-center print-invoice-scroll-area print:p-0 print:bg-white print:overflow-visible print:block print:h-auto print:max-h-none">
          <div 
            id="den-printable-receipt" 
            className="bg-white shadow-xl border-2 border-[#b48a44] p-4 sm:p-6 w-full max-w-2xl text-xs text-slate-800 relative rounded-sm print:shadow-none print:border print:w-full print:p-2"
            style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', system-ui, sans-serif" }}
          >
            {/* Inner Double Gold Frame Border Accent */}
            <div className="border border-[#b48a44]/50 p-3 sm:p-5 space-y-4">
              
              {/* Top Header: Shop Avatar + Shop Meta + BILL OF SUPPLY badge */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 pb-3 border-b border-[#b48a44]/40">
                {/* Store Avatar / Photo */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 border border-[#b48a44] p-1 rounded bg-amber-50/30 flex items-center justify-center overflow-hidden">
                  {settings.qrCodeImageUrl ? (
                    <img 
                      src={settings.qrCodeImageUrl} 
                      alt="Shop Logo" 
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-amber-100/60 rounded flex flex-col items-center justify-center text-[#996d2e]">
                      <Store className="w-7 h-7" />
                      <span className="text-[8px] font-bold uppercase mt-0.5">M/S JYOTI</span>
                    </div>
                  )}
                </div>

                {/* Shop Center Info */}
                <div className="flex-1 text-center sm:text-left sm:px-3 space-y-0.5">
                  <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                    {settings.shopName || 'M/S JYOTI GENERAL STORE'}
                  </h1>
                  <div className="text-[11px] font-extrabold text-slate-700 tracking-wide">
                    GSTIN {settings.gstin || '10AOGPC3358B2ZR'}
                  </div>
                  <div className="text-[10px] text-slate-600 flex flex-wrap items-center justify-center sm:justify-start gap-x-2">
                    <span>📞 {settings.mobile || '9931300369'}</span>
                    <span>•</span>
                    <span>✉️ {settings.email || 'jyotigeneralstore11@gmail.com'}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 leading-snug">
                    📍 {settings.address || 'महावीर स्थान मेघपुर दीप मार्केट, मेघपुर बड़ा सुरसंड पश्चिमी, Bihar, 843331'}
                  </div>
                </div>

                {/* Right Badge: BILL OF SUPPLY */}
                <div className="text-center sm:text-right shrink-0">
                  <div className="text-sm sm:text-lg font-black text-slate-950 uppercase tracking-wider">
                    BILL OF SUPPLY
                  </div>
                  <div className="mt-1 inline-block border border-[#b48a44] bg-[#fdfbf6] px-2 py-0.5 text-[9px] font-black text-slate-700 uppercase rounded tracking-wider shadow-xs">
                    ORIGINAL FOR RECIPIENT
                  </div>
                </div>
              </div>

              {/* Invoice Meta 3-Column Strip */}
              <div className="grid grid-cols-3 divide-x divide-[#b48a44]/40 border-y border-[#b48a44]/40 py-2 bg-[#fdfbf7] text-center text-[11px]">
                <div className="px-1">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Invoice No.</span>
                  <span className="font-black text-slate-900">{invoice.invoiceNumber}</span>
                </div>
                <div className="px-1">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Invoice Date</span>
                  <span className="font-extrabold text-slate-900">{formatDateDMY(invoice.createdAt)}</span>
                </div>
                <div className="px-1">
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">Due Date</span>
                  <span className="font-extrabold text-slate-900">{formatDateDMY(dueDateTimestamp)}</span>
                </div>
              </div>

              {/* Bill To & Ship To 2-Column Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#b48a44]/40 border border-[#b48a44]/40 rounded-sm bg-[#fffdfa] text-xs">
                {/* Bill To */}
                <div className="p-2.5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Bill To:
                  </span>
                  <div className="font-black text-sm text-slate-950">
                    {invoice.customerName || 'मनीष झा'}
                  </div>
                  {invoice.customerMobile && (
                    <div className="text-slate-600 text-[11px]">
                      📞 {invoice.customerMobile}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600">
                    <span className="text-slate-500">Place of Supply: </span>
                    <span className="font-bold text-slate-900">{settings.placeOfSupply || 'Bihar'}</span>
                  </div>
                </div>

                {/* Ship To */}
                <div className="p-2.5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Ship To:
                  </span>
                  <div className="font-black text-sm text-slate-950">
                    {invoice.customerName || 'मनीष झा'}
                  </div>
                  {invoice.customerMobile && (
                    <div className="text-slate-600 text-[11px]">
                      📞 {invoice.customerMobile}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500">
                    Bihar, India
                  </div>
                </div>
              </div>

              {/* Items Table with Full Borders */}
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left border-collapse border border-[#b48a44]/60 text-xs">
                  <thead className="bg-[#f9f5ec] text-slate-800 font-black uppercase text-[10px] print:table-header-group">
                    <tr className="border-b border-[#b48a44]/60">
                      <th className="p-2 border-r border-[#b48a44]/40 w-10 text-center">No</th>
                      <th className="p-2 border-r border-[#b48a44]/40">Items</th>
                      <th className="p-2 border-r border-[#b48a44]/40 text-center w-24">Qty.</th>
                      <th className="p-2 border-r border-[#b48a44]/40 text-right w-24">Rate</th>
                      <th className="p-2 text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 print:break-inside-avoid">
                        <td className="p-2 border-r border-slate-200 text-center text-slate-500 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{item.nameHi || item.nameEn}</span>
                            {item.isComplementary && (
                              <span className="text-[9px] font-black text-purple-800 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-300">
                                🎁 मुफ्त (Free)
                              </span>
                            )}
                          </div>
                          {!item.isComplementary && item.discountPercentage ? (
                            <span className="text-[9px] text-amber-800 font-semibold block">
                              ({item.discountPercentage}% छूट @ ₹{item.unitPrice})
                            </span>
                          ) : null}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-center text-slate-700 font-semibold">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-2 border-r border-slate-200 text-right text-slate-700 font-medium">
                          {item.isComplementary ? '₹0.00' : formatCurrencyPrecise(item.unitPrice)}
                        </td>
                        <td className="p-2 text-right font-black text-slate-900">
                          {item.isComplementary ? '₹0.00' : formatCurrencyPrecise(item.total)}
                        </td>
                      </tr>
                    ))}

                    {/* Subtotal Row */}
                    <tr className="bg-[#faf6ee] font-black border-t-2 border-[#b48a44]/60 text-slate-900 print:break-inside-avoid">
                      <td colSpan={2} className="p-2 border-r border-slate-300 text-right uppercase text-[10px] tracking-wider">
                        SUBTOTAL
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center">
                        {Number(totalQty).toFixed(totalQty % 1 === 0 ? 0 : 2)}
                      </td>
                      <td className="p-2 border-r border-slate-300"></td>
                      <td className="p-2 text-right font-black">
                        {formatCurrencyPrecise(invoice.subtotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Section: Terms (Left) + Totals, In Words, Signature (Right) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 print-avoid-break print:break-inside-avoid">
                {/* Left: Terms and Conditions */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block mb-1">
                      Terms and Conditions:
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-[10px] text-slate-600 font-medium leading-relaxed">
                      <li>Goods once sold will not be taken back or exchanged.</li>
                      <li>All disputes are subject to Sursand jurisdiction only.</li>
                    </ol>
                  </div>

                  {typeof customerTotalBalance === 'number' && customerTotalBalance > 0 && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 font-bold">
                      📌 ग्राहक खाते में कुल शेष बकाया: {formatCurrencyPrecise(customerTotalBalance)}
                    </div>
                  )}

                  {invoice.dueAmount > 0 && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 font-black">
                      ⚠️ इस बिल पर बाज़ार उधारी बाकी: {formatCurrencyPrecise(invoice.dueAmount)}
                    </div>
                  )}
                </div>

                {/* Right: Amounts Summary + In Words + Signature */}
                <div className="space-y-3">
                  {/* Totals Table */}
                  <div className="border border-slate-300 rounded-sm divide-y divide-slate-200 bg-[#fefdfb] text-xs">
                    {invoice.discount > 0 && (
                      <div className="flex justify-between p-1.5 text-emerald-700 font-bold">
                        <span>कुल छूट (Discount):</span>
                        <span>-{formatCurrencyPrecise(invoice.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between p-2 bg-[#f8f3e6] font-black text-sm text-slate-950 border-y-2 border-[#b48a44]">
                      <span>Total Amount:</span>
                      <span>{formatCurrencyPrecise(invoice.grandTotal)}</span>
                    </div>
                    <div className="flex justify-between p-1.5 text-slate-700 font-semibold">
                      <span>Received Amount:</span>
                      <span>{formatCurrencyPrecise(invoice.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between p-1.5 text-slate-700 font-semibold">
                      <span>Balance Due:</span>
                      <span className={invoice.dueAmount > 0 ? 'text-rose-600 font-black' : 'text-slate-900'}>
                        {formatCurrencyPrecise(invoice.dueAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Total Amount in Words */}
                  <div className="text-[11px] leading-snug">
                    <span className="text-slate-500 font-medium">Total Amount (in words): </span>
                    <span className="font-extrabold text-slate-900">
                      {numberToWordsINR(invoice.grandTotal)}
                    </span>
                  </div>

                  {/* Authorized Signature Block */}
                  <div className="pt-4 text-right">
                    <div className="inline-block text-center min-w-[150px]">
                      <div className="font-serif italic text-slate-600 text-sm tracking-wide select-none">
                        Jyoti Gen Store
                      </div>
                      <div className="border-t border-slate-400 mt-1 pt-1 text-[10px] font-black uppercase text-slate-900 tracking-wider">
                        Authorized Signature
                      </div>
                      <div className="text-[9px] text-slate-500 font-semibold">
                        For {settings.shopName || 'M/S JYOTI GENERAL STORE'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="border-t border-[#b48a44]/30 pt-2 flex items-center justify-between text-[9px] text-slate-400">
                <span>Invoice created using myBillBook</span>
                <span>GST Compliant • Sursand, Bihar</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1-Click WhatsApp + PDF + Print Actions */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2 shrink-0 sticky bottom-0 z-10 print:hidden">
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
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>डाउनलोड PDF (A4)</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>प्रिंट (Print)</span>
            </button>
          </div>

          {/* Start New Bill */}
          <button
            onClick={onStartNewBill}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all cursor-pointer"
          >
            + नया बिल बनाएं (Next Customer)
          </button>
        </div>
      </div>
    </div>
  );
};