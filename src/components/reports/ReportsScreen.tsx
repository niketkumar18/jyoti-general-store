import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldAlert,
  Users
} from 'lucide-react';
import { db } from '../../db';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import { CreditBadge } from '../common/CreditBadge';
import { exportMonthlyReportToCsv } from '../../utils/excelExport';

const MONTH_NAMES_HI = [
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const ReportsScreen: React.FC = () => {
  const { language, t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];
  const ledgerEntries = useLiveQuery(() => db.ledger.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  // Compute 12-Month Breakdown for Selected Year
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIdx) => {
      const monthName = language === 'hi' ? MONTH_NAMES_HI[monthIdx] : MONTH_NAMES_EN[monthIdx];
      
      // Filter invoices for this month & year
      const monthInvoices = invoices.filter((inv) => {
        const d = new Date(inv.createdAt);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIdx;
      });

      // Filter ledger entries for this month & year
      const monthLedgers = ledgerEntries.filter((led) => {
        const d = new Date(led.createdAt);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIdx;
      });

      const totalSales = monthInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const cashCollected = monthInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const creditGiven = monthInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0);

      // Old Debt Recovered from Khata ledger CREDIT entries
      const creditRecovered = monthLedgers
        .filter((led) => led.type === 'CREDIT')
        .reduce((sum, led) => sum + led.amount, 0);

      const netOutstanding = Math.max(0, creditGiven - creditRecovered);

      return {
        monthIdx,
        monthName,
        totalSales,
        cashCollected,
        creditGiven,
        creditRecovered,
        netOutstanding
      };
    });
  }, [invoices, ledgerEntries, selectedYear, language]);

  // Annual Totals
  const annualSales = monthlyData.reduce((sum, m) => sum + m.totalSales, 0);
  const annualCash = monthlyData.reduce((sum, m) => sum + m.cashCollected, 0);
  const annualCreditGiven = monthlyData.reduce((sum, m) => sum + m.creditGiven, 0);
  const annualCreditRecovered = monthlyData.reduce((sum, m) => sum + m.creditRecovered, 0);
  const annualNetOutstanding = Math.max(0, annualCreditGiven - annualCreditRecovered);

  // Top Debtors
  const topDebtors = useMemo(() => {
    return [...customers]
      .filter((c) => c.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .slice(0, 5);
  }, [customers]);

  const handleExport = () => {
    exportMonthlyReportToCsv(selectedYear, monthlyData);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Top Header Bar with Year Selector & Export */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-lg sm:text-xl text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            <span>{t('reports_title')}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'hi'
              ? 'वित्तीय वर्ष अनुसार 12 महीनों की बिक्री, उधारी वितरण एवं वसूली का संपूर्ण लेखा-जोखा'
              : 'Annual 12-month audit: sales, credit issued, and recovery breakdown'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent font-bold text-sm text-slate-800 focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  वर्ष {y}
                </option>
              ))}
            </select>
          </div>

          {/* Download Report */}
          <button
            onClick={handleExport}
            className="py-2 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t('download_excel')}</span>
          </button>
        </div>
      </div>

      {/* Annual Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            {t('annual_sales')}
          </span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(annualSales)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">12 महीनों का कुल बिलिंग</div>
        </div>

        {/* Cash Collected */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            {t('annual_cash_collected')}
          </span>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {formatCurrency(annualCash)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-1 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />
            <span>हाथों-हाथ नकद/UPI</span>
          </div>
        </div>

        {/* New Credit Given */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            {t('annual_credit_given')}
          </span>
          <div className="text-xl font-black text-amber-600 mt-1">
            {formatCurrency(annualCreditGiven)}
          </div>
          <div className="text-[10px] text-amber-600 mt-1 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" />
            <span>मार्केट में गया उधार</span>
          </div>
        </div>

        {/* Debt Recovered */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            {t('annual_credit_recovered')}
          </span>
          <div className="text-xl font-black text-green-700 mt-1">
            {formatCurrency(annualCreditRecovered)}
          </div>
          <div className="text-[10px] text-green-600 mt-1 flex items-center gap-0.5">
            <ArrowDownLeft className="w-3 h-3" />
            <span>खाते में वापस जमा</span>
          </div>
        </div>

        {/* Net Outstanding */}
        <div className="col-span-2 lg:col-span-1 bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-800 uppercase">
            {t('annual_net_outstanding')}
          </span>
          <div className="text-xl font-black text-rose-700 mt-1">
            {formatCurrency(annualNetOutstanding)}
          </div>
          <div className="text-[10px] text-rose-600 mt-1">शुद्ध शेष उधारी</div>
        </div>
      </div>

      {/* 12-Month Audit Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">
            📅 {selectedYear} का माहवार लेखा-जोखा (Month-by-Month Audit)
          </h3>
          <span className="text-xs text-slate-500 font-medium">12 महीने</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
              <tr>
                <th className="p-3 sm:p-4">{t('month_col')}</th>
                <th className="p-3 text-right">कुल बिक्री</th>
                <th className="p-3 text-right">नकद/UPI वसूली</th>
                <th className="p-3 text-right">नया उधार दिया</th>
                <th className="p-3 text-right">उधार जमा हुआ</th>
                <th className="p-3 text-right">शुद्ध बकाया (Net Due)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {monthlyData.map((m) => {
                const isCurrentMonth =
                  selectedYear === currentYear && m.monthIdx === new Date().getMonth();

                return (
                  <tr
                    key={m.monthIdx}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrentMonth ? 'bg-emerald-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3 sm:p-4 font-bold text-slate-900 flex items-center gap-2">
                      <span>{m.monthName}</span>
                      {isCurrentMonth && (
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-normal">
                          चालू माह
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right font-bold text-slate-800">
                      {formatCurrency(m.totalSales)}
                    </td>

                    <td className="p-3 text-right text-emerald-700 font-semibold">
                      {formatCurrency(m.cashCollected)}
                    </td>

                    <td className="p-3 text-right text-amber-600 font-semibold">
                      {m.creditGiven > 0 ? formatCurrency(m.creditGiven) : '—'}
                    </td>

                    <td className="p-3 text-right text-green-700 font-semibold">
                      {m.creditRecovered > 0 ? formatCurrency(m.creditRecovered) : '—'}
                    </td>

                    <td className="p-3 text-right font-extrabold text-rose-600">
                      {m.netOutstanding > 0 ? formatCurrency(m.netOutstanding) : '₹0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Debtors Ranking */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {t('top_debtors_title')}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">उच्चतम उधारी वाले ग्राहक</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {topDebtors.map((debtor, idx) => (
            <div
              key={debtor.id}
              className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black">
                  #{idx + 1}
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    {debtor.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">📞 {debtor.mobile}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-rose-600">
                  {formatCurrency(debtor.currentBalance)}
                </div>
                <CreditBadge riskLevel={debtor.riskLevel} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
