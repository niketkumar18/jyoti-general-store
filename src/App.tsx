import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { SettingsProvider } from './context/SettingsContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Navbar, type ActiveTab } from './components/common/Navbar';
import { InstallPwaBanner } from './components/common/InstallPwaBanner';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { PosScreen } from './components/pos/PosScreen';
import { InventoryScreen } from './components/inventory/InventoryScreen';
import { KhataScreen } from './components/khata/KhataScreen';
import { VendorKhataView } from './components/khata/VendorKhataView';
import { ReportsScreen } from './components/reports/ReportsScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { CheckCircle2 } from 'lucide-react';

const VALID_TABS: ActiveTab[] = [
  'dashboard',
  'pos',
  'inventory',
  'khata',
  'vendors',
  'reports',
  'settings'
];

const getTabFromHash = (): ActiveTab => {
  if (typeof window === 'undefined') return 'dashboard';
  const hash = window.location.hash.replace('#', '').toLowerCase() as ActiveTab;
  if (VALID_TABS.includes(hash)) {
    return hash;
  }
  return 'dashboard';
};

const AppContent: React.FC = () => {
  const [activeTab, setActiveTabState] = useState<ActiveTab>(getTabFromHash);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state with window.location.hash so direct paths like /#vendors work
  useEffect(() => {
    const onHashChange = () => {
      const tab = getTabFromHash();
      setActiveTabState(tab);
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTabState(tab);
    if (window.location.hash !== `#${tab}`) {
      window.location.hash = tab;
    }
    // Scroll smoothly to top when switching views
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* PWA Install Banner */}
      <InstallPwaBanner />

      {/* Main Navbar with Dashboard, POS, Stock, Customer, Vendor, Reports, Settings */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onSyncNotification={showToast}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-x-hidden">
        {activeTab === 'dashboard' && <DashboardScreen onNavigate={handleTabChange} />}
        {activeTab === 'pos' && <PosScreen />}
        {activeTab === 'inventory' && <InventoryScreen />}
        {activeTab === 'khata' && <KhataScreen />}
        {activeTab === 'vendors' && <VendorKhataView />}
        {activeTab === 'reports' && <ReportsScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs sm:text-sm animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
};

export default App;
