import React, { useState, useEffect } from 'react';
import { X, UserCheck, UserPlus, Shield } from 'lucide-react';
import type { Customer } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { calculateRiskLevel } from '../../utils/formatters';
import { db } from '../../db';

interface CustomerFormModalProps {
  isOpen: boolean;
  customerToEdit?: Customer | null;
  onClose: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  customerToEdit,
  onClose
}) => {
  const { language, t } = useLanguage();
  const { settings } = useSettings();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(settings.defaultCreditLimit || 2000);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setMobile(customerToEdit.mobile);
      setAddress(customerToEdit.address || '');
      setCreditLimit(customerToEdit.creditLimit);
      setNotes(customerToEdit.notes || '');
    } else {
      setName('');
      setMobile('');
      setAddress('');
      setCreditLimit(settings.defaultCreditLimit || 2000);
      setNotes('');
    }
  }, [customerToEdit, isOpen, settings.defaultCreditLimit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('कृपया ग्राहक का नाम दर्ज करें');
      return;
    }

    const cleanMobile = mobile.trim() || '0000000000';
    const limitNum = Number(creditLimit) || 2000;

    if (customerToEdit?.id) {
      const risk = calculateRiskLevel(customerToEdit.currentBalance, limitNum);
      await db.customers.update(customerToEdit.id, {
        name: name.trim(),
        mobile: cleanMobile,
        address: address.trim(),
        creditLimit: limitNum,
        riskLevel: risk,
        notes: notes.trim(),
        updatedAt: Date.now()
      });
    } else {
      const newCustomer: Omit<Customer, 'id'> = {
        name: name.trim(),
        mobile: cleanMobile,
        address: address.trim(),
        creditLimit: limitNum,
        currentBalance: 0,
        riskLevel: 'safe',
        notes: notes.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await db.customers.add(newCustomer as any);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-300" />
            <h3 className="font-extrabold text-base sm:text-lg">
              {customerToEdit
                ? language === 'hi' ? 'ग्राहक विवरण सुधारें' : 'Edit Customer'
                : t('add_new_customer')}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('customer_name')} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="उदा. रमेश कुमार (वर्मा जी)"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('customer_mobile')}
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10 अंकों का मोबाइल नंबर"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('credit_limit')} (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                required
                min="0"
                step="500"
                value={creditLimit}
                onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-extrabold text-emerald-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              इस सीमा से अधिक उधारी होने पर सिस्टम 🔴 रेड अलर्ट चेतावनी देगा।
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              पता / गली / मोहल्ला (Address)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="उदा. मकान नं. 14, गली 3"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              अतिरिक्त टिप्पणी (Notes)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="उदा. हर महीने की 1 तारीख को भुगतान करते हैं"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>ग्राहक सुरक्षित करें</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
