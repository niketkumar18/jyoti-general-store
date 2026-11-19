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
  triggerSilentSync: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ShopSettings>(initialSettings);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef(false);
  const inFlightSyncRef = useRef<Promise<any> | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Helper for silent background 2-way sync (does NOT freeze UI or disable buttons)
  const triggerSilentTwoWaySync = async (url: string, sheetDocUrl?: string) => {
    if (inFlightSyncRef.current || !url || !navigator.onLine) return;
    
    inFlightSyncRef.current = syncTwoWay(url, sheetDocUrl)
      .then((res) => {
        if (res && res.success) {
          setSettings((prev) => ({ ...prev, lastSyncedAt: Date.now() }));
        }
        return res;
      })
      .catch((err) => {
        console.warn('Silent background sync error:', err);
        return null;
      })
      .finally(() => {
        inFlightSyncRef.current = null;
      });

    return inFlightSyncRef.current;
  };

  const triggerSilentSync = () => {
    if (settingsRef.current.googleSheetsUrl && navigator.onLine) {
      triggerSilentTwoWaySync(settingsRef.current.googleSheetsUrl, settingsRef.current.googleSheetDocumentUrl);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSilentSync();
    };
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

      // Always guarantee autoSync is enabled
      effective.autoSync = true;

      // Ensure default Google Sheet document URL is set to the master sheet with gid=1348342111
      if (!effective.googleSheetDocumentUrl || effective.googleSheetDocumentUrl.includes('sheets.google.com') || !effective.googleSheetDocumentUrl.includes('1348342111')) {
        effective.googleSheetDocumentUrl = DEFAULT_GOOGLE_SHEET_DOCUMENT_URL;
        await db.settings.put({ key: 'shop_settings', value: effective });
      }

      // Ensure active Google Apps Script Web App URL is set
      if (!effective.googleSheetsUrl || !effective.googleSheetsUrl.includes('AKfycbzPkVZvXdW3')) {
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

  // Auto-sync on window focus or tab visibility change
  useEffect(() => {
    let lastSyncTrigger = 0;

    const handleVisibilityChange = () => {
      const now = Date.now();
      if (now - lastSyncTrigger < 3000) return;
      if (document.visibilityState === 'visible' && settingsRef.current.googleSheetsUrl && navigator.onLine) {
        lastSyncTrigger = now;
        triggerSilentTwoWaySync(settingsRef.current.googleSheetsUrl, settingsRef.current.googleSheetDocumentUrl);
      }
    };

    const handleFocus = () => {
      const now = Date.now();
      if (now - lastSyncTrigger < 3000) return;
      if (settingsRef.current.googleSheetsUrl && navigator.onLine) {
        lastSyncTrigger = now;
        triggerSilentTwoWaySync(settingsRef.current.googleSheetsUrl, settingsRef.current.googleSheetDocumentUrl);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Periodic fast 2-way sync every 10 seconds in the background (Multi-device live sync)
    const interval = setInterval(() => {
      if (settingsRef.current.googleSheetsUrl && navigator.onLine) {
        triggerSilentTwoWaySync(settingsRef.current.googleSheetsUrl, settingsRef.current.googleSheetDocumentUrl);
      }
    }, 10000);

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
    setIsSyncing(true);
    isSyncingRef.current = true;
    try {
      // If a background sync is already in flight, await it; otherwise start a fresh sync
      const res = inFlightSyncRef.current
        ? await inFlightSyncRef.current
        : await syncTwoWay(settings.googleSheetsUrl, settings.googleSheetDocumentUrl);
      if (res && res.success) {
        await updateSettings({ lastSyncedAt: Date.now() });
      }
      return (res && res.message) || '✅ सिंक पूर्ण!';
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
    setIsSyncing(true);
    isSyncingRef.current = true;
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
    <SettingsContext.Provider value={{ settings, updateSettings, isOnline, isSyncing, syncNow, syncFullNow, triggerSilentSync }}>
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
