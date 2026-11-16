import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Plus, Layers, Trash2, Tag, Check, Sparkles } from 'lucide-react';
import { db } from '../../db';
import { useLanguage } from '../../context/LanguageContext';
import { useCategories } from '../../utils/categories';

interface CategoryManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategorySelected?: (categoryId: string) => void;
}

export const CategoryManageModal: React.FC<CategoryManageModalProps> = ({
  isOpen,
  onClose,
  onCategorySelected
}) => {
  const { language } = useLanguage();
  const { categories, addCategory, deleteCategory } = useCategories();
  const items = useLiveQuery(() => db.items.toArray()) || [];

  const [nameHi, setNameHi] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!nameHi.trim() && !nameEn.trim()) {
      setErrorMsg('कृपया श्रेणी का नाम दर्ज करें');
      return;
    }

    setIsSubmitting(true);
    try {
      const newCat = await addCategory(
        nameHi.trim() || nameEn.trim(),
        nameEn.trim() || nameHi.trim()
      );
      setNameHi('');
      setNameEn('');
      setSuccessMsg(`श्रेणी "${newCat.nameHi}" सफलतापूर्वक जोड़ दी गई!`);

      if (onCategorySelected) {
        onCategorySelected(newCat.id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'श्रेणी जोड़ने में विफल');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    const itemsCount = items.filter((i) => i.category === categoryId).length;
    let message = `क्या आप सचमुच श्रेणी "${categoryName}" को हटाना चाहते हैं?`;
    if (itemsCount > 0) {
      message += `\n⚠️ ध्यान दें: इस श्रेणी में अभी ${itemsCount} सामान दर्ज हैं।`;
    }

    if (confirm(message)) {
      await deleteCategory(categoryId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/80 rounded-xl">
              <Layers className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-black text-lg">
                {language === 'hi' ? 'सामान श्रेणियां प्रबंधित करें' : 'Manage Product Categories'}
              </h3>
              <p className="text-emerald-200 text-xs">
                {language === 'hi'
                  ? 'दुकान के सामान को व्यवस्थित करने हेतु नई श्रेणियां बनाएं'
                  : 'Add or manage custom inventory categories'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
          {/* Quick Add Form */}
          <form
            onSubmit={handleAdd}
            className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 space-y-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 uppercase">
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>+ नई श्रेणी जोड़ें (Add New Category)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  श्रेणी का नाम (हिंदी) *
                </label>
                <input
                  type="text"
                  placeholder="उदा. पूजा सामग्री, बेकरी, सब्जियां"
                  value={nameHi}
                  onChange={(e) => setNameHi(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Category Name (English)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pooja Samagri, Bakery"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>
            )}
            {successMsg && (
              <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{successMsg}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ श्रेणी सुरक्षित करें (Save Category)</span>
            </button>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>मौजूदा श्रेणियां ({categories.length})</span>
              </span>
              <span className="text-slate-400 font-normal">
                डिफ़ॉल्ट व आपके द्वारा जोड़ी गई
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((cat) => {
                const count = items.filter((i) => i.category === cat.id).length;

                return (
                  <div
                    key={cat.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {cat.nameHi}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {cat.nameEn} • {count} सामान
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {cat.isDefault ? (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                          डिफ़ॉल्ट
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDelete(cat.id, cat.nameHi)}
                          title="श्रेणी हटाएं"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0 sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            पूर्ण (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
