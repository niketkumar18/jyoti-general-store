import React, { useState, useEffect } from 'react';
import { X, Building2, UserCheck, Shield, Phone, MapPin, Tag } from 'lucide-react';
import type { Vendor } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { syncVendorsToGoogleSheets } from '../../utils/googleSheetsSync';
import { db } from '../../db';

interface VendorFormModalProps {
  isOpen: boolean;
  vendorToEdit?: Vendor | null;
  onClose: () => void;
  onSave?: (savedVendor: Vendor) => void;
}

export const VendorFormModal: React.FC<VendorFormModalProps> = ({
  isOpen,
  vendorToEdit,
  onClose,
  onSave
}) => {
  const { language, t } = useLanguage();
  const { settings } = useSettings();

  const [firmName, setFirmName] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vendorToEdit) {
      setFirmName(vendorToEdit.firmName || '');
      setName(vendorToEdit.name || '');
      setMobile(vendorToEdit.mobile || '');
      setCategory(vendorToEdit.category || '');
      setAddress(vendorToEdit.address || '');
      setOpeningBalance(vendorToEdit.currentBalance || 0);
      setNotes(vendorToEdit.notes || '');
    } else {
      setFirmName('');
      setName('');
      setMobile('');
      setCategory('');
      setAddress('');
      setOpeningBalance(0);
      setNotes('');
    }
  }, [vendorToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && !firmName.trim()) {
      alert('कृपया सप्लायर का नाम या फर्म का नाम दर्ज करें');
      return;
    }

    setIsSubmitting(true);
    try {
      const displayName = name.trim() || firmName.trim();
      const cleanMobile = mobile.trim();
      const balanceNum = typeof openingBalance === 'number' && openingBalance >= 0 ? openingBalance : 0;

      if (vendorToEdit?.id) {
        // Editing existing vendor
        const updatedFields = {
          name: displayName,
          firmName: firmName.trim() || undefined,
          mobile: cleanMobile,
          category: category.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          updatedAt: Date.now()
        };
        await db.vendors.update(vendorToEdit.id, updatedFields);
        if (onSave) {
          onSave({ ...vendorToEdit, ...updatedFields });
        }
      } else {
        // Creating new vendor
        const newVendor: Omit<Vendor, 'id'> = {
          name: displayName,
          firmName: firmName.trim() || undefined,
          mobile: cleanMobile,
          category: category.trim() || undefined,
          address: address.trim() || undefined,
          currentBalance: balanceNum,
          totalPurchased: 0,
          totalPaid: 0,
          notes: notes.trim() || undefined,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        const newId = await db.vendors.add(newVendor as any);

        // If an opening balance was specified, create an opening ledger entry
        if (balanceNum > 0) {
          await db.vendorLedger.add({
            vendorId: newId as number,
            vendorName: firmName.trim() ? `${firmName.trim()} (${displayName})` : displayName,
            type: 'PURCHASE',
            amount: balanceNum,
            paidAmount: 0,
            balanceAfter: balanceNum,
            paymentMode: 'CASH',
            description: 'शुरुआती पुराना बकाया (Opening Balance Due)',
            createdAt: Date.now()
          });
        }

        if (onSave) {
          onSave({ ...newVendor, id: newId as number });
        }
      }

      if (settings.googleSheetsUrl) {
        syncVendorsToGoogleSheets(settings.googleSheetsUrl, settings.googleSheetDocumentUrl)
          .catch(e => console.error('Failed to sync vendor to Google Sheets:', e));
      }

      onClose();
    } catch (err) {
      console.error('Failed to save vendor:', err);
      alert('सप्लायर सुरक्षित करने में त्रुटि हुई');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[94dvh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {vendorToEdit ? 'सप्लायर विवरण सुधारें' : 'नया सप्लायर / महाजन जोड़ें'}
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                {vendorToEdit ? 'सप्लायर की जानकारी अपडेट करें' : 'थोक व्यापारी, डिस्ट्रीब्यूटर या एजेंसी'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Firm Name */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                फर्म / दुकान / एजेंसी का नाम
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="उदा. श्री गणेश ट्रेडिंग कंपनी"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Contact Person Name */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                सप्लायर / मालिक का नाम *
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="उदा. रमेश जी"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                मोबाइल नंबर (WhatsApp)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Category of Supply */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                सप्लाई की श्रेणी (Dealing In)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="उदा. अनाज, तेल, चीनी, मसाले"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              मंडी / शहर / दुकान का पता
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="उदा. मुख्य अनाज मंडी, दुकान नं. 12"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Opening Balance (Only shown when adding a new vendor) */}
          {!vendorToEdit && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5">
              <label className="block text-xs font-black text-amber-900 uppercase tracking-wider mb-1">
                शुरुआती पुराना बकाया (देना है - ₹)
              </label>
              <p className="text-[11px] text-amber-700 mb-2">
                यदि इस सप्लायर को पहले से कुछ रुपये देने बाकी हैं, तो यहाँ लिखें। (अन्यथा 0 रहने दें)
              </p>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-slate-500">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={openingBalance}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setOpeningBalance(isNaN(val as number) ? '' : val);
                  }}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 font-bold text-slate-900 border border-amber-300 rounded-xl text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              नोट्स / टिप्पणी (वैकल्पिक)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="सप्लायर से संबंधित कोई विशेष जानकारी..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-extrabold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>{vendorToEdit ? 'बदलाव सुरक्षित करें (Save Changes)' : 'सप्लायर जोड़ें (Add Vendor)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
