import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Building2, 
  UserPlus, 
  Search, 
  Download, 
  ArrowUpRight, 
  Eye, 
  Phone,
  PackagePlus,
  Edit2,
  Tag,
  AlertTriangle,
  Wallet,
  ShoppingBag,
  Plus,
  Trash2
} from 'lucide-react';
import { db } from '../../db';
import type { Vendor } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import { VendorPurchaseModal } from './VendorPurchaseModal';
import { VendorPaymentModal } from './VendorPaymentModal';
import { VendorLedgerModal } from './VendorLedgerModal';
import { VendorFormModal } from './VendorFormModal';
import { exportVendorKhataToCsv } from '../../utils/excelExport';

export const VendorKhataView: React.FC = () => {
  const { language, t } = useLanguage();
  const vendors = useLiveQuery(() => db.vendors.toArray()) || [];
  const vendorLedgerEntries = useLiveQuery(() => db.vendorLedger.toArray()) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDue, setFilterDue] = useState<'ALL' | 'DUE_ONLY' | 'CLEARED'>('ALL');

  // Modals state
  const [selectedVendorForLedger, setSelectedVendorForLedger] = useState<Vendor | null>(null);
  const [selectedVendorForPayment, setSelectedVendorForPayment] = useState<Vendor | null>(null);
  const [selectedVendorForPurchase, setSelectedVendorForPurchase] = useState<Vendor | null>(null);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showGlobalPurchaseModal, setShowGlobalPurchaseModal] = useState(false);

  // Financial Metrics
  const totalVendorDue = vendors.reduce(
    (sum, v) => sum + (v.currentBalance > 0 ? v.currentBalance : 0),
    0
  );
  const totalPurchases = vendors.reduce(
    (sum, v) => sum + (v.totalPurchased || 0),
    0
  );
  const totalPaymentsMade = vendors.reduce(
    (sum, v) => sum + (v.totalPaid || 0),
    0
  );
  const vendorsWithDue = vendors.filter((v) => v.currentBalance > 0);

  // Filtering
  const filteredVendors = vendors.filter((v) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (v.name && v.name.toLowerCase().includes(query)) ||
      (v.firmName && v.firmName.toLowerCase().includes(query)) ||
      (v.mobile && v.mobile.includes(query)) ||
      (v.category && v.category.toLowerCase().includes(query)) ||
      (v.address && v.address.toLowerCase().includes(query));

    let matchesFilter = true;
    if (filterDue === 'DUE_ONLY') {
      matchesFilter = v.currentBalance > 0;
    } else if (filterDue === 'CLEARED') {
      matchesFilter = v.currentBalance <= 0;
    }

    return matchesSearch && matchesFilter;
  });

  const handleExportAllVendors = () => {
    // Export combined vendor list to CSV
    exportVendorKhataToCsv(
      {
        name: 'सभी सप्लायर (All Vendors)',
        firmName: 'ज्योति जनरल स्टोर',
        mobile: '',
        currentBalance: totalVendorDue,
        totalPurchased: totalPurchases,
        totalPaid: totalPaymentsMade,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      vendorLedgerEntries
    );
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    if (!vendor.id) return;
    const confirmMsg = vendor.currentBalance > 0
      ? `⚠️ चेतावनी: सप्लायर "${vendor.firmName || vendor.name}" का ₹${vendor.currentBalance} बकाया देना बाकी है!\n\nक्या आप वाकई इस सप्लायर और इसके सभी खरीद/भुगतान लेजर को हटाना चाहते हैं?`
      : `क्या आप वाकई सप्लायर "${vendor.firmName || vendor.name}" को हटाना चाहते हैं?`;

    if (window.confirm(confirmMsg)) {
      try {
        await db.vendors.delete(vendor.id);
        await db.vendorLedger.where('vendorId').equals(vendor.id).delete();
      } catch (err) {
        console.error('Failed to delete vendor:', err);
        alert('सप्लायर हटाने में त्रुटि हुई');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 pb-24 sm:pb-6">
      {/* Top Section Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-400/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
              सप्लायर व स्टॉक प्रबंधन (Vendor & Stock Management)
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              थोक महाजनों का हिसाब, माल खरीद बिल फोटो अपलोड व देनदारी ट्रैकिंग
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedVendorForPurchase(null);
              setShowGlobalPurchaseModal(true);
            }}
            className="py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <PackagePlus className="w-4 h-4" />
            <span>+ नया माल खरीद व बिल अपलोड</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Total Vendor Due (देना है) */}
        <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              सप्लायर बकाया (महाजन को देना है)
            </p>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
              {formatCurrency(totalVendorDue)}
            </p>
            <p className="text-[11px] text-rose-700 font-semibold mt-0.5">
              {vendorsWithDue.length} सप्लायर का बकाया बाकी
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Purchases (कुल माल खरीद) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              कुल माल खरीद (Total Purchases)
            </p>
            <p className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1">
              {formatCurrency(totalPurchases)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              दुकान में आया कुल स्टॉक
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Total Paid (कुल भुगतान) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              कुल भुगतान (Total Paid)
            </p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
              {formatCurrency(totalPaymentsMade)}
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              नकद, UPI व बैंक द्वारा दिया गया
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Total Vendors Count */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              कुल सप्लायर / महाजन
            </p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {vendors.length}
            </p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              पंजीकृत थोक व्यापारी
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Filter Pills + Action Buttons */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="सप्लायर का नाम, फर्म, मोबाइल नंबर या सप्लाई श्रेणी खोजें..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            {/* Export CSV */}
            <button
              onClick={handleExportAllVendors}
              className="flex-1 sm:flex-initial py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              title="CSV डाउनलोड करें"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>

            {/* Add New Vendor */}
            <button
              onClick={() => {
                setVendorToEdit(null);
                setShowVendorForm(true);
              }}
              className="py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ नया सप्लायर</span>
            </button>

            {/* Add Stock Purchase Hero Button */}
            <button
              onClick={() => {
                setSelectedVendorForPurchase(null);
                setShowGlobalPurchaseModal(true);
              }}
              className="w-full sm:w-auto py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ नया माल खरीद (Stock Purchase)</span>
            </button>
          </div>
        </div>

        {/* Due Status Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs no-scrollbar pt-1">
          <button
            onClick={() => setFilterDue('ALL')}
            className={`px-3 py-1 rounded-full font-bold transition-all ${
              filterDue === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            सभी सप्लायर ({vendors.length})
          </button>

          <button
            onClick={() => setFilterDue('DUE_ONLY')}
            className={`px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1 ${
              filterDue === 'DUE_ONLY'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>बकाया बाकी (देना है): {vendorsWithDue.length}</span>
          </button>

          <button
            onClick={() => setFilterDue('CLEARED')}
            className={`px-3 py-1 rounded-full font-bold transition-all flex items-center gap-1 ${
              filterDue === 'CLEARED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>हिसाब चुकता (Clear)</span>
          </button>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
              <tr>
                <th className="p-3 sm:p-4">फर्म / सप्लायर विवरण</th>
                <th className="p-3">सप्लाई श्रेणी</th>
                <th className="p-3">कुल माल खरीद</th>
                <th className="p-3">वर्तमान बकाया (देना है)</th>
                <th className="p-3 text-right">कार्य (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors.length > 0 ? (
                filteredVendors.map((vendor) => {
                  const hasDue = (vendor.currentBalance || 0) > 0;
                  return (
                    <tr key={vendor.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Firm & Name */}
                      <td className="p-3 sm:p-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {vendor.firmName || vendor.name}
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                          {vendor.firmName && <span>मालिक: {vendor.name}</span>}
                          {vendor.mobile && <span>• 📞 {vendor.mobile}</span>}
                          {vendor.address && <span>• 📍 {vendor.address}</span>}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3">
                        {vendor.category ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {vendor.category}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>

                      {/* Total Purchased */}
                      <td className="p-3 font-semibold text-slate-700">
                        {formatCurrency(vendor.totalPurchased || 0)}
                      </td>

                      {/* Current Balance (देना है) */}
                      <td className="p-3">
                        {hasDue ? (
                          <span className="font-black text-base text-rose-600">
                            {formatCurrency(vendor.currentBalance)}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            चुकता (₹0)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Buy Stock */}
                          <button
                            onClick={() => {
                              setSelectedVendorForPurchase(vendor);
                              setShowGlobalPurchaseModal(true);
                            }}
                            className="py-1.5 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 flex items-center gap-1 transition-all"
                            title="इस सप्लायर से नया माल खरीदें"
                          >
                            <PackagePlus className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="hidden sm:inline">+ माल खरीद</span>
                          </button>

                          {/* Pay Dues */}
                          <button
                            onClick={() => setSelectedVendorForPayment(vendor)}
                            className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 transition-all"
                            title="सप्लायर को रुपये भुगतान करें"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>भुगतान करें</span>
                          </button>

                          {/* View Ledger */}
                          <button
                            onClick={() => setSelectedVendorForLedger(vendor)}
                            className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
                            title="खाता विवरण देखें"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span className="hidden sm:inline">खाता</span>
                          </button>

                          {/* Edit Vendor */}
                          <button
                            onClick={() => {
                              setVendorToEdit(vendor);
                              setShowVendorForm(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            title="सप्लायर विवरण सुधारें"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Vendor */}
                          <button
                            onClick={() => handleDeleteVendor(vendor)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="सप्लायर हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    कोई सप्लायर नहीं मिला। नया सप्लायर जोड़ने के लिए '+ नया सप्लायर' बटन दबाएँ।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submodals */}
      <VendorPurchaseModal
        isOpen={showGlobalPurchaseModal}
        initialVendorId={selectedVendorForPurchase?.id || null}
        onClose={() => {
          setShowGlobalPurchaseModal(false);
          setSelectedVendorForPurchase(null);
        }}
      />

      <VendorPaymentModal
        isOpen={Boolean(selectedVendorForPayment)}
        vendor={selectedVendorForPayment}
        onClose={() => setSelectedVendorForPayment(null)}
      />

      <VendorLedgerModal
        isOpen={Boolean(selectedVendorForLedger)}
        vendor={selectedVendorForLedger}
        onClose={() => setSelectedVendorForLedger(null)}
      />

      <VendorFormModal
        isOpen={showVendorForm}
        vendorToEdit={vendorToEdit}
        onClose={() => {
          setShowVendorForm(false);
          setVendorToEdit(null);
        }}
      />

      {/* Mobile Floating Action Button (+ नया माल खरीद) */}
      <div className="sm:hidden fixed bottom-6 right-4 z-30 animate-in slide-in-from-bottom-5 duration-200">
        <button
          onClick={() => {
            setSelectedVendorForPurchase(null);
            setShowGlobalPurchaseModal(true);
          }}
          className="py-3 px-4.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 active:scale-95 text-white font-black text-sm rounded-full shadow-2xl shadow-indigo-950/50 flex items-center gap-2 border-2 border-indigo-300/40 cursor-pointer"
        >
          <PackagePlus className="w-5 h-5" />
          <span>+ नया माल खरीद</span>
        </button>
      </div>
    </div>
  );
};
