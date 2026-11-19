import React, { useState } from 'react';
import { 
  Settings, 
  Store, 
  QrCode, 
  Printer, 
  Database, 
  Cloud, 
  Save, 
  Check, 
  Download, 
  Upload, 
  Volume2,
  ExternalLink,
  Camera,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { db } from '../../db';
import { initialSettings, sampleItems, sampleCustomers } from '../../db/seedData';

export const SettingsScreen: React.FC = () => {
  const { language, t } = useLanguage();
  const { settings, updateSettings, isSyncing, syncNow } = useSettings();

  const [formData, setFormData] = useState({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleManualSync = async () => {
    setSyncStatusMsg(null);
    try {
      const msg = await syncNow();
      setSyncStatusMsg(msg);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      setSyncStatusMsg('सिंक त्रुटि: ' + (err?.message || 'कनेक्शन विफल'));
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Full Database Backup to JSON file
  const handleExportBackup = async () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      items: await db.items.toArray(),
      customers: await db.customers.toArray(),
      invoices: await db.invoices.toArray(),
      ledger: await db.ledger.toArray(),
      settings: formData
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DEN_Kirana_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Database Restore from JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.items && json.customers) {
          if (confirm('क्या आप सचमुच डेटा रिस्टोर करना चाहते हैं? इससे मौजूदा डेटा ओवरराइट हो जाएगा।')) {
            await db.items.clear();
            await db.items.bulkAdd(json.items);
            await db.customers.clear();
            await db.customers.bulkAdd(json.customers);
            if (json.invoices) {
              await db.invoices.clear();
              await db.invoices.bulkAdd(json.invoices);
            }
            if (json.ledger) {
              await db.ledger.clear();
              await db.ledger.bulkAdd(json.ledger);
            }
            alert('डेटा सफलतापूर्वक रिस्टोर हो गया! पृष्ठ रीफ्रेश हो रहा है...');
            window.location.reload();
          }
        }
      } catch (err) {
        alert('अमान्य बैकअप फ़ाइल');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6 pb-28 sm:pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="font-black text-lg sm:text-xl text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-600" />
            <span>{t('settings_title')}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'hi'
              ? 'दुकान की जानकारी, UPI QR कोड, गूगल शीट सिंक और डेटा बैकअप'
              : 'Shop profile, UPI QR code, Google Sheets sync and data backups'}
          </p>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>सुरक्षित हो गया!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Shop Profile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2">
            <Store className="w-5 h-5 text-emerald-600" />
            <span>दुकान का विवरण (Shop Profile)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('shop_name')} (Hindi) *
              </label>
              <input
                type="text"
                required
                value={formData.shopNameHi || formData.shopName}
                onChange={(e) =>
                  setFormData({ ...formData, shopNameHi: e.target.value, shopName: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                दुकानदार का नाम (Owner Name)
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('shop_mobile')} *
              </label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                दुकान की टैगलाइन (Tagline)
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('shop_address')}
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GSTIN नंबर (वैकल्पिक)
              </label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="22AAAAA0000A1Z5"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                डिफ़ॉल्ट ग्राहक उधारी सीमा (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.defaultCreditLimit}
                onChange={(e) =>
                  setFormData({ ...formData, defaultCreditLimit: parseFloat(e.target.value) || 2000 })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: UPI QR & Printer */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            <span>UPI QR कोड एवं रसीद प्रिंटर</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('upi_id')} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  placeholder="उदा. 9876543210@paytm या shop@okhdfcbank"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {t('upi_id_hint')} (बिलिंग स्क्रीन पर इसी से डायनामिक QR कोड बनेगा)
                </p>
              </div>

              {/* Custom QR Code Image Upload */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>दुकान का QR कोड / स्टेंडी फोटो (Upload Standee)</span>
                  </label>
                  {formData.qrCodeImageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, qrCodeImageUrl: undefined })}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>हटाएं</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setFormData({
                            ...formData,
                            qrCodeImageUrl: event.target.result as string
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400">
                  यदि आपके पास PhonePe / Google Pay / Paytm का QR कोड या स्टेंडी फोटो है, तो उसे यहाँ अपलोड करें।
                </p>
              </div>
            </div>

            {/* Live QR Preview Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                QR कोड लाइव प्रीव्यू (Live Preview)
              </span>
              <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-200">
                {formData.qrCodeImageUrl ? (
                  <img
                    src={formData.qrCodeImageUrl}
                    alt="दुकान QR"
                    className="w-32 h-32 object-contain rounded-lg"
                  />
                ) : (
                  <QRCodeSVG
                    value={`upi://pay?pa=${formData.upiId || 'denpos@upi'}&pn=${encodeURIComponent(formData.shopName || 'Shop')}&cu=INR`}
                    size={120}
                    level="M"
                    includeMargin={true}
                  />
                )}
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-700">
                {formData.upiId || 'denpos@upi'}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('thermal_printer')}
              </label>
              <select
                value={formData.thermalPaperWidth}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    thermalPaperWidth: e.target.value as '58mm' | '80mm'
                  })
                }
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="80mm">80mm चौड़ा थर्मल पेपर (मानक)</option>
                <option value="58mm">58mm छोटा पॉकेट थर्मल प्रिंटर</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="enableSound"
                checked={formData.enableSound}
                onChange={(e) => setFormData({ ...formData, enableSound: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <label htmlFor="enableSound" className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-600" />
                <span>बारकोड स्कैन एवं बिल भुगतान पर ध्वनि (Beep/Chime) बजाएं</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Google Sheet Cloud Database (One Source of Truth) */}
        <div className="bg-emerald-50/80 rounded-3xl border-2 border-emerald-300 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-3">
            <div>
              <h3 className="font-extrabold text-emerald-950 text-base sm:text-lg flex items-center gap-2">
                <Cloud className="w-5 h-5 text-emerald-700" />
                <span>Google Sheet क्लाउड डेटाबेस (One Source of Truth)</span>
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                आपकी दुकान का 100% डेटा (बिल, ग्राहक, स्टॉक व सप्लायर) सीधे Google Sheet से जुड़ा हुआ है।
              </p>
            </div>
            <span className="text-xs font-black text-emerald-900 bg-emerald-200/90 px-3 py-1 rounded-full border border-emerald-300 flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>लाइव कनेक्टेड 🟢</span>
            </span>
          </div>

          {/* Quick Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Cloud className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                  मास्टर स्प्रेडशीट: <span className="text-emerald-800">Jyoti General Store DB</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  मोबाइल, लैपटॉप या सीधे शीट में कहीं भी जोड़ें या हटाएं — सब जगह तुरंत स्वतः सिंक होता है।
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <a
                href={formData.googleSheetDocumentUrl || 'https://docs.google.com/spreadsheets/d/1_RZUvzdgP4TUIVl0M0DyUTyyIgjkSmQ_nhlvgm781N0/edit?gid=1348342111#gid=1348342111'}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow flex items-center justify-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Sheet खोलें ↗</span>
              </a>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'सिंक हो रहा है...' : '🔄 ताज़ा करें (Sync)'}</span>
              </button>
            </div>
          </div>

          {syncStatusMsg && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {/* Simple Accordion for Advanced Sheet Settings */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
            >
              <span>{showAdvanced ? '▲ उन्नत विकल्प छुपाएं (Hide Advanced Settings)' : '▼ उन्नत विकल्प देखें (Google Sheet / Webhook URL)'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 bg-white rounded-2xl border border-emerald-200 space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Google Sheet Document URL:
                  </label>
                  <input
                    type="url"
                    value={formData.googleSheetDocumentUrl || ''}
                    onChange={(e) => setFormData({ ...formData, googleSheetDocumentUrl: e.target.value })}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Apps Script Webhook URL (Backend):
                  </label>
                  <input
                    type="url"
                    value={formData.googleSheetsUrl || ''}
                    onChange={(e) => setFormData({ ...formData, googleSheetsUrl: e.target.value })}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Backup & Restore */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <span>डेटा बैकअप एवं सुरक्षा (Offline Database)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExportBackup}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-all"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>{t('backup_data')}</span>
            </button>

            <label className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-200 cursor-pointer transition-all">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>{t('restore_data')}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="pt-2 sticky bottom-4 z-20">
          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-98 text-white font-black text-base rounded-2xl shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-400/30"
          >
            <Save className="w-5 h-5" />
            <span>{t('save_settings')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
