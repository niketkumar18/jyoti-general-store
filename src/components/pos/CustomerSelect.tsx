import React, { useState } from 'react';
import { User, UserPlus, Phone, Search, X } from 'lucide-react';
import type { Customer } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { CreditBadge } from '../common/CreditBadge';
import { formatCurrency } from '../../utils/formatters';
import { db } from '../../db';

interface CustomerSelectProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onCustomerCreated?: (newCustomer: Customer) => void;
}

export const CustomerSelect: React.FC<CustomerSelectProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onCustomerCreated
}) => {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobile.includes(searchQuery)
  );

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCustomerData: Omit<Customer, 'id'> = {
      name: newCustName.trim(),
      mobile: newCustMobile.trim() || '0000000000',
      creditLimit: 2000,
      currentBalance: 0,
      riskLevel: 'safe',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const newId = await db.customers.add(newCustomerData as any);
    const created: Customer = { ...newCustomerData, id: newId as number };
    
    if (onCustomerCreated) {
      onCustomerCreated(created);
    }
    onSelectCustomer(created);
    setShowQuickAdd(false);
    setIsOpen(false);
    setNewCustName('');
    setNewCustMobile('');
  };

  return (
    <div className="relative">
      <label className="block text-xs font-bold text-slate-700 mb-1">
        {t('customer_select_label')}
      </label>

      {/* Selected Box or Selector Trigger */}
      {selectedCustomer ? (
        <div className="bg-emerald-50 border-2 border-emerald-500 rounded-xl p-2.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow">
              {selectedCustomer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  {selectedCustomer.name}
                </span>
                <CreditBadge riskLevel={selectedCustomer.riskLevel} />
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span>📞 {selectedCustomer.mobile}</span>
                <span>•</span>
                <span>
                  {t('current_balance')}: <strong className="text-slate-900">{formatCurrency(selectedCustomer.currentBalance)}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectCustomer(null)}
            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-200/60"
            title="ग्राहक हटाएं (Change to Cash)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full bg-white border border-slate-300 hover:border-emerald-500 text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between text-slate-700 shadow-sm transition-all"
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">{t('select_or_search_customer')}</span>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
            {t('cash_customer')}
          </span>
        </button>
      )}

      {/* Dropdown Modal / Popover */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                <span>{language === 'hi' ? 'ग्राहक चुनें या नया जोड़ें' : 'Select or Add Customer'}</span>
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Cash Customer Button */}
            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <button
                onClick={() => {
                  onSelectCustomer(null);
                  setIsOpen(false);
                }}
                className="w-full py-2 px-3 bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-400 rounded-xl text-left text-sm font-semibold flex items-center justify-between text-slate-800"
              >
                <span>🏷️ {t('cash_customer')}</span>
                <span className="text-xs text-slate-500">उधार खाता नहीं</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'hi' ? 'नाम या मोबाइल से खोजें...' : 'Search by name or phone...'}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Customer List */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c);
                      setIsOpen(false);
                    }}
                    className="w-full p-2.5 hover:bg-slate-50 rounded-xl flex items-center justify-between text-left transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                        <CreditBadge riskLevel={c.riskLevel} />
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>📞 {c.mobile}</span>
                        {c.address && <span>• {c.address}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">{t('current_balance')}</div>
                      <div className="text-sm font-bold text-slate-900">
                        {formatCurrency(c.currentBalance)}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm">
                  {language === 'hi' ? 'कोई ग्राहक नहीं मिला' : 'No customer found'}
                </div>
              )}
            </div>

            {/* On-the-fly Add Customer Section */}
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              {!showQuickAdd ? (
                <button
                  onClick={() => {
                    setShowQuickAdd(true);
                    if (searchQuery && /^\d+$/.test(searchQuery)) {
                      setNewCustMobile(searchQuery);
                    } else if (searchQuery) {
                      setNewCustName(searchQuery);
                    }
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 shadow"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{language === 'hi' ? '+ नया ग्राहक तुरंत जोड़ें' : '+ Create New Customer'}</span>
                </button>
              ) : (
                <form onSubmit={handleQuickAddCustomer} className="space-y-2">
                  <div className="text-xs font-bold text-slate-700">
                    {language === 'hi' ? 'नया ग्राहक विवरण:' : 'New Customer Details:'}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={language === 'hi' ? 'ग्राहक का नाम *' : 'Customer Name *'}
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    type="tel"
                    placeholder={language === 'hi' ? '10 अंकों का मोबाइल नंबर' : '10-digit mobile number'}
                    value={newCustMobile}
                    onChange={(e) => setNewCustMobile(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowQuickAdd(false)}
                      className="flex-1 py-1.5 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg"
                    >
                      {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow"
                    >
                      {language === 'hi' ? 'सुरक्षित करें व चुनें' : 'Save & Select'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
