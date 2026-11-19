import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  BookOpen, 
  UserPlus, 
  Search, 
  AlertTriangle, 
  Download, 
  ArrowDownLeft, 
  ArrowUpRight,
  Eye, 
  Phone,
  ShieldAlert,
  Edit2,
  Building2,
  Users,
  PackagePlus,
  Scale,
  Trash2
} from 'lucide-react';
import { db } from '../../db';
import type { Customer, RiskLevel, Vendor } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { deleteCustomerFromGoogleSheets } from '../../utils/googleSheetsSync';
import { formatCurrency } from '../../utils/formatters';
import { CreditBadge } from '../common/CreditBadge';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { ReceivePaymentModal } from './ReceivePaymentModal';
import { CustomerFormModal } from './CustomerFormModal';
import { VendorKhataView } from './VendorKhataView';
import { VendorPurchaseModal } from './VendorPurchaseModal';
import { VendorFormModal } from './VendorFormModal';
import { exportCustomerKhataToCsv } from '../../utils/excelExport';

export const KhataScreen: React.FC = () => {
  const { language, t } = useLanguage();
  const { settings } = useSettings();
  
  // Tab Switch: Customers Khata vs Vendors & Stock Khata
  const [activeTab, setActiveTab] = useState<'CUSTOMERS' | 'VENDORS'>('CUSTOMERS');

  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const ledgerEntries = useLiveQuery(() => db.ledger.toArray()) || [];
  const vendors = useLiveQuery(() => db.vendors.toArray()) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<'ALL' | RiskLevel>('ALL');

  // Customer Modals state
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<Customer | null>(null);
  const [selectedCustomerForReceive, setSelectedCustomerForReceive] = useState<Customer | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  // Vendor FAB Modals state
  const [showVendorPurchaseModal, setShowVendorPurchaseModal] = useState(false);
  const [showVendorFormModal, setShowVendorFormModal] = useState(false);

  // Financial Balances
  const totalCustomerUdhar = customers.reduce(
    (sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0),
    0
  );
  const totalVendorDue = vendors.reduce(
    (sum, v) => sum + (v.currentBalance > 0 ? v.currentBalance : 0),
    0
  );
  const netCreditBalance = totalCustomerUdhar - totalVendorDue;

  const highRiskCustomers = customers.filter((c) => c.riskLevel === 'danger');
  const warningCustomers = customers.filter((c) => c.riskLevel === 'warning');

  // Filtered customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobile.includes(searchQuery);

    const matchesRisk = filterRisk === 'ALL' || c.riskLevel === filterRisk;

    return matchesSearch && matchesRisk;
  });

  const handleExportCsv = () => {
    exportCustomerKhataToCsv(customers, ledgerEntries);
  };

  const handleDeleteCustomer = async (c: Customer) => {
    if (!c.id) return;
    const confirmMsg = c.currentBalance > 0
      ? `⚠️ चेतावनी: ग्राहक "${c.name}" का ₹${c.currentBalance} उधारी बकाया है!\n\nक्या आप वाकई इस ग्राहक और इसके खाते को हटाना चाहते हैं?`
      : `क्या आप वाकई ग्राहक "${c.name}" को हटाना चाहते हैं?`;

    if (window.confirm(confirmMsg)) {
      try {
        await db.customers.delete(c.id);
        await db.ledger.where('customerId').equals(c.id).delete();
        if (settings.googleSheetsUrl) {
          deleteCustomerFromGoogleSheets(settings.googleSheetsUrl, c, settings.googleSheetDocumentUrl);
        }
      } catch (err) {
        console.error('Failed to delete customer:', err);
        alert('ग्राहक हटाने में त्रुटि हुई');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 pb-24 sm:pb-6">
      {/* Dual Balance Summary Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Shop Balance Overview */}
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
                <Scale className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                दुकान खाता बही (Khata & Stock Ledger)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              ग्राहक उधारी (लेना है) एवं सप्लायर महाजन हिसाब (देना है)
            </p>
          </div>

          {/* Dual Balance Chips */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
            {/* Customer Receivable */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 block">
                बाज़ार उधारी (लेना है)
              </span>
              <span className="text-lg sm:text-xl font-black text-rose-300 mt-0.5 block">
                {formatCurrency(totalCustomerUdhar)}
              </span>
              <span className="text-[10px] text-slate-300">
                {customers.filter(c => c.currentBalance > 0).length} ग्राहक
              </span>
            </div>

            {/* Vendor Payable */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                महाजन बकाया (देना है)
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-300 mt-0.5 block">
                {formatCurrency(totalVendorDue)}
              </span>
              <span className="text-[10px] text-slate-300">
                {vendors.filter(v => v.currentBalance > 0).length} सप्लायर
              </span>
            </div>
          </div>
        </div>

        {/* Master Navigation Tabs */}
        <div className="flex gap-2 p-1.5 bg-slate-950/60 rounded-2xl mt-4 sm:mt-5 max-w-xl border border-white/5">
          <button
            onClick={() => setActiveTab('CUSTOMERS')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'CUSTOMERS'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 ग्राहक खाता ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('VENDORS')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'VENDORS'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>🏭 सप्लायर / महाजन खाता ({vendors.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CUSTOMERS KHATA VIEW                                               */}
      {/* ========================================================================= */}
      {activeTab === 'CUSTOMERS' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Customer Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Outstanding */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('total_market_debt')} (लेना है)
                </p>
                <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
                  {formatCurrency(totalCustomerUdhar)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            {/* Total Customers */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('total_customers')}
                </p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  {customers.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* High Risk (Red Zone) */}
            <div 
              onClick={() => setFilterRisk(filterRisk === 'danger' ? 'ALL' : 'danger')}
              className={`cursor-pointer rounded-2xl border p-4 shadow-sm flex items-center justify-between transition-all ${
                filterRisk === 'danger' 
                  ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-500' 
                  : 'bg-white border-slate-200 hover:border-rose-300'
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('high_risk_customers')}
                </p>
                <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
                  {highRiskCustomers.length}
                </p>
                {highRiskCustomers.length > 0 && (
                  <p className="text-[11px] text-rose-700 font-medium underline">
                    {filterRisk === 'danger' ? 'सभी ग्राहक देखें' : 'उधारी सीमा पार वाले देखें'}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Control Bar: Search + Risk Filters + Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_customer_khata')}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                {/* Export CSV */}
                <button
                  onClick={handleExportCsv}
                  className="flex-1 sm:flex-initial py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  title="CSV डाउनलोड करें"
                >
                  <Download className="w-4 h-4" />
                  <span>CSV एक्सपोर्ट</span>
                </button>

                {/* Add New Customer */}
                <button
                  onClick={() => {
                    setCustomerToEdit(null);
                    setShowCustomerForm(true);
                  }}
                  className="w-full sm:w-auto py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('add_new_customer')}</span>
                </button>
              </div>
            </div>

            {/* Risk Level Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto text-xs no-scrollbar pt-1">
              <button
                onClick={() => setFilterRisk('ALL')}
                className={`px-3 py-1 rounded-full font-bold transition-all ${
                  filterRisk === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                सभी ग्राहक ({customers.length})
              </button>

              <button
                onClick={() => setFilterRisk('danger')}
                className={`px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1 ${
                  filterRisk === 'danger'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>रेड जोन (जोखिम): {highRiskCustomers.length}</span>
              </button>

              <button
                onClick={() => setFilterRisk('warning')}
                className={`px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1 ${
                  filterRisk === 'warning'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>ध्यान दें (50-100%): {warningCustomers.length}</span>
              </button>

              <button
                onClick={() => setFilterRisk('safe')}
                className={`px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1 ${
                  filterRisk === 'safe'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>सुरक्षित (Safe)</span>
              </button>
            </div>
          </div>

          {/* Customer List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <tr>
                    <th className="p-3 sm:p-4">{t('customer_name')}</th>
                    <th className="p-3">{t('credit_limit')}</th>
                    <th className="p-3">{t('current_balance')} (लेना है)</th>
                    <th className="p-3">{t('risk_status')}</th>
                    <th className="p-3 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 sm:p-4">
                          <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>📞 {c.mobile}</span>
                            {c.address && <span>• {c.address}</span>}
                          </div>
                        </td>

                        <td className="p-3 font-semibold text-slate-700">
                          {formatCurrency(c.creditLimit)}
                        </td>

                        <td className="p-3">
                          <span className="font-black text-base text-rose-600">
                            {formatCurrency(c.currentBalance)}
                          </span>
                        </td>

                        <td className="p-3">
                          <CreditBadge riskLevel={c.riskLevel} />
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Ledger */}
                            <button
                              onClick={() => setSelectedCustomerForLedger(c)}
                              className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
                              title="खाता विवरण देखें"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              <span className="hidden sm:inline">{t('view_ledger')}</span>
                            </button>

                            {/* Receive Payment */}
                            <button
                              onClick={() => setSelectedCustomerForReceive(c)}
                              className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 transition-all"
                              title="रुपये जमा करें"
                            >
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              <span>{t('receive_payment')}</span>
                            </button>

                            {/* Edit Customer */}
                            <button
                              onClick={() => {
                                setCustomerToEdit(c);
                                setShowCustomerForm(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="ग्राहक विवरण सुधारें"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Customer */}
                            <button
                              onClick={() => handleDeleteCustomer(c)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="ग्राहक हटाएं"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        कोई ग्राहक नहीं मिला।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Ledger Modal */}
          <CustomerLedgerModal
            isOpen={Boolean(selectedCustomerForLedger)}
            customer={selectedCustomerForLedger}
            onClose={() => setSelectedCustomerForLedger(null)}
          />

          {/* Receive Payment Modal */}
          <ReceivePaymentModal
            isOpen={Boolean(selectedCustomerForReceive)}
            customer={selectedCustomerForReceive}
            onClose={() => setSelectedCustomerForReceive(null)}
          />

          {/* Add / Edit Customer Modal */}
          <CustomerFormModal
            isOpen={showCustomerForm}
            customerToEdit={customerToEdit}
            onClose={() => {
              setShowCustomerForm(false);
              setCustomerToEdit(null);
            }}
          />

          {/* Mobile Floating Action Button (+ नया ग्राहक) */}
          <div className="sm:hidden fixed bottom-6 right-4 z-30 animate-in slide-in-from-bottom-5 duration-200">
            <button
              onClick={() => {
                setCustomerToEdit(null);
                setShowCustomerForm(true);
              }}
              className="py-3 px-4.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 active:scale-95 text-white font-black text-sm rounded-full shadow-2xl shadow-emerald-950/50 flex items-center gap-2 border-2 border-emerald-300/40 cursor-pointer"
            >
              <UserPlus className="w-5 h-5" />
              <span>+ नया ग्राहक</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VENDORS / SUPPLIER KHATA & STOCK VIEW                              */}
      {/* ========================================================================= */}
      {activeTab === 'VENDORS' && (
        <div className="animate-in fade-in duration-200">
          <VendorKhataView />

          {/* Mobile Floating Action Button for Vendor (+ माल खरीद) */}
          <div className="sm:hidden fixed bottom-6 right-4 z-30 flex flex-col items-end gap-2 animate-in slide-in-from-bottom-5 duration-200">
            <button
              onClick={() => setShowVendorPurchaseModal(true)}
              className="py-3 px-4.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 active:scale-95 text-white font-black text-sm rounded-full shadow-2xl shadow-indigo-950/50 flex items-center gap-2 border-2 border-indigo-300/40 cursor-pointer"
            >
              <PackagePlus className="w-5 h-5" />
              <span>+ नया माल खरीद</span>
            </button>
          </div>

          <VendorPurchaseModal
            isOpen={showVendorPurchaseModal}
            onClose={() => setShowVendorPurchaseModal(false)}
          />

          <VendorFormModal
            isOpen={showVendorFormModal}
            onClose={() => setShowVendorFormModal(false)}
          />
        </div>
      )}
    </div>
  );
};
