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
  Store
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

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'pos', label: t('nav_pos'), icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'inventory', label: t('nav_inventory'), icon: <Package className="w-5 h-5" /> },
    { id: 'khata', label: t('nav_khata'), icon: <BookOpen className="w-5 h-5" /> },
    { id: 'vendors', label: t('nav_vendors'), icon: <Building2 className="w-5 h-5" /> },
    { id: 'reports', label: t('nav_reports'), icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: t('nav_settings'), icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <header className="bg-emerald-900 text-white shadow-lg sticky top-0 z-40 border-b border-emerald-800">
      {/* Top Bar: Brand, Status, Sync, Lang */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Brand / Shop Identity */}
        <div 
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer group select-none"
          title="डैशबोर्ड (होम) पर जाएं"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-md shadow-emerald-950/40 border border-emerald-300/30 group-hover:scale-105 transition-transform">
            <Store className="w-6 h-6 text-slate-950 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                DEN <span className="text-emerald-300 font-semibold text-xs sm:text-sm">किराना POS</span>
              </span>
              <span className="hidden md:inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-emerald-800/80 text-emerald-200 rounded border border-emerald-700">
                v1.0 • ₹0 Offline
              </span>
            </div>
            <p className="text-xs text-emerald-200 line-clamp-1 max-w-[200px] sm:max-w-xs font-medium">
              {language === 'hi' ? settings.shopNameHi || settings.shopName : settings.shopName}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Online/Offline Status Indicator */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-700/60'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('online_status')}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{t('offline_status')}</span>
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
            className="flex items-center gap-1.5 bg-white text-emerald-950 hover:bg-emerald-50 active:scale-95 px-3 py-1.5 rounded-lg text-xs font-extrabold shadow-md border border-white/20 transition-all cursor-pointer"
            title="Toggle Hindi / English"
          >
            <Languages className="w-4 h-4 text-emerald-700" />
            <span>{language === 'hi' ? 'हिंदी' : 'English'}</span>
            <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1 py-0.2 rounded font-mono">
              {language === 'hi' ? 'EN' : 'HI'}
            </span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="bg-emerald-950/80 backdrop-blur border-t border-emerald-800/60">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 flex items-center justify-between overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 min-w-[70px] sm:min-w-0 py-2.5 sm:py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold border-b-2 transition-all select-none ${
                  isActive
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-900/50'
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
  );
};
