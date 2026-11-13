import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ShopSettings } from '../types';
import { initialSettings, initializeDatabaseIfEmpty } from '../db/seedData';
import { db } from '../db';
import { syncPendingToGoogleSheets, syncFullDatabaseToGoogleSheets } from '../utils/googleSheetsSync';

interface SettingsContextType {
  settings: ShopSettings;
  updateSettings: (newSettings: Partial<ShopSettings>) => Promise<void>;
  isOnline: boolean;
  isSyncing: boolean;
  syncNow: () => Promise<string>;
  syncFullNow: () => Promise<string>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ShopSettings>(initialSettings);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize Database and load settings
    initializeDatabaseIfEmpty().then(async () => {
      const record = await db.settings.get('shop_settings');
      if (record && record.value) {
        setSettings({ ...initialSettings, ...record.value });
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateSettings = async (newValues: Partial<ShopSettings>) => {
    const updated = { ...settings, ...newValues };
    setSettings(updated);
    await db.settings.put({ key: 'shop_settings', value: updated });
  };

  const syncNow = async (): Promise<string> => {
    if (!settings.googleSheetsUrl) {
      return 'कृपया पहले सेटिंग्स में Google Sheets URL दर्ज करें';
    }
    setIsSyncing(true);
    try {
      const res = await syncPendingToGoogleSheets(settings.googleSheetsUrl);
      if (res.success) {
        await updateSettings({ lastSyncedAt: Date.now() });
      }
      return res.message;
    } catch (e: any) {
      return e?.message || 'सिंक विफल रहा';
    } finally {
      setIsSyncing(false);
    }
  };

  const syncFullNow = async (): Promise<string> => {
    if (!settings.googleSheetsUrl) {
      return 'कृपया पहले सेटिंग्स में Google Sheets URL दर्ज करें';
    }
    setIsSyncing(true);
    try {
      const res = await syncFullDatabaseToGoogleSheets(settings.googleSheetsUrl);
      if (res.success) {
        await updateSettings({ lastSyncedAt: Date.now() });
      }
      return res.message;
    } catch (e: any) {
      return e?.message || 'सिंक विफल रहा';
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isOnline, isSyncing, syncNow, syncFullNow }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
