import React from 'react';
import { 
  LayoutDashboard,
  ShoppingCart, 
  Package, 
  BookOpen, 
  Building2,
  BarChart3, 
  Settings, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Languages, 
  Store,
  Users,
  MoreHorizontal
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSettings } from '../../context/SettingsContext';

export type ActiveTab = 'dashboard' | 'pos' | 'inventory' | 'khata' | 'vendors' | 'reports' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onSyncNotification: (msg: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSyncNotification
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const { settings, isOnline, isSyncing, syncNow } = useSettings();

  const handleManualSync = async () => {
    const msg = await syncNow();
    onSyncNotification(msg);
  };

  // Full Navigation Items (Desktop & Tablet)
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: '🏠 होम (डैशबोर्ड)', icon: <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'pos', label: '🛒 नया बिल (POS)', icon: <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'inventory', label: '📦 स्टॉक / सामान', icon: <Package className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'khata', label: '👥 ग्राहक खाता', icon: <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'vendors', label: '🏭 सप्लायर / महाजन', icon: <Building2 className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'reports', label: '📊 मुनाफा रिपोर्ट', icon: <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { id: 'settings', label: '⚙️ सेटिंग्स व सिंक', icon: <Settings className="w-4 h-4 sm:w-5 sm:h-5" /> },
  ];

  // Mobile App Bottom Bar Items (Matching user's mobile app screenshot)
  const mobileBottomItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'डैशबोर्ड', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'khata', label: 'पार्टी (खाता)', icon: <Users className="w-5 h-5" /> },
    { id: 'vendors', label: 'सप्लायर', icon: <Building2 className="w-5 h-5" /> },
    { id: 'inventory', label: 'आइटम (स्टॉक)', icon: <Package className="w-5 h-5" /> },
    { id: 'reports', label: 'रिपोर्ट्स', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: 'और अधिक', icon: <MoreHorizontal className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="bg-emerald-900 text-white shadow-lg sticky top-0 z-40 border-b border-emerald-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
          {/* Brand Logo & Name */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            title="डैशबोर्ड (होम) पर जाएं"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-md shadow-emerald-950/40 border border-emerald-300/30 group-hover:scale-105 transition-transform shrink-0">
              <Store className="w-5 h-5 text-slate-950 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                  DEN <span className="text-emerald-300 font-semibold text-xs sm:text-sm">किराना POS</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] uppercase font-bold tracking-wider bg-emerald-800 text-emerald-200 rounded border border-emerald-700">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 line-clamp-1 max-w-[170px] sm:max-w-xs font-medium">
                {language === 'hi' ? settings.shopNameHi || settings.shopName : settings.shopName}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Online/Offline Status Indicator */}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${
                isOnline
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                  : 'bg-amber-950/60 text-amber-300 border-amber-700/60'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span className="hidden sm:inline">{t('online_status')}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span className="hidden sm:inline">{t('offline_status')}</span>
                </>
              )}
            </div>

            {/* Sync Button */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              title={t('sync_now')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-emerald-100 rounded-lg text-xs font-semibold border border-emerald-700 shadow-sm transition-all ${
                isSyncing ? 'opacity-80 cursor-wait' : ''
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">
                {isSyncing ? 'सिंक हो रहा...' : t('synced')}
              </span>
            </button>

            {/* Bilingual Language Switcher Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 bg-white text-emerald-950 hover:bg-emerald-50 active:scale-95 px-2.5 py-1.5 rounded-lg text-xs font-extrabold shadow-sm border border-white/20 transition-all cursor-pointer"
              title="Toggle Hindi / English"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-700" />
              <span>{language === 'hi' ? 'हिंदी' : 'EN'}</span>
            </button>
          </div>
        </div>

        {/* Top Navigation Tabs Bar (Visible on all screens, scrollable) */}
        <nav className="bg-emerald-950/90 backdrop-blur border-t border-emerald-800/60">
          <div className="max-w-7xl mx-auto px-1 sm:px-6 flex items-center justify-between overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex-1 min-w-[85px] sm:min-w-0 py-2 sm:py-2.5 px-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-extrabold border-b-2 transition-all select-none cursor-pointer ${
                    isActive
                      ? 'border-emerald-400 text-emerald-300 bg-emerald-900/60'
                      : 'border-transparent text-emerald-100/70 hover:text-white hover:bg-emerald-900/30'
                  }`}
                >
                  <span className={isActive ? 'text-emerald-300' : 'text-emerald-400/80'}>
                    {item.icon}
                  </span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Mobile App Bottom Navigation Bar (Fixed at bottom on small screens) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-2xl py-1.5 px-2 flex items-center justify-around">
        {mobileBottomItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-indigo-600 font-black' : 'text-slate-500 font-semibold hover:text-slate-900'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-indigo-50 text-indigo-700' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
