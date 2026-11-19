import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ShopSettings } from '../types';
import { initialSettings, initializeDatabaseIfEmpty, DEFAULT_GOOGLE_SHEETS_URL, DEFAULT_GOOGLE_SHEET_DOCUMENT_URL } from '../db/seedData';
import { db } from '../db';
import { syncTwoWay, syncPendingToGoogleSheets, syncFullDatabaseToGoogleSheets } from '../utils/googleSheetsSync';

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
  const isSyncingRef = useRef(false);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize Database and load settings
    initializeDatabaseIfEmpty().then(async () => {
      const record = await db.settings.get('shop_settings');
      let effective: ShopSettings = { ...initialSettings };
      if (record && record.value) {
        effective = { ...initialSettings, ...record.value };
        if (!effective.email || effective.address === 'Deep Market, Meghpur') {
          effective.shopName = 'M/S JYOTI GENERAL STORE';
          effective.email = 'jyotigeneralstore11@gmail.com';
          effective.address = 'महावीर स्थान मेघपुर दीप मार्केट, मेघपुर बड़ा सुरसंड पश्चिमी, Bihar, 843331';
          effective.gstin = '10AOGPC3358B2ZR';
          effective.placeOfSupply = 'Bihar';
          await db.settings.put({ key: 'shop_settings', value: effective });
        }
      }

      // Ensure default Google Sheet document URL is set for Jyoti General Store
      if (!effective.googleSheetDocumentUrl || effective.googleSheetDocumentUrl === 'https://sheets.google.com') {
        effective.googleSheetDocumentUrl = DEFAULT_GOOGLE_SHEET_DOCUMENT_URL;
        await db.settings.put({ key: 'shop_settings', value: effective });
      }

      // Clear out the obsolete / dead default Google Apps Script URL if present
      if (effective.googleSheetsUrl && effective.googleSheetsUrl.includes('AKfycbxEBvSKonGm')) {
        effective.googleSheetsUrl = '';
        await db.settings.put({ key: 'shop_settings', value: effective });
      }

      // If DEFAULT_GOOGLE_SHEETS_URL is configured and user hasn't set one yet, adopt it
      if (DEFAULT_GOOGLE_SHEETS_URL && !effective.googleSheetsUrl) {
        effective.googleSheetsUrl = DEFAULT_GOOGLE_SHEETS_URL;
        await db.settings.put({ key: 'shop_settings', value: effective });
      }

      // Check URL query parameters for ?syncUrl=...
      try {
        const params = new URLSearchParams(window.location.search);
        const paramSyncUrl = params.get('syncUrl');
        const paramSheetUrl = params.get('sheetUrl');
        if (paramSyncUrl) {
          effective.googleSheetsUrl = paramSyncUrl;
          if (paramSheetUrl) effective.googleSheetDocumentUrl = paramSheetUrl;
          effective.autoSync = true;
          await db.settings.put({ key: 'shop_settings', value: effective });
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        // ignore
      }

      setSettings(effective);
      settingsRef.current = effective;

      // Initial 2-way sync on launch to fetch latest bills from other devices
      if (effective.googleSheetsUrl && navigator.onLine) {
        triggerSilentTwoWaySync(effective.googleSheetsUrl, effective.googleSheetDocumentUrl);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Helper for silent background 2-way sync
  const triggerSilentTwoWaySync = async (url: string, sheetDocUrl?: string) => {
    if (isSyncingRef.current || !url || !navigator.onLine) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const res = await syncTwoWay(url, sheetDocUrl);
      if (res.success) {
        setSettings((prev) => ({ ...prev, lastSyncedAt: Date.now() }));
      }
    } catch (e) {
      // silent background error
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  };

  // Auto-sync on window focus or tab visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && settingsRef.current.googleSheetsUrl && navigator.onLine) {
        triggerSilentTwoWaySync(settingsRef.current.googleSheetsUrl, settingsRef.current.googleSheetDocumentUrl);
      }
    };

    const handleFocus = () => {
      if (settingsRef.current.googleSheetsUrl && navigator.onLine) {
        triggerSilentTwoWaySync(settingsRef.current.googleSheetsUrl, settingsRef.current.googleSheetDocumentUrl);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Periodic 2-way sync every 15 seconds between active devices
    const interval = setInterval(() => {
      if (settingsRef.current.autoSync && settingsRef.current.googleSheetsUrl && navigator.onLine) {
        triggerSilentTwoWaySync(settingsRef.current.googleSheetsUrl, settingsRef.current.googleSheetDocumentUrl);
      }
    }, 15000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const updateSettings = async (newValues: Partial<ShopSettings>) => {
    const updated = { ...settings, ...newValues };
    setSettings(updated);
    settingsRef.current = updated;
    await db.settings.put({ key: 'shop_settings', value: updated });
  };

  // Manual 2-way sync (called when user clicks ↻ Sync Now button in Navbar)
  const syncNow = async (): Promise<string> => {
    if (!settings.googleSheetsUrl) {
      return 'कृपया पहले सेटिंग्स में Google Sheets URL दर्ज करें';
    }
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const res = await syncTwoWay(settings.googleSheetsUrl, settings.googleSheetDocumentUrl);
      if (res.success) {
        await updateSettings({ lastSyncedAt: Date.now() });
      }
      return res.message;
    } catch (e: any) {
      return e?.message || 'सिंक विफल रहा';
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  };

  const syncFullNow = async (): Promise<string> => {
    if (!settings.googleSheetsUrl) {
      return 'कृपया पहले सेटिंग्स में Google Sheets URL दर्ज करें';
    }
    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const res = await syncFullDatabaseToGoogleSheets(settings.googleSheetsUrl, settings.googleSheetDocumentUrl);
      if (res.success) {
        await updateSettings({ lastSyncedAt: Date.now() });
      }
      return res.message;
    } catch (e: any) {
      return e?.message || 'सिंक विफल रहा';
    } finally {
      isSyncingRef.current = false;
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
