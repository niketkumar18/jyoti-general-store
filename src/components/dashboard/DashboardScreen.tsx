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
  Plus, 
  Receipt, 
  Scale, 
  Crown,
  ChevronRight,
  PackagePlus,
  Calculator,
  Calendar,
  Wallet,
  Gift,
  Monitor,
  CheckCircle2,
  FileText,
  X,
  CreditCard,
  UserPlus
} from 'lucide-react';
import { db } from '../../db';
import type { ActiveTab } from '../common/Navbar';
import type { Customer, Vendor } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { VendorPurchaseModal } from '../khata/VendorPurchaseModal';
import { ReceivePaymentModal } from '../khata/ReceivePaymentModal';
import { CalculatorModal } from '../common/CalculatorModal';

interface DashboardScreenProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();
  const { settings } = useSettings();

  // Modals state
  const [isVendorPurchaseModalOpen, setIsVendorPurchaseModalOpen] = useState(false);
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [selectedCustomerForReceive, setSelectedCustomerForReceive] = useState<Customer | null>(null);
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'ALL'>('ALL');

  // Live queries
  const invoices = useLiveQuery(() => db.invoices.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const vendors = useLiveQuery(() => db.vendors.toArray()) || [];
  const inventoryItems = useLiveQuery(() => db.items.toArray()) || [];
  const vendorLedgerEntries = useLiveQuery(() => db.vendorLedger.reverse().sortBy('createdAt')) || [];
  const customerLedgerEntries = useLiveQuery(() => db.ledger.reverse().sortBy('createdAt')) || [];

  // Date boundaries
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Inventory Cost Map
  const itemCostMap = useMemo(() => {
    const map = new Map<number, number>();
    inventoryItems.forEach((item) => {
      if (item.id) map.set(item.id, item.costPrice || 0);
    });
    return map;
  }, [inventoryItems]);

  // Financial Metrics (आप लेंगे, आप देंगे, स्टॉक, बिक्री, बैलेंस)
  const metrics = useMemo(() => {
    // 1. आप लेंगे (Customer Receivables)
    const aapLenge = customers.reduce(
      (sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0),
      0
    );

    // 2. आप देंगे (Vendor Payables)
    const aapDenge = vendors.reduce(
      (sum, v) => sum + (v.currentBalance > 0 ? v.currentBalance : 0),
      0
    );

    // 3. स्टॉक का मूल्य (Inventory Asset Value)
    const stockValuation = inventoryItems.reduce(
      (sum, item) => sum + ((item.costPrice || item.salePrice) * (item.stockQty || 0)),
      0
    );

    // 4. बिक्री (Sales)
    let todaySales = 0;
    let allTimeSales = 0;
    let totalCashReceived = 0;
    let totalUpiReceived = 0;

    invoices.forEach((inv) => {
      allTimeSales += inv.grandTotal;
      if (inv.createdAt >= startOfToday) {
        todaySales += inv.grandTotal;
      }
      if (inv.paymentMethod === 'CASH') totalCashReceived += inv.paidAmount;
      else if (inv.paymentMethod === 'UPI') totalUpiReceived += inv.paidAmount;
      else if (inv.paymentMethod === 'SPLIT') {
        totalCashReceived += (inv.paidAmount / 2);
        totalUpiReceived += (inv.paidAmount / 2);
      }
    });

    // 5. कुल बैलेंस (Cash + Bank Balance)
    const totalBalance = totalCashReceived + totalUpiReceived;

    return {
      aapLenge,
      aapDenge,
      stockValuation,
      todaySales,
      allTimeSales,
      totalBalance
    };
  }, [customers, vendors, inventoryItems, invoices, startOfToday]);

  // Unified Transactions List (Customers + Vendors combined)
  const allTransactions = useMemo(() => {
    type UnifiedTx = {
      id: string;
      title: string;
      subtitle: string;
      date: number;
      amount: number;
      type: 'INVOICE' | 'CUSTOMER_PAYMENT' | 'VENDOR_PURCHASE' | 'VENDOR_PAYMENT';
      isDue: boolean;
      dueAmount?: number;
      rawCustomer?: Customer;
    };

    const list: UnifiedTx[] = [];

    // Invoices
    invoices.forEach((inv) => {
      const isDue = inv.dueAmount > 0;
      list.push({
        id: `inv-${inv.id}`,
        title: inv.customerName || 'नकद ग्राहक (Walk-in)',
        subtitle: `बिल इनवॉइस #${inv.invoiceNumber}`,
        date: inv.createdAt,
        amount: inv.grandTotal,
        type: 'INVOICE',
        isDue,
        dueAmount: inv.dueAmount
      });
    });

    // Customer payments
    customerLedgerEntries.forEach((e) => {
      if (e.type === 'CREDIT') {
        list.push({
          id: `pay-${e.id}`,
          title: e.customerName,
          subtitle: `पेमेंट-इन जमा (${e.paymentMode || 'नकद'})`,
          date: e.createdAt,
          amount: e.amount,
          type: 'CUSTOMER_PAYMENT',
          isDue: false
        });
      }
    });

    // Vendor purchases
    vendorLedgerEntries.forEach((v) => {
      if (v.type === 'PURCHASE') {
        list.push({
          id: `vp-${v.id}`,
          title: v.vendorName,
          subtitle: `माल खरीद: ${v.itemName || v.description} ${v.billNumber ? `(#${v.billNumber})` : ''}`,
          date: v.createdAt,
          amount: v.amount,
          type: 'VENDOR_PURCHASE',
          isDue: (v.dueAmount || 0) > 0,
          dueAmount: v.dueAmount
        });
      }
    });

    // Sort newest first
    list.sort((a, b) => b.date - a.date);

    if (dateFilter === 'TODAY') {
      return list.filter((tx) => tx.date >= startOfToday);
    }
    return list.slice(0, 20); // Top 20 for instant responsiveness
  }, [invoices, customerLedgerEntries, vendorLedgerEntries, dateFilter, startOfToday]);

  return (
    <div className="max-w-2xl mx-auto p-3 sm:p-5 space-y-4 pb-28 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (BRAND & QUICK SHORTCUTS)                                    */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 cursor-pointer">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
            {settings.shopName?.toUpperCase().startsWith('M/S')
              ? settings.shopName
              : `M/S ${settings.shopName || 'JYOTI GENERAL STORE'}`}
          </h1>
          <span className="text-slate-400 text-xs">▼</span>
        </div>

        {/* Quick App Icons (Calculator, Gift, Desktop View) */}
        <div className="flex items-center gap-3 text-indigo-900">
          <button
            onClick={() => setIsCalculatorOpen(true)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="किराना कैलकुलेटर (Calculator)"
          >
            <Calculator className="w-5 h-5 text-indigo-700" />
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
            title="स्टॉक व ऑफर्स"
          >
            <Gift className="w-5 h-5 text-indigo-700" />
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors"
            title="डेस्कटॉप / रिपोर्ट्स"
          >
            <Monitor className="w-5 h-5 text-indigo-700" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROMO BANNER (Google Sheet One Source of Truth)                         */}
      {/* ========================================================================= */}
      {showBanner && (
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-md relative overflow-hidden">
          <button
            onClick={() => setShowBanner(false)}
            className="absolute top-2 right-2 text-white/70 hover:text-white p-1 rounded-full text-xs"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="pr-6 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>🟢 Google Sheet डेटाबेस (One Source of Truth) सक्रिय है!</span>
            </div>
            <p className="text-xs text-emerald-100">
              लैपटॉप, मोबाइल या सीधे Google Sheet में सामान, ग्राहक या बिल अपडेट करें — सब जगह तुरंत लाइव दिखेगा।
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={settings.googleSheetDocumentUrl || 'https://docs.google.com/spreadsheets/d/1_RZUvzdgP4TUIVl0M0DyUTyyIgjkSmQ_nhlvgm781N0/edit?gid=1348342111#gid=1348342111'}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-emerald-300 hover:bg-emerald-200 active:scale-95 text-emerald-950 font-black text-xs rounded-lg transition-all inline-flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <span>📊 Google Sheet खोलें ↗</span>
              </a>
              <button
                onClick={() => onNavigate('settings')}
                className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer"
              >
                <span>सेटिंग्स →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CORE 6-GRID FINANCIAL CARDS (EXACT MATCH TO USER SCREENSHOT)          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-3">
        {/* CARD 1: आप लेंगे (RECEIVABLES) - LIGHT GREEN */}
        <div
          onClick={() => onNavigate('khata')}
          className="bg-[#EDF8F2] border border-[#CDEEDC] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-start justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(metrics.aapLenge)}
            </p>
            <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-emerald-800 font-extrabold text-xs sm:text-sm">
            <span>आप लेंगे</span>
            <span className="text-emerald-700 text-base font-black">↓</span>
          </div>
        </div>

        {/* CARD 2: आप देंगे (PAYABLES) - LIGHT PINK */}
        <div
          onClick={() => onNavigate('vendors')}
          className="bg-[#FDEEED] border border-[#F9D2D0] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-start justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(metrics.aapDenge)}
            </p>
            <ChevronRight className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-rose-700 font-extrabold text-xs sm:text-sm">
            <span>आप देंगे</span>
            <span className="text-rose-600 text-base font-black">↑</span>
          </div>
        </div>

        {/* CARD 3: स्टॉक का मूल्य (STOCK ASSET) - WHITE CARD */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-slate-300 cursor-pointer transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                स्टॉक का मूल्य
              </p>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {formatCurrency(metrics.stockValuation)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {inventoryItems.length} आइटम्स का कुल मूल्य
          </p>
        </div>

        {/* CARD 4: बिक्री (TODAY'S SALE) - WHITE CARD */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-slate-300 cursor-pointer transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                आज की बिक्री
              </p>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {formatCurrency(metrics.todaySales)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            ऑल-टाइम: {formatCurrency(metrics.allTimeSales)}
          </p>
        </div>

        {/* CARD 5: कुल बैलेंस (CASH + BANK) - WHITE CARD */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-slate-300 cursor-pointer transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                कुल बैलेंस
              </p>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {formatCurrency(metrics.totalBalance)}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            कैश + ऑनलाइन बैलेंस
          </p>
        </div>

        {/* CARD 6: रिपोर्ट (REPORTS & PROFIT) - WHITE CARD */}
        <div
          onClick={() => onNavigate('reports')}
          className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs hover:border-slate-300 cursor-pointer transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                रिपोर्ट
              </p>
              <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                दुकान ऑडिट
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            सेल्स, पार्टी, मुनाफा...
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. UNLIMITED REPORTS STRIP (CROWN PROMO)                                  */}
      {/* ========================================================================= */}
      <div
        onClick={() => onNavigate('reports')}
        className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all shadow-2xs"
      >
        <div className="flex items-center gap-2.5">
          <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />
          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
            विस्तृत दैनिक व मासिक मुनाफा रिपोर्ट्स देखें
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>

      {/* ========================================================================= */}
      {/* 5. TRANSACTIONS LIST (सारा लेन देन)                                       */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900">
            सारा लेन देन (Transactions)
          </h2>

          {/* Date Range Pill */}
          <button
            onClick={() => setDateFilter(dateFilter === 'ALL' ? 'TODAY' : 'ALL')}
            className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-indigo-900 rounded-full text-xs font-extrabold shadow-2xs cursor-pointer hover:bg-slate-50"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>{dateFilter === 'TODAY' ? 'आज का लेन-देन' : 'पिछले 365 दिन'}</span>
          </button>
        </div>

        {/* Transaction Cards List */}
        <div className="space-y-2">
          {allTransactions.length > 0 ? (
            allTransactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
              >
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                    {tx.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tx.subtitle}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formatDateTime(tx.date)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-base font-black text-slate-900 block">
                    {formatCurrency(tx.amount)}
                  </span>
                  {tx.isDue ? (
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700">
                      बक़ाया ({formatCurrency(tx.dueAmount || 0)})
                    </span>
                  ) : (
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      चुकता
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">कोई लेन-देन नहीं मिला</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                नया बिल बनाने के लिए नीचे '+ बिल / इन्वॉइस' दबाएँ।
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. STICKY FLOATING BOTTOM ACTION BAR (EXACT MATCH TO USER SCREENSHOT)     */}
      {/* ========================================================================= */}
      <div className="fixed bottom-14 left-0 right-0 z-30 px-4 py-2 pointer-events-none">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2 pointer-events-auto">
          {/* LEFT BUTTON: पेमेंट-इन (Receive Payment) */}
          <button
            onClick={() => {
              setSelectedCustomerForReceive(null);
              setIsReceivePaymentOpen(true);
            }}
            className="flex-1 py-3 px-3 bg-[#242A38] hover:bg-slate-800 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>पेमेंट-इन</span>
          </button>

          {/* CENTER CIRCULAR PLUS BUTTON (+) */}
          <button
            onClick={() => setShowQuickActionMenu(true)}
            className="w-12 h-12 rounded-full bg-[#48BB78] hover:bg-emerald-600 active:scale-90 text-white flex items-center justify-center shadow-xl border-2 border-white transition-all cursor-pointer shrink-0"
            title="त्वरित मेन्यू"
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </button>

          {/* RIGHT BUTTON: + बिल / इन्वॉइस (Create New Bill) */}
          <button
            onClick={() => onNavigate('pos')}
            className="flex-1 py-3 px-3 bg-[#4C51BF] hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ बिल / इन्वॉइस</span>
          </button>
        </div>
      </div>

      {/* Quick Action Popup Menu (When Green Center + Button is clicked) */}
      {showQuickActionMenu && (
        <div 
          onClick={() => setShowQuickActionMenu(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-3 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-4 w-full max-w-sm space-y-2 mb-16 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase text-slate-500">त्वरित कार्य (Quick Action)</span>
              <button onClick={() => setShowQuickActionMenu(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setShowQuickActionMenu(false);
                onNavigate('pos');
              }}
              className="w-full p-3 bg-indigo-50 hover:bg-indigo-100 rounded-2xl flex items-center gap-3 text-left transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-black text-indigo-950 block">+ नया ग्राहक बिल बनाएं</span>
                <span className="text-[11px] text-indigo-700 font-medium">POS काउंटर बिक्री</span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowQuickActionMenu(false);
                setIsVendorPurchaseModalOpen(true);
              }}
              className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 rounded-2xl flex items-center gap-3 text-left transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <PackagePlus className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-black text-emerald-950 block">+ सप्लायर माल खरीद व बिल फोटो</span>
                <span className="text-[11px] text-emerald-700 font-medium">स्टॉक जोड़ें व सप्लायर उधारी</span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowQuickActionMenu(false);
                onNavigate('khata');
              }}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center gap-3 text-left transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-black text-slate-900 block">ग्राहक खाता बही</span>
                <span className="text-[11px] text-slate-500 font-medium">उधारी वसूली व WhatsApp तकादा</span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowQuickActionMenu(false);
                onNavigate('vendors');
              }}
              className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl flex items-center gap-3 text-left transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-900 text-white flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-black text-slate-900 block">सप्लायर / महाजन खाता</span>
                <span className="text-[11px] text-slate-500 font-medium">महाजन बकाया व भुगतान</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Submodal: Vendor Purchase with Bill Photo Upload */}
      <VendorPurchaseModal
        isOpen={isVendorPurchaseModalOpen}
        onClose={() => setIsVendorPurchaseModalOpen(false)}
      />

      {/* Submodal: Receive Payment (पेमेंट-इन) */}
      <ReceivePaymentModal
        isOpen={isReceivePaymentOpen}
        customer={selectedCustomerForReceive}
        onClose={() => {
          setIsReceivePaymentOpen(false);
          setSelectedCustomerForReceive(null);
        }}
      />

      {/* Submodal: Actual Interactive Calculator */}
      <CalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
};
