import React, { useState } from 'react';
import { Search, Camera, Plus, AlertCircle, Sparkles, Layers } from 'lucide-react';
import type { InventoryItem } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatUnit } from '../../utils/formatters';
import { useCategories } from '../../utils/categories';
import { CategoryManageModal } from '../inventory/CategoryManageModal';

interface ItemSearchGridProps {
  items: InventoryItem[];
  onAddToCart: (item: InventoryItem, qty?: number) => void;
  onOpenBarcodeScanner: () => void;
  onOpenQuickAddItem: () => void;
}

export const ItemSearchGrid: React.FC<ItemSearchGridProps> = ({
  items,
  onAddToCart,
  onOpenBarcodeScanner,
  onOpenQuickAddItem
}) => {
  const { language, t } = useLanguage();
  const { categories } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const allCategoriesList = [
    { id: 'all', nameHi: 'सभी सामान', nameEn: 'All Items' },
    ...categories
  ];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.nameHi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.barcode && item.barcode.includes(searchQuery));

    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search Bar + Scanner + Quick Add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_items_placeholder')}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Camera Barcode Scanner Button */}
        <button
          onClick={onOpenBarcodeScanner}
          title={t('scan_barcode')}
          className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm flex items-center justify-center transition-all active:scale-95 cursor-pointer"
        >
          <Camera className="w-5 h-5 text-emerald-400" />
        </button>

        {/* Fast 10-Second Item Creator */}
        <button
          onClick={onOpenQuickAddItem}
          className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('quick_add_product')}</span>
          <span className="sm:hidden">+ सामान</span>
        </button>
      </div>

      {/* Category Pills (Horizontal scroll) + Add Category button */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {allCategoriesList.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all select-none cursor-pointer ${
                isSelected
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {language === 'hi' ? cat.nameHi : cat.nameEn}
            </button>
          );
        })}

        {/* Add / Manage Categories Pill */}
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="px-2.5 py-1.5 rounded-full font-bold whitespace-nowrap bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-all flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-700" />
          <span>+ श्रेणी</span>
        </button>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 pb-10">
            {filteredItems.map((item) => {
              const isLowStock = item.stockQty <= item.lowStockThreshold;
              const isKgOrLitre = item.unit === 'KG' || item.unit === 'LITRE';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col justify-between shadow-sm hover:border-emerald-400 hover:shadow-md transition-all group"
                >
                  <div>
                    {/* Item Title */}
                    <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                      {item.nameHi || item.nameEn}
                    </h4>
                    {item.nameEn && item.nameHi && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {item.nameEn}
                      </p>
                    )}

                    {/* Stock Alert & Unit */}
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-slate-600 font-medium">
                        प्रति {formatUnit(item.unit, language)}
                      </span>
                      {isLowStock ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          <AlertCircle className="w-3 h-3" />
                          <span>स्टॉक {item.stockQty}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          स्टॉक: {item.stockQty}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Quick Add Actions */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold text-emerald-800">
                        {formatCurrency(item.salePrice)}
                      </span>
                      
                      {/* Standard + 1 Add button */}
                      <button
                        onClick={() => onAddToCart(item, 1)}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>जोड़ें</span>
                      </button>
                    </div>

                    {/* Fractional / Quick Weight Pills for Kirana ease */}
                    {isKgOrLitre ? (
                      <div className="flex items-center gap-1 pt-1 justify-between">
                        <button
                          onClick={() => onAddToCart(item, 0.25)}
                          className="flex-1 py-0.5 bg-slate-100 hover:bg-emerald-100 text-[10px] font-bold text-slate-700 hover:text-emerald-800 rounded border border-slate-200 cursor-pointer"
                          title="250 gm जोड़ें"
                        >
                          250g
                        </button>
                        <button
                          onClick={() => onAddToCart(item, 0.5)}
                          className="flex-1 py-0.5 bg-slate-100 hover:bg-emerald-100 text-[10px] font-bold text-slate-700 hover:text-emerald-800 rounded border border-slate-200 cursor-pointer"
                          title="500 gm जोड़ें"
                        >
                          500g
                        </button>
                        <button
                          onClick={() => onAddToCart(item, 2)}
                          className="flex-1 py-0.5 bg-slate-100 hover:bg-emerald-100 text-[10px] font-bold text-slate-700 hover:text-emerald-800 rounded border border-slate-200 cursor-pointer"
                          title="2 kg जोड़ें"
                        >
                          2kg
                        </button>
                        <button
                          onClick={() => onAddToCart(item, 5)}
                          className="flex-1 py-0.5 bg-slate-100 hover:bg-emerald-100 text-[10px] font-bold text-slate-700 hover:text-emerald-800 rounded border border-slate-200 cursor-pointer"
                          title="5 kg जोड़ें"
                        >
                          5kg
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 pt-1 justify-between">
                        <button
                          onClick={() => onAddToCart(item, 2)}
                          className="flex-1 py-0.5 bg-slate-100 hover:bg-emerald-100 text-[10px] font-bold text-slate-700 hover:text-emerald-800 rounded border border-slate-200 cursor-pointer"
                        >
                          +2
                        </button>
                        <button
                          onClick={() => onAddToCart(item, 5)}
                          className="flex-1 py-0.5 bg-slate-100 hover:bg-emerald-100 text-[10px] font-bold text-slate-700 hover:text-emerald-800 rounded border border-slate-200 cursor-pointer"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => onAddToCart(item, 10)}
                          className="flex-1 py-0.5 bg-slate-100 hover:bg-emerald-100 text-[10px] font-bold text-slate-700 hover:text-emerald-800 rounded border border-slate-200 cursor-pointer"
                        >
                          +10
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 text-base">
              {language === 'hi' ? 'कोई सामान नहीं मिला' : 'No items match your search'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {language === 'hi'
                ? 'नया सामान जोड़ने के लिए ऊपर "+ नया सामान जोड़ें" बटन दबाएं।'
                : 'Click "+ Quick Add Item" above to add this new product in 10 seconds.'}
            </p>
            <button
              onClick={onOpenQuickAddItem}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('quick_add_product')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Category Manager Modal */}
      <CategoryManageModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategorySelected={(newId) => {
          setSelectedCategory(newId);
          setIsCategoryModalOpen(false);
        }}
      />
    </div>
  );
};
