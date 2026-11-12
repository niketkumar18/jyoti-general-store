import React, { useState } from 'react';
import { 
  Settings, 
  Store, 
  QrCode, 
  Printer, 
  Database, 
  Cloud, 
  Save, 
  Copy, 
  Check, 
  RefreshCw, 
  Download, 
  Upload, 
  HelpCircle,
  Volume2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '../../utils/googleSheetsSync';
import { db } from '../../db';
import { initialSettings, sampleItems, sampleCustomers } from '../../db/seedData';

export const SettingsScreen: React.FC = () => {
  const { language, t } = useLanguage();
  const { settings, updateSettings, isSyncing, syncNow } = useSettings();

  const [formData, setFormData] = useState({ ...settings });
  const [copiedCode, setCopiedCode] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6 pb-16">
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
                step="500"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* Section 3: Google Sheets Free Database Sync */}
        <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
            <h3 className="font-bold text-emerald-950 text-base flex items-center gap-2">
              <Cloud className="w-5 h-5 text-emerald-700" />
              <span>{t('google_sheets_sync')}</span>
            </h3>
            <span className="text-[11px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
              100% ₹0 Cost Forever
            </span>
          </div>

          <p className="text-xs text-emerald-900 leading-relaxed">
            आपके दुकान का सारा डेटा (बिल, ग्राहक खाता, और बिक्री) आपकी खुद की निजी गूगल शीट में स्वतः सेव होता है। आप अपने फोन में गूगल शीट खोलकर कभी भी पूरा हिसाब देख और प्रिंट कर सकते हैं।
          </p>

          <div>
            <label className="block text-xs font-bold text-emerald-950 mb-1">
              {t('sheets_webhook_url')}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={formData.googleSheetsUrl || ''}
                onChange={(e) => setFormData({ ...formData, googleSheetsUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={syncNow}
                disabled={isSyncing || !formData.googleSheetsUrl}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>अभी सिंक करें</span>
              </button>
            </div>
          </div>

          {/* Setup Guide Button */}
          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="text-xs font-bold text-emerald-800 underline flex items-center gap-1 hover:text-emerald-950"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{t('sheets_guide_btn')} (2-मिनट सेटअप)</span>
          </button>
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
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-98 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-5 h-5" />
            <span>{t('save_settings')}</span>
          </button>
        </div>
      </form>

      {/* Google Sheets Setup Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Cloud className="w-5 h-5 text-emerald-300" />
                <span>Google Sheets 2-मिनट फ्री सिंक सेटअप</span>
              </h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-white/80 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900 font-semibold">
                इस प्रक्रिया में ₹0 खर्च होता है। किसी पेड सर्वर या थर्ड-पार्टी की जरूरत नहीं है।
              </div>

              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  अपने Google खाते में नई शीट बनाएं:{' '}
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 font-bold underline"
                  >
                    sheets.new खोलें
                  </a>
                </li>
                <li>
                  ऊपर मेनू में <strong>Extensions (एक्सटेंशन)</strong> &gt;{' '}
                  <strong>Apps Script</strong> पर क्लिक करें।
                </li>
                <li>
                  वहां पहले से मौजूद कोड को हटाकर नीचे दिया गया कोड पूरी तरह पेस्ट करें:
                </li>
              </ol>

              {/* Code Box */}
              <div className="relative">
                <div className="absolute right-2 top-2">
                  <button
                    onClick={handleCopyCode}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 shadow"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'कॉपी हो गया!' : 'कोड कॉपी करें'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                  {GOOGLE_APPS_SCRIPT_TEMPLATE}
                </pre>
              </div>

              <ol start={4} className="list-decimal pl-5 space-y-2">
                <li>ऊपर नीले <strong>Deploy</strong> बटन पर क्लिक कर <strong>New deployment</strong> चुनें।</li>
                <li>Gear (⚙️) आइकन पर क्लिक करके <strong>Web app</strong> चुनें।</li>
                <li><strong>Execute as:</strong> "Me" और <strong>Who has access:</strong> "Anyone" रखें।</li>
                <li><strong>Deploy</strong> पर क्लिक करें और मिली <strong>Web app URL</strong> को कॉपी कर ऊपर सेटिंग्स में पेस्ट कर दें!</li>
              </ol>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl"
              >
                समझ गया, बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
