import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  DollarSign, 
  Layers, 
  Edit3, 
  Trash2, 
  ArrowUpDown,
  Barcode
} from 'lucide-react';
import { db } from '../../db';
import type { InventoryItem, CategoryType } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatUnit } from '../../utils/formatters';
import { ItemFormModal } from './ItemFormModal';
import { QuickStockAdjustModal } from './QuickStockAdjustModal';

export const InventoryScreen: React.FC = () => {
  const { language, t } = useLanguage();
  const items = useLiveQuery(() => db.items.toArray()) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [itemToAdjust, setItemToAdjust] = useState<InventoryItem | null>(null);

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.nameHi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.barcode && item.barcode.includes(searchQuery));

    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;

    const matchesLowStock = !onlyLowStock || item.stockQty <= item.lowStockThreshold;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Calculate metrics
  const totalStockValue = items.reduce(
    (sum, i) => sum + (i.stockQty * (i.costPrice || i.salePrice)),
    0
  );
  const lowStockCount = items.filter((i) => i.stockQty <= i.lowStockThreshold).length;

  const handleDeleteItem = async (item: InventoryItem) => {
    if (confirm(`क्या आप सचमुच "${item.nameHi || item.nameEn}" को हटाना चाहते हैं?`)) {
      if (item.id) {
        await db.items.delete(item.id);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Items */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {language === 'hi' ? 'कुल दर्ज सामान' : 'Total Catalog Items'}
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">{items.length}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('total_stock_value')}
            </p>
            <p className="text-2xl font-black text-emerald-800 mt-1">
              {formatCurrency(totalStockValue)}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div 
          onClick={() => setOnlyLowStock(!onlyLowStock)}
          className={`cursor-pointer rounded-2xl border p-4 shadow-sm flex items-center justify-between transition-all ${
            onlyLowStock 
              ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-500' 
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {t('low_stock_alert')}
            </p>
            <p className="text-2xl font-black text-rose-600 mt-1">{lowStockCount}</p>
            {lowStockCount > 0 && (
              <p className="text-[11px] text-rose-700 underline font-medium">
                {onlyLowStock ? 'सभी सामान देखें' : 'कम स्टॉक वाले सामान फ़िल्टर करें'}
              </p>
            )}
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Category + Add Product */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'hi' ? 'सामान का नाम या बारकोड खोजें...' : 'Search item name or barcode...'}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Quick Add Button */}
          <button
            onClick={() => {
              setItemToEdit(null);
              setIsFormOpen(true);
            }}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('add_10sec_item')}</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
              <tr>
                <th className="p-3 sm:p-4">सामान का नाम</th>
                <th className="p-3">श्रेणी (Category)</th>
                <th className="p-3">बिक्री दर (₹)</th>
                <th className="p-3">खरीद दर (₹)</th>
                <th className="p-3">स्टॉक स्थिति</th>
                <th className="p-3 text-right">कार्य (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isLow = item.stockQty <= item.lowStockThreshold;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 sm:p-4">
                        <div className="font-bold text-slate-900">
                          {item.nameHi || item.nameEn}
                        </div>
                        {item.nameEn && item.nameHi && (
                          <div className="text-xs text-slate-500">{item.nameEn}</div>
                        )}
                        {item.barcode && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Barcode className="w-3 h-3" />
                            <span>{item.barcode}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-xs text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded-md font-medium">
                          {item.category}
                        </span>
                      </td>

                      <td className="p-3 font-extrabold text-emerald-800">
                        {formatCurrency(item.salePrice)}
                        <span className="text-xs font-normal text-slate-500 ml-1">
                          / {formatUnit(item.unit, language)}
                        </span>
                      </td>

                      <td className="p-3 text-slate-600 font-semibold text-xs">
                        {item.costPrice ? formatCurrency(item.costPrice) : '—'}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black text-sm ${
                              isLow ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {item.stockQty} {item.unit}
                          </span>
                          {isLow && (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              <span>कम स्टॉक</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stock In / Out Adjustment Button */}
                          <button
                            onClick={() => {
                              setItemToAdjust(item);
                              setIsAdjustOpen(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-200"
                            title="स्टॉक जोड़ें या घटाएं"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">स्टॉक</span>
                          </button>

                          {/* Edit Item */}
                          <button
                            onClick={() => {
                              setItemToEdit(item);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="सुधारें"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                            title="हटाएं"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    कोई सामान नहीं मिला।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Modal */}
      <ItemFormModal
        isOpen={isFormOpen}
        itemToEdit={itemToEdit}
        onClose={() => {
          setIsFormOpen(false);
          setItemToEdit(null);
        }}
      />

      {/* Stock Adjust Modal */}
      <QuickStockAdjustModal
        isOpen={isAdjustOpen}
        item={itemToAdjust}
        onClose={() => {
          setIsAdjustOpen(false);
          setItemToAdjust(null);
        }}
      />
    </div>
  );
};
