import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  Package, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  AlertTriangle, 
  DollarSign, 
  Plus, 
  Receipt, 
  Scale, 
  Sparkles, 
  FileSpreadsheet,
  ChevronRight,
  PackagePlus,
  QrCode,
  Calendar,
  Wallet
} from 'lucide-react';
import { db } from '../../db';
import type { ActiveTab } from '../common/Navbar';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { VendorPurchaseModal } from '../khata/VendorPurchaseModal';

interface DashboardScreenProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { settings } = useSettings();

  const [isVendorPurchaseModalOpen, setIsVendorPurchaseModalOpen] = useState(false);

  // Live data from Dexie IndexedDB
  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const vendors = useLiveQuery(() => db.vendors.toArray()) || [];
  const inventoryItems = useLiveQuery(() => db.items.toArray()) || [];
  const vendorLedgerEntries = useLiveQuery(() => db.vendorLedger.reverse().sortBy('createdAt')) || [];
  const customerLedgerEntries = useLiveQuery(() => db.ledger.reverse().sortBy('createdAt')) || [];

  // Date boundaries
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Inventory Map for cost price lookup
  const itemCostMap = useMemo(() => {
    const map = new Map<number, number>();
    inventoryItems.forEach((item) => {
      if (item.id) {
        map.set(item.id, item.costPrice || 0);
      }
    });
    return map;
  }, [inventoryItems]);

  // 1. TOTAL SALES (बिक्री)
  const salesMetrics = useMemo(() => {
    let todaySales = 0;
    let todayBillsCount = 0;
    let todayCash = 0;
    let todayUpi = 0;
    let todayCredit = 0;
    let todayCost = 0;

    let monthSales = 0;
    let monthCost = 0;

    let allTimeSales = 0;

    invoices.forEach((inv) => {
      allTimeSales += inv.grandTotal;

      // Calculate cost of goods sold for this invoice
      let invCost = 0;
      inv.items.forEach((it) => {
        const unitCost = (typeof it.costPrice === 'number' && it.costPrice >= 0)
          ? it.costPrice
          : (it.itemId && itemCostMap.has(it.itemId) ? itemCostMap.get(it.itemId)! : 0);
        invCost += unitCost * it.quantity;
      });

      if (inv.createdAt >= startOfToday) {
        todaySales += inv.grandTotal;
        todayBillsCount += 1;
        todayCost += invCost;

        if (inv.paymentMethod === 'CASH') todayCash += inv.paidAmount;
        else if (inv.paymentMethod === 'UPI') todayUpi += inv.paidAmount;
        else if (inv.paymentMethod === 'SPLIT') {
          todayCash += (inv.paidAmount / 2);
          todayUpi += (inv.paidAmount / 2);
        }
        todayCredit += inv.dueAmount;
      }

      if (inv.createdAt >= startOfMonth) {
        monthSales += inv.grandTotal;
        monthCost += invCost;
      }
    });

    const todayProfit = todaySales - todayCost;
    const todayMargin = todaySales > 0 ? Number(((todayProfit / todaySales) * 100).toFixed(1)) : 0;

    const monthProfit = monthSales - monthCost;
    const monthMargin = monthSales > 0 ? Number(((monthProfit / monthSales) * 100).toFixed(1)) : 0;

    return {
      todaySales,
      todayBillsCount,
      todayCash,
      todayUpi,
      todayCredit,
      todayProfit,
      todayMargin,
      monthSales,
      monthProfit,
      monthMargin,
      allTimeSales
    };
  }, [invoices, startOfToday, startOfMonth, itemCostMap]);

  // 2. BORROW / UDHAR METRICS (उधारी - लेना है vs देना है)
  const borrowMetrics = useMemo(() => {
    const customerUdhar = customers.reduce(
      (sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0),
      0
    );
    const debtorsCount = customers.filter((c) => c.currentBalance > 0).length;

    const vendorDue = vendors.reduce(
      (sum, v) => sum + (v.currentBalance > 0 ? v.currentBalance : 0),
      0
    );
    const suppliersOwedCount = vendors.filter((v) => v.currentBalance > 0).length;

    const netBorrowPosition = customerUdhar - vendorDue;

    return {
      customerUdhar,
      debtorsCount,
      vendorDue,
      suppliersOwedCount,
      netBorrowPosition
    };
  }, [customers, vendors]);

  // 3. STOCK & INVENTORY METRICS
  const stockMetrics = useMemo(() => {
    const totalValuation = inventoryItems.reduce(
      (sum, item) => sum + ((item.costPrice || item.salePrice) * (item.stockQty || 0)),
      0
    );
    const lowStockItems = inventoryItems.filter(
      (item) => item.stockQty <= item.lowStockThreshold
    );
    return {
      totalValuation,
      totalCount: inventoryItems.length,
      lowStockItems,
      lowStockCount: lowStockItems.length
    };
  }, [inventoryItems]);

  // Recent 5 invoices
  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
  }, [invoices]);

  // Recent 5 vendor transactions
  const recentVendorBills = useMemo(() => {
    return vendorLedgerEntries.slice(0, 5);
  }, [vendorLedgerEntries]);

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5 pb-24 sm:pb-8">
      {/* ========================================================================= */}
      {/* 1. TOP HERO HEADER & WELCOME BAR                                          */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 text-white rounded-3xl p-4 sm:p-6 shadow-xl border border-emerald-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/20">
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {settings.shopName || 'ज्योति जनरल स्टोर'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400/20 text-emerald-300 border border-emerald-300/30 uppercase tracking-wider">
                लाइव डैशबोर्ड
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1">
              आज का कारोबार: कुल बिक्री, उधारी (लेना/देना) एवं शुद्ध मुनाफे का रीयल-टाइम बहीखाता
            </p>
          </div>

          {/* Quick Date Display */}
          <div className="flex items-center gap-2 bg-emerald-950/60 backdrop-blur border border-emerald-600/30 px-3.5 py-2 rounded-2xl text-xs font-bold text-emerald-200">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>
              {new Date().toLocaleDateString('hi-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THE THREE CORE CARDS: TOTAL SELL, BORROW, PROFIT                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: TOTAL SELL (कुल बिक्री) */}
        <div 
          onClick={() => onNavigate('pos')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    कुल बिक्री (Total Sell)
                  </span>
                  <p className="text-xs text-emerald-700 font-bold">आज की काउंटर बिक्री</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>

            {/* Today's Big Number */}
            <div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {formatCurrency(salesMetrics.todaySales)}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="font-bold text-slate-700">आज के बिल: {salesMetrics.todayBillsCount}</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">नकद: {formatCurrency(salesMetrics.todayCash)}</span>
                <span>•</span>
                <span className="text-blue-700 font-bold">UPI: {formatCurrency(salesMetrics.todayUpi)}</span>
              </div>
            </div>

            {/* Month & All-time Breakdown */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">इस महीने (This Month)</span>
                <span className="font-extrabold text-slate-800 text-sm">{formatCurrency(salesMetrics.monthSales)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">ऑल-टाइम बिक्री</span>
                <span className="font-extrabold text-slate-700 text-sm">{formatCurrency(salesMetrics.allTimeSales)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: BORROW / UDHAR (उधारी खाता: लेना है vs देना है) */}
        <div 
          onClick={() => onNavigate('khata')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    उधारी स्थिति (Borrow & Credit)
                  </span>
                  <p className="text-xs text-amber-700 font-bold">बाज़ार लेनदारी व देनदारी</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>

            {/* Split: Customer Udhar vs Vendor Due */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">
                  ग्राहकों से लेना है
                </span>
                <span className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5 block">
                  {formatCurrency(borrowMetrics.customerUdhar)}
                </span>
                <span className="text-[10px] text-rose-700 font-medium">
                  {borrowMetrics.debtorsCount} ग्राहकों पर उधार
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                  सप्लायर को देना है
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5 block">
                  {formatCurrency(borrowMetrics.vendorDue)}
                </span>
                <span className="text-[10px] text-amber-800 font-medium">
                  {borrowMetrics.suppliersOwedCount} महाजनों का बकाया
                </span>
              </div>
            </div>

            {/* Net Position */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">शुद्ध संतुलन (Net Balance):</span>
              <span className={`font-black text-sm ${borrowMetrics.netBorrowPosition >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {borrowMetrics.netBorrowPosition >= 0 ? '+' : ''}{formatCurrency(borrowMetrics.netBorrowPosition)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: TOTAL PROFIT (शुद्ध मुनाफा) */}
        <div 
          onClick={() => onNavigate('reports')}
          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-50 rounded-bl-full -z-0 opacity-60 group-hover:scale-110 transition-transform" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <TrendingUp className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    शुद्ध मुनाफा (Profit)
                  </span>
                  <p className="text-xs text-emerald-700 font-bold">खरीद लागत घटाकर शुद्ध बचत</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
            </div>

            {/* Today's Profit */}
            <div>
              <p className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight">
                +{formatCurrency(salesMetrics.todayProfit)}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span className="px-2 py-0.5 rounded-full font-black text-xs bg-emerald-100 text-emerald-800">
                  {salesMetrics.todayMargin}% मार्जिन
                </span>
                <span>आज की कुल बिक्री पर मुनाफा</span>
              </div>
            </div>

            {/* Monthly Profit Breakdown */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">इस महीने का मुनाफा</span>
                <span className="font-extrabold text-emerald-700 text-sm">+{formatCurrency(salesMetrics.monthProfit)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">मासिक औसत मार्जिन</span>
                <span className="font-black text-slate-800 text-sm">{salesMetrics.monthMargin}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. STOCK ASSET & QUICK RE-STOCK BANNER                                    */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white">
                  दुकान स्टॉक मूल्यांकन (Stock Asset Valuation)
                </h3>
                <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold">
                  {stockMetrics.totalCount} कुल सामान
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                दुकान में मौजूदा माल की खरीद लागत वैल्यू: <span className="text-white font-extrabold text-sm">{formatCurrency(stockMetrics.totalValuation)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Low stock alert badge */}
            {stockMetrics.lowStockCount > 0 ? (
              <button
                onClick={() => onNavigate('inventory')}
                className="py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>{stockMetrics.lowStockCount} सामान कम स्टॉक में</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                ✅ पर्याप्त स्टॉक उपलब्ध
              </span>
            )}

            {/* Direct Button to Buy Stock & Upload Bill */}
            <button
              onClick={() => setIsVendorPurchaseModalOpen(true)}
              className="py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ नया माल खरीद व बिल अपलोड</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. HERO ACTION HUB (तुरंत कार्य शुरू करें)                                  */}
      {/* ========================================================================= */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
          त्वरित कार्य (Quick Navigation Hub)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Action 1: New POS Bill */}
          <button
            onClick={() => onNavigate('pos')}
            className="p-3.5 bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-2xl shadow-xs flex flex-col items-center text-center gap-2 group transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">नया बिल (POS)</span>
              <span className="text-[10px] text-slate-500 font-medium">काउंटर बिक्री</span>
            </div>
          </button>

          {/* Action 2: Buy Stock & Upload Bill */}
          <button
            onClick={() => setIsVendorPurchaseModalOpen(true)}
            className="p-3.5 bg-white hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-2xl shadow-xs flex flex-col items-center text-center gap-2 group transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">+ माल खरीद व बिल</span>
              <span className="text-[10px] text-indigo-700 font-bold">स्टॉक जोड़ें व बिल फोटो</span>
            </div>
          </button>

          {/* Action 3: Customer Khata */}
          <button
            onClick={() => onNavigate('khata')}
            className="p-3.5 bg-white hover:bg-rose-50/60 border border-slate-200 hover:border-rose-300 rounded-2xl shadow-xs flex flex-col items-center text-center gap-2 group transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">ग्राहक खाता</span>
              <span className="text-[10px] text-slate-500 font-medium">बाज़ार उधारी वसूली</span>
            </div>
          </button>

          {/* Action 4: Vendor Khata & Management */}
          <button
            onClick={() => onNavigate('vendors')}
            className="p-3.5 bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-2xl shadow-xs flex flex-col items-center text-center gap-2 group transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">सप्लायर / महाजन</span>
              <span className="text-[10px] text-slate-500 font-medium">महाजन बकाया व बिल</span>
            </div>
          </button>

          {/* Action 5: Stock / Catalog */}
          <button
            onClick={() => onNavigate('inventory')}
            className="p-3.5 bg-white hover:bg-green-50/60 border border-slate-200 hover:border-green-300 rounded-2xl shadow-xs flex flex-col items-center text-center gap-2 group transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-green-100 text-green-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">स्टॉक सूची</span>
              <span className="text-[10px] text-slate-500 font-medium">कैटलॉग व रेट</span>
            </div>
          </button>

          {/* Action 6: Profit & Reports */}
          <button
            onClick={() => onNavigate('reports')}
            className="p-3.5 bg-white hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 rounded-2xl shadow-xs flex flex-col items-center text-center gap-2 group transition-all cursor-pointer"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">मुनाफा रिपोर्ट</span>
              <span className="text-[10px] text-slate-500 font-medium">दैनिक व मासिक ऑडिट</span>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. RECENT ACTIVITY SPLIT: TODAY'S SALES VS RECENT VENDOR BILLS            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Recent Counter Bills */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                हालिया काउंटर बिक्री बिल (Recent Sales)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>सभी देखें</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentInvoices.length > 0 ? (
              recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">#{inv.invoiceNumber}</span>
                      <span className="font-bold text-slate-700">{inv.customerName}</span>
                      {inv.paymentMethod === 'UPI' && (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-1.5 py-0.2 rounded">UPI</span>
                      )}
                      {inv.paymentMethod === 'CASH' && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.2 rounded">नकद</span>
                      )}
                      {inv.paymentMethod === 'CREDIT' && (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-1.5 py-0.2 rounded">उधार</span>
                      )}
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      {formatDateTime(inv.createdAt)} • {inv.items.length} सामान ({inv.items.map(i => i.nameHi || i.nameEn).slice(0, 2).join(', ')}{inv.items.length > 2 ? '...' : ''})
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-black text-sm text-slate-900 block">
                      {formatCurrency(inv.grandTotal)}
                    </span>
                    {inv.dueAmount > 0 && (
                      <span className="text-[10px] font-bold text-rose-600 block">
                        बाकी: {formatCurrency(inv.dueAmount)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                आज कोई बिल नहीं बना। नया बिल बनाने के लिए '+ नया बिल' दबाएँ।
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Recent Vendor Purchases & Uploaded Bills */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                हालिया सप्लायर माल खरीद व बिल (Vendor Purchases)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('vendors')}
              className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>सप्लायर खाता देखें</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentVendorBills.length > 0 ? (
              recentVendorBills.map((entry) => {
                const isPurchase = entry.type === 'PURCHASE';
                return (
                  <div
                    key={entry.id}
                    className="bg-slate-50 rounded-2xl p-3 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${isPurchase ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {isPurchase ? '📦 माल खरीद' : '💰 भुगतान'}
                        </span>
                        <span className="font-extrabold text-slate-900">{entry.vendorName}</span>
                        {entry.billImageUrl && (
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                            📸 बिल फोटो संलग्न
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {formatDateTime(entry.createdAt)} • {entry.itemName ? `${entry.itemName} (${entry.itemQuantity || ''} ${entry.itemUnit || ''})` : entry.description}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`font-black text-sm block ${isPurchase ? 'text-indigo-950' : 'text-emerald-700'}`}>
                        {formatCurrency(entry.amount)}
                      </span>
                      {isPurchase && (entry.dueAmount || 0) > 0 && (
                        <span className="text-[10px] font-bold text-rose-600 block">
                          बाकी: {formatCurrency(entry.dueAmount || 0)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                सप्लायर से माल खरीद दर्ज करने के लिए ऊपर '+ नया माल खरीद' दबाएँ।
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submodal for Vendor Purchase with Bill Upload */}
      <VendorPurchaseModal
        isOpen={isVendorPurchaseModalOpen}
        onClose={() => setIsVendorPurchaseModalOpen(false)}
      />
    </div>
  );
};
