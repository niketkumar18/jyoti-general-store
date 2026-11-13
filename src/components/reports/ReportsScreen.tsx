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
  Users,
  ShoppingBag,
  Receipt,
  CalendarDays,
  Percent,
  CircleDollarSign,
  Layers
} from 'lucide-react';
import { db } from '../../db';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import { CreditBadge } from '../common/CreditBadge';
import { useCategories } from '../../utils/categories';
import { 
  exportDailyProfitToCsv, 
  exportMonthlyProfitToCsv, 
  exportMonthlyReportToCsv 
} from '../../utils/excelExport';

const MONTH_NAMES_HI = [
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type ReportTab = 'DAILY' | 'MONTHLY' | 'YEARLY';

export const ReportsScreen: React.FC = () => {
  const { language, t } = useLanguage();
  const { getLabel } = useCategories();
  const today = new Date();
  
  const [activeTab, setActiveTab] = useState<ReportTab>('DAILY');
  const [selectedDate, setSelectedDate] = useState<string>(
    today.toISOString().slice(0, 10) // 'YYYY-MM-DD'
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];
  const ledgerEntries = useLiveQuery(() => db.ledger.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const inventoryItems = useLiveQuery(() => db.items.toArray()) || [];

  // Map of inventory items for costPrice fallback lookup
  const inventoryMap = useMemo(() => {
    const map = new Map<number, { costPrice?: number; category?: string }>();
    inventoryItems.forEach((it) => {
      if (it.id) {
        map.set(it.id, { costPrice: it.costPrice, category: it.category });
      }
    });
    return map;
  }, [inventoryItems]);

  // Helper to get cost price of an invoice item
  const getItemCostPrice = (it: any): number => {
    if (typeof it.costPrice === 'number' && it.costPrice >= 0) {
      return it.costPrice;
    }
    if (it.itemId && inventoryMap.has(it.itemId)) {
      return inventoryMap.get(it.itemId)?.costPrice || 0;
    }
    return 0;
  };

  // ==========================================
  // 1. DAILY PROFIT DATA
  // ==========================================
  const dailyData = useMemo(() => {
    const [yearStr, monthStr, dayStr] = selectedDate.split('-');
    const targetY = parseInt(yearStr, 10);
    const targetM = parseInt(monthStr, 10) - 1; // 0-indexed
    const targetD = parseInt(dayStr, 10);

    const dayInvoices = invoices.filter((inv) => {
      const d = new Date(inv.createdAt);
      return (
        d.getFullYear() === targetY &&
        d.getMonth() === targetM &&
        d.getDate() === targetD
      );
    });

    const dayLedgers = ledgerEntries.filter((led) => {
      const d = new Date(led.createdAt);
      return (
        d.getFullYear() === targetY &&
        d.getMonth() === targetM &&
        d.getDate() === targetD
      );
    });

    let totalSales = 0;
    let totalCost = 0;
    let cashCollected = 0;
    let creditGiven = 0;

    // Group items sold
    const itemMap = new Map<
      string,
      {
        name: string;
        category: string;
        quantity: number;
        unit: string;
        totalCost: number;
        totalSales: number;
      }
    >();

    dayInvoices.forEach((inv) => {
      totalSales += inv.grandTotal;
      cashCollected += inv.paidAmount;
      creditGiven += inv.dueAmount;

      inv.items.forEach((it) => {
        const itemKey = `${it.nameEn || ''}_${it.nameHi || ''}_${it.unit}`;
        const unitCost = getItemCostPrice(it);
        const lineCost = unitCost * it.quantity;
        totalCost += lineCost;

        const existing = itemMap.get(itemKey);
        const rawCat = it.itemId && inventoryMap.has(it.itemId)
          ? inventoryMap.get(it.itemId)?.category || 'other'
          : 'other';
        const cat = getLabel(rawCat, language);

        if (existing) {
          existing.quantity += it.quantity;
          existing.totalCost += lineCost;
          existing.totalSales += it.total;
        } else {
          itemMap.set(itemKey, {
            name: it.nameHi || it.nameEn,
            category: cat,
            quantity: it.quantity,
            unit: it.unit,
            totalCost: lineCost,
            totalSales: it.total
          });
        }
      });
    });

    const itemsSold = Array.from(itemMap.values()).map((it) => {
      const profit = it.totalSales - it.totalCost;
      const marginPct = it.totalSales > 0 ? Number(((profit / it.totalSales) * 100).toFixed(1)) : 0;
      const avgCostRate = it.quantity > 0 ? Number((it.totalCost / it.quantity).toFixed(2)) : 0;
      const avgSaleRate = it.quantity > 0 ? Number((it.totalSales / it.quantity).toFixed(2)) : 0;

      return {
        ...it,
        avgCostRate,
        avgSaleRate,
        profit,
        marginPct
      };
    });

    // Credit recovered from Khata on this day
    const creditRecovered = dayLedgers
      .filter((led) => led.type === 'CREDIT')
      .reduce((sum, led) => sum + led.amount, 0);

    const netProfit = totalSales - totalCost;
    const marginPct = totalSales > 0 ? Number(((netProfit / totalSales) * 100).toFixed(1)) : 0;

    return {
      dayInvoices,
      itemsSold,
      totalSales,
      totalCost,
      netProfit,
      marginPct,
      cashCollected,
      creditGiven,
      creditRecovered
    };
  }, [invoices, ledgerEntries, selectedDate, inventoryMap]);

  // ==========================================
  // 2. MONTHLY PROFIT DATA (Day-by-Day)
  // ==========================================
  const monthlyData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const monthName = language === 'hi' ? MONTH_NAMES_HI[selectedMonth] : MONTH_NAMES_EN[selectedMonth];

    const monthInvoices = invoices.filter((inv) => {
      const d = new Date(inv.createdAt);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });

    const monthLedgers = ledgerEntries.filter((led) => {
      const d = new Date(led.createdAt);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });

    const dailyRows = [];
    let totalSales = 0;
    let totalCost = 0;
    let totalCreditGiven = 0;
    let totalCreditRecovered = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayInvs = monthInvoices.filter((inv) => new Date(inv.createdAt).getDate() === day);
      const dayLeds = monthLedgers.filter((led) => new Date(led.createdAt).getDate() === day);

      const daySales = dayInvs.reduce((sum, inv) => sum + inv.grandTotal, 0);
      let dayCost = 0;
      dayInvs.forEach((inv) => {
        inv.items.forEach((it) => {
          dayCost += getItemCostPrice(it) * it.quantity;
        });
      });

      const dayCredit = dayInvs.reduce((sum, inv) => sum + inv.dueAmount, 0);
      const dayRecovered = dayLeds
        .filter((l) => l.type === 'CREDIT')
        .reduce((sum, l) => sum + l.amount, 0);

      const dayProfit = daySales - dayCost;
      const dayMargin = daySales > 0 ? Number(((dayProfit / daySales) * 100).toFixed(1)) : 0;

      totalSales += daySales;
      totalCost += dayCost;
      totalCreditGiven += dayCredit;
      totalCreditRecovered += dayRecovered;

      const dateStr = `${day} ${monthName}`;

      dailyRows.push({
        day,
        dateStr,
        billsCount: dayInvs.length,
        sales: daySales,
        cost: dayCost,
        profit: dayProfit,
        marginPct: dayMargin,
        creditGiven: dayCredit,
        creditRecovered: dayRecovered
      });
    }

    const netProfit = totalSales - totalCost;
    const marginPct = totalSales > 0 ? Number(((netProfit / totalSales) * 100).toFixed(1)) : 0;

    return {
      monthName,
      dailyRows,
      totals: {
        totalSales,
        totalCost,
        netProfit,
        marginPct,
        totalCreditGiven,
        totalCreditRecovered
      }
    };
  }, [invoices, ledgerEntries, selectedYear, selectedMonth, language, inventoryMap]);

  // ==========================================
  // 3. YEARLY AUDIT & PROFIT DATA (12-Month)
  // ==========================================
  const yearlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIdx) => {
      const monthName = language === 'hi' ? MONTH_NAMES_HI[monthIdx] : MONTH_NAMES_EN[monthIdx];

      const monthInvoices = invoices.filter((inv) => {
        const d = new Date(inv.createdAt);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIdx;
      });

      const monthLedgers = ledgerEntries.filter((led) => {
        const d = new Date(led.createdAt);
        return d.getFullYear() === selectedYear && d.getMonth() === monthIdx;
      });

      const totalSales = monthInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      let totalCost = 0;
      monthInvoices.forEach((inv) => {
        inv.items.forEach((it) => {
          totalCost += getItemCostPrice(it) * it.quantity;
        });
      });

      const cashCollected = monthInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const creditGiven = monthInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0);

      const creditRecovered = monthLedgers
        .filter((led) => led.type === 'CREDIT')
        .reduce((sum, led) => sum + led.amount, 0);

      const netProfit = totalSales - totalCost;
      const marginPct = totalSales > 0 ? Number(((netProfit / totalSales) * 100).toFixed(1)) : 0;
      const netOutstanding = Math.max(0, creditGiven - creditRecovered);

      return {
        monthIdx,
        monthName,
        totalSales,
        totalCost,
        netProfit,
        marginPct,
        cashCollected,
        creditGiven,
        creditRecovered,
        netOutstanding
      };
    });
  }, [invoices, ledgerEntries, selectedYear, language, inventoryMap]);

  // Annual Totals
  const annualSales = yearlyData.reduce((sum, m) => sum + m.totalSales, 0);
  const annualCost = yearlyData.reduce((sum, m) => sum + m.totalCost, 0);
  const annualProfit = annualSales - annualCost;
  const annualMargin = annualSales > 0 ? Number(((annualProfit / annualSales) * 100).toFixed(1)) : 0;
  const annualCash = yearlyData.reduce((sum, m) => sum + m.cashCollected, 0);
  const annualCreditGiven = yearlyData.reduce((sum, m) => sum + m.creditGiven, 0);
  const annualCreditRecovered = yearlyData.reduce((sum, m) => sum + m.creditRecovered, 0);
  const annualNetOutstanding = Math.max(0, annualCreditGiven - annualCreditRecovered);

  // Top Debtors
  const topDebtors = useMemo(() => {
    return [...customers]
      .filter((c) => c.currentBalance > 0)
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .slice(0, 5);
  }, [customers]);

  // Handle CSV Export based on active tab
  const handleExport = () => {
    if (activeTab === 'DAILY') {
      const formattedDate = new Date(selectedDate).toLocaleDateString(
        language === 'hi' ? 'hi-IN' : 'en-IN',
        { day: 'numeric', month: 'short', year: 'numeric' }
      );
      exportDailyProfitToCsv(
        formattedDate,
        dailyData.itemsSold,
        {
          totalSales: dailyData.totalSales,
          totalCost: dailyData.totalCost,
          netProfit: dailyData.netProfit,
          marginPct: dailyData.marginPct
        }
      );
    } else if (activeTab === 'MONTHLY') {
      exportMonthlyProfitToCsv(
        monthlyData.monthName,
        selectedYear,
        monthlyData.dailyRows,
        monthlyData.totals
      );
    } else {
      exportMonthlyReportToCsv(selectedYear, yearlyData);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-5 space-y-4 sm:space-y-6">
      {/* Top Header & Tab Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-emerald-600" />
              <span>{language === 'hi' ? 'दुकान मुनाफा व उधारी रिपोर्ट' : 'Shop Profit & Debt Reports'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'hi'
                ? 'खरीद दर (Cost Price) बनाम बिक्री दर के आधार पर शुद्ध मुनाफा व उधारी का सटीक हिसाब'
                : 'Real-time profit tracking calculated against product purchase cost & khata balances'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Download CSV Report */}
            <button
              onClick={handleExport}
              className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {activeTab === 'DAILY'
                  ? 'दैनिक रिपोर्ट डाउनलोड (Excel)'
                  : activeTab === 'MONTHLY'
                  ? 'माहवार रिपोर्ट डाउनलोड (Excel)'
                  : 'वार्षिक ऑडिट डाउनलोड (Excel)'}
              </span>
            </button>
          </div>
        </div>

        {/* 3 Main View Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
            <button
              onClick={() => setActiveTab('DAILY')}
              className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'DAILY'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{language === 'hi' ? '📅 दैनिक मुनाफा (Daily)' : '📅 Daily Profit'}</span>
            </button>

            <button
              onClick={() => setActiveTab('MONTHLY')}
              className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'MONTHLY'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <span>{language === 'hi' ? '📆 मासिक मुनाफा (Monthly)' : '📆 Monthly Profit'}</span>
            </button>

            <button
              onClick={() => setActiveTab('YEARLY')}
              className={`px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'YEARLY'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>{language === 'hi' ? '📊 वार्षिक ऑडिट (Yearly)' : '📊 Yearly Audit'}</span>
            </button>
          </div>

          {/* Contextual Date / Month / Year Picker */}
          <div className="flex items-center gap-2">
            {activeTab === 'DAILY' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600">तारीख चुनें:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {activeTab === 'MONTHLY' && (
              <div className="flex items-center gap-2">
                {/* Month Select */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-900 cursor-pointer focus:outline-none"
                >
                  {(language === 'hi' ? MONTH_NAMES_HI : MONTH_NAMES_EN).map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                {/* Year Select */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-900 cursor-pointer focus:outline-none"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      वर्ष {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'YEARLY' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-900 cursor-pointer focus:outline-none"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    वित्तीय वर्ष {y}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DAILY PROFIT VIEW */}
      {/* ======================================================== */}
      {activeTab === 'DAILY' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Daily KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Total Sales */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                आज की कुल बिक्री (Sales)
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(dailyData.totalSales)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {dailyData.dayInvoices.length} बिल काटे गए
              </div>
            </div>

            {/* Total Buy Cost */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                सामान खरीद लागत (Cost)
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-700 mt-1">
                {formatCurrency(dailyData.totalCost)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                थोक खरीद मूल्य (Buy Rate)
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-4 rounded-2xl border border-emerald-300 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                <span>शुद्ध आज का मुनाफा (Net Profit)</span>
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">
                {formatCurrency(dailyData.netProfit)}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <span>मार्जिन: {dailyData.marginPct}%</span>
              </div>
            </div>

            {/* Cash Collected */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                नकद / UPI आया (Cash)
              </span>
              <div className="text-xl sm:text-2xl font-black text-green-700 mt-1">
                {formatCurrency(dailyData.cashCollected)}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1">
                हाथों-हाथ भुगतान
              </div>
            </div>

            {/* New Udhar Given */}
            <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                आज उधार दिया (Credit)
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                {formatCurrency(dailyData.creditGiven)}
              </div>
              <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                <span>खाते में दर्ज</span>
                {dailyData.creditRecovered > 0 && (
                  <span className="text-green-700 ml-1">
                    (वसूली: {formatCurrency(dailyData.creditRecovered)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Item-wise Profit Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  🛍️ आज बिके सामानों का आइटम-वार मुनाफा (Item-wise Profit Breakdown)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-bold">
                {dailyData.itemsSold.length} प्रकार के सामान बिके
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">सामान का नाम (Product Name)</th>
                    <th className="p-3">श्रेणी (Category)</th>
                    <th className="p-3 text-center">बिकी मात्रा (Qty)</th>
                    <th className="p-3 text-right">खरीद दर (Cost)</th>
                    <th className="p-3 text-right">बिक्री दर (Sale)</th>
                    <th className="p-3 text-right">कुल खरीद लागत</th>
                    <th className="p-3 text-right">कुल बिक्री राशि</th>
                    <th className="p-3 text-right text-emerald-800">शुद्ध मुनाफा (Profit)</th>
                    <th className="p-3 text-right">मार्जिन %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyData.itemsSold.length > 0 ? (
                    dailyData.itemsSold.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">
                          {it.name}
                        </td>
                        <td className="p-3 text-slate-600 text-xs">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                            {it.category}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="p-3 text-right text-slate-600 font-medium">
                          {formatCurrency(it.avgCostRate)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {formatCurrency(it.avgSaleRate)}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {formatCurrency(it.totalCost)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {formatCurrency(it.totalSales)}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700">
                          +{formatCurrency(it.profit)}
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-700">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-xs">
                            {it.marginPct}%
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400 text-xs">
                        चयनित तारीख ({selectedDate}) को कोई सामान नहीं बिका।
                      </td>
                    </tr>
                  )}
                </tbody>
                {dailyData.itemsSold.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-xs sm:text-sm">
                    <tr>
                      <td colSpan={5} className="p-3 text-slate-900 font-extrabold uppercase">
                        कुल दैनिक जोड़ (Total Summary):
                      </td>
                      <td className="p-3 text-right font-bold text-slate-700">
                        {formatCurrency(dailyData.totalCost)}
                      </td>
                      <td className="p-3 text-right font-black text-slate-900">
                        {formatCurrency(dailyData.totalSales)}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-700 text-sm">
                        +{formatCurrency(dailyData.netProfit)}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-800">
                        {dailyData.marginPct}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Today's Invoices List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  🧾 आज के सभी बिल (Today's Invoices)
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-bold">
                {dailyData.dayInvoices.length} बिल
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">बिल # एवं समय</th>
                    <th className="p-3">ग्राहक (Customer)</th>
                    <th className="p-3">सामान (Items)</th>
                    <th className="p-3 text-right">कुल बिल (Total)</th>
                    <th className="p-3 text-right">लागत (Cost)</th>
                    <th className="p-3 text-right text-emerald-800">मुनाफा (Profit)</th>
                    <th className="p-3 text-center">भुगतान स्थिति</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyData.dayInvoices.length > 0 ? (
                    dailyData.dayInvoices.map((inv) => {
                      let invCost = 0;
                      inv.items.forEach((it) => {
                        invCost += getItemCostPrice(it) * it.quantity;
                      });
                      const invProfit = inv.grandTotal - invCost;

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-emerald-800">
                            <div>#{inv.invoiceNumber}</div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              {new Date(inv.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            <div>{inv.customerName}</div>
                            {inv.customerMobile && (
                              <div className="text-[11px] text-slate-500">📞 {inv.customerMobile}</div>
                            )}
                          </td>
                          <td className="p-3 text-slate-700">
                            {inv.items.map((i) => `${i.nameHi || i.nameEn} (${i.quantity} ${i.unit})`).join(', ')}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900">
                            {formatCurrency(inv.grandTotal)}
                          </td>
                          <td className="p-3 text-right text-slate-600">
                            {formatCurrency(invCost)}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-700">
                            +{formatCurrency(invProfit)}
                          </td>
                          <td className="p-3 text-center">
                            {inv.dueAmount > 0 ? (
                              <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                उधार ₹{inv.dueAmount}
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {inv.paymentMethod} चुकता
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                        इस तारीख पर कोई बिल नहीं बना।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MONTHLY PROFIT VIEW (Day-by-Day Breakdown) */}
      {/* ======================================================== */}
      {activeTab === 'MONTHLY' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Monthly KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Monthly Sales */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                महीने की कुल बिक्री (Sales)
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(monthlyData.totals.totalSales)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {monthlyData.monthName} {selectedYear}
              </div>
            </div>

            {/* Monthly Buy Cost */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                महीने की खरीद लागत (Cost)
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-700 mt-1">
                {formatCurrency(monthlyData.totals.totalCost)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                थोक खरीद मूल्य (Buy Rate)
              </div>
            </div>

            {/* Monthly Net Profit */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-4 rounded-2xl border border-emerald-300 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                <span>महीने का शुद्ध मुनाफा (Profit)</span>
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">
                {formatCurrency(monthlyData.totals.netProfit)}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                औसत मार्जिन: {monthlyData.totals.marginPct}%
              </div>
            </div>

            {/* Monthly Udhar Given */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                नया उधार दिया (Credit)
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                {formatCurrency(monthlyData.totals.totalCreditGiven)}
              </div>
              <div className="text-[11px] text-amber-600 mt-1">
                मार्केट में गया उधार
              </div>
            </div>

            {/* Monthly Udhar Recovered */}
            <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                उधार वसूली (Recovered)
              </span>
              <div className="text-xl sm:text-2xl font-black text-green-700 mt-1">
                {formatCurrency(monthlyData.totals.totalCreditRecovered)}
              </div>
              <div className="text-[11px] text-green-600 mt-1">
                खाते में जमा हुआ
              </div>
            </div>
          </div>

          {/* Day-by-Day Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-emerald-600" />
                <span>
                  📆 {monthlyData.monthName} {selectedYear} का दिन-प्रतिदिन मुनाफा (Day-by-Day Profit)
                </span>
              </h3>
              <span className="text-xs text-slate-500 font-bold">
                {monthlyData.dailyRows.length} दिन
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">तारीख (Date)</th>
                    <th className="p-3 text-center">बिल संख्या (Bills)</th>
                    <th className="p-3 text-right">कुल बिक्री (Sales)</th>
                    <th className="p-3 text-right">खरीद लागत (Cost)</th>
                    <th className="p-3 text-right text-emerald-800">शुद्ध मुनाफा (Profit)</th>
                    <th className="p-3 text-right">मार्जिन %</th>
                    <th className="p-3 text-right text-amber-700">नया उधार</th>
                    <th className="p-3 text-right text-green-700">उधार वसूली</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyData.dailyRows.map((d) => {
                    const isToday =
                      selectedYear === today.getFullYear() &&
                      selectedMonth === today.getMonth() &&
                      d.day === today.getDate();

                    return (
                      <tr
                        key={d.day}
                        className={`hover:bg-slate-50 transition-colors ${
                          isToday ? 'bg-emerald-50/50 font-semibold' : ''
                        }`}
                      >
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{d.dateStr}</span>
                          {isToday && (
                            <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-normal">
                              आज
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center font-semibold text-slate-700">
                          {d.billsCount > 0 ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold">
                              {d.billsCount}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="p-3 text-right font-bold text-slate-900">
                          {d.sales > 0 ? formatCurrency(d.sales) : '—'}
                        </td>

                        <td className="p-3 text-right text-slate-600">
                          {d.cost > 0 ? formatCurrency(d.cost) : '—'}
                        </td>

                        <td className="p-3 text-right font-black text-emerald-700">
                          {d.sales > 0 ? `+${formatCurrency(d.profit)}` : '—'}
                        </td>

                        <td className="p-3 text-right font-bold text-slate-700">
                          {d.sales > 0 ? `${d.marginPct}%` : '—'}
                        </td>

                        <td className="p-3 text-right font-medium text-amber-600">
                          {d.creditGiven > 0 ? formatCurrency(d.creditGiven) : '—'}
                        </td>

                        <td className="p-3 text-right font-medium text-green-700">
                          {d.creditRecovered > 0 ? formatCurrency(d.creditRecovered) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-xs sm:text-sm">
                  <tr>
                    <td colSpan={2} className="p-3 text-slate-900 font-extrabold uppercase">
                      माह का कुल योग (Total):
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">
                      {formatCurrency(monthlyData.totals.totalSales)}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-700">
                      {formatCurrency(monthlyData.totals.totalCost)}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-700 text-sm">
                      +{formatCurrency(monthlyData.totals.netProfit)}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-800">
                      {monthlyData.totals.marginPct}%
                    </td>
                    <td className="p-3 text-right font-black text-amber-600">
                      {formatCurrency(monthlyData.totals.totalCreditGiven)}
                    </td>
                    <td className="p-3 text-right font-black text-green-700">
                      {formatCurrency(monthlyData.totals.totalCreditRecovered)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: YEARLY AUDIT & 12-MONTH PROFIT VIEW */}
      {/* ======================================================== */}
      {activeTab === 'YEARLY' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Annual Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Total Sales */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                वार्षिक कुल बिक्री (Annual Sales)
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(annualSales)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">12 महीनों का कुल बिलिंग</div>
            </div>

            {/* Annual Buy Cost */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                वार्षिक खरीद लागत (Annual Cost)
              </span>
              <div className="text-xl sm:text-2xl font-black text-slate-700 mt-1">
                {formatCurrency(annualCost)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">होलसेल खरीद खर्च</div>
            </div>

            {/* Annual Net Profit */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-4 rounded-2xl border border-emerald-300 shadow-xs">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                <span>वार्षिक शुद्ध मुनाफा (Profit)</span>
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">
                {formatCurrency(annualProfit)}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                वार्षिक मार्जिन: {annualMargin}%
              </div>
            </div>

            {/* New Credit Given */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                साल में दिया उधार (Credit)
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
                {formatCurrency(annualCreditGiven)}
              </div>
              <div className="text-[11px] text-amber-600 mt-1">
                वसूली: {formatCurrency(annualCreditRecovered)}
              </div>
            </div>

            {/* Net Outstanding */}
            <div className="col-span-2 lg:col-span-1 bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-xs">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">
                शुद्ध शेष बकाया (Net Due)
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
                {formatCurrency(annualNetOutstanding)}
              </div>
              <div className="text-[11px] text-rose-600 mt-1">मार्केट में फंसी उधारी</div>
            </div>
          </div>

          {/* 12-Month Audit Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <span>📅 {selectedYear} का 12-माहवार संपूर्ण ऑडिट व मुनाफा विवरण</span>
              </h3>
              <span className="text-xs text-slate-500 font-bold">12 महीने</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="p-3">{t('month_col')}</th>
                    <th className="p-3 text-right">कुल बिक्री (Sales)</th>
                    <th className="p-3 text-right">खरीद लागत (Cost)</th>
                    <th className="p-3 text-right text-emerald-800">शुद्ध मुनाफा (Profit)</th>
                    <th className="p-3 text-right">मार्जिन %</th>
                    <th className="p-3 text-right">नकद/UPI वसूली</th>
                    <th className="p-3 text-right text-amber-700">नया उधार दिया</th>
                    <th className="p-3 text-right text-green-700">उधार जमा हुआ</th>
                    <th className="p-3 text-right text-rose-700">शुद्ध बकाया (Net Due)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {yearlyData.map((m) => {
                    const isCurrentMonth =
                      selectedYear === today.getFullYear() && m.monthIdx === today.getMonth();

                    return (
                      <tr
                        key={m.monthIdx}
                        className={`hover:bg-slate-50 transition-colors ${
                          isCurrentMonth ? 'bg-emerald-50/50 font-semibold' : ''
                        }`}
                      >
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
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

                        <td className="p-3 text-right text-slate-600">
                          {formatCurrency(m.totalCost)}
                        </td>

                        <td className="p-3 text-right font-black text-emerald-700">
                          +{formatCurrency(m.netProfit)}
                        </td>

                        <td className="p-3 text-right font-bold text-slate-700">
                          {m.totalSales > 0 ? `${m.marginPct}%` : '0%'}
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
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-xs sm:text-sm">
                  <tr>
                    <td className="p-3 text-slate-900 font-extrabold uppercase">
                      वार्षिक कुल योग (Annual Total):
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">
                      {formatCurrency(annualSales)}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-700">
                      {formatCurrency(annualCost)}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-700 text-sm">
                      +{formatCurrency(annualProfit)}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-800">
                      {annualMargin}%
                    </td>
                    <td className="p-3 text-right font-black text-emerald-700">
                      {formatCurrency(annualCash)}
                    </td>
                    <td className="p-3 text-right font-black text-amber-600">
                      {formatCurrency(annualCreditGiven)}
                    </td>
                    <td className="p-3 text-right font-black text-green-700">
                      {formatCurrency(annualCreditRecovered)}
                    </td>
                    <td className="p-3 text-right font-black text-rose-600">
                      {formatCurrency(annualNetOutstanding)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Top Debtors Ranking */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-500" />
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  {t('top_debtors_title')}
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-bold">उच्चतम उधारी वाले ग्राहक</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topDebtors.map((debtor, idx) => (
                <div
                  key={debtor.id}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between shadow-2xs"
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
      )}
    </div>
  );
};
