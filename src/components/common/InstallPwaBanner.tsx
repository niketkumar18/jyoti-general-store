import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const InstallPwaBanner: React.FC = () => {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check dismissed timestamp
      const dismissed = localStorage.getItem('den_pwa_dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(
        language === 'hi'
          ? 'अपने ब्राउज़र के मेनू (⋮) में जाकर "Add to Home Screen" या "ऐप इंस्टॉल करें" पर क्लिक करें।'
          : 'Open browser menu (⋮) and tap "Add to Home Screen" or "Install App".'
      );
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('den_pwa_dismissed', 'true');
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-sm z-30 relative">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-emerald-700/80 rounded-lg">
          <Smartphone className="w-4 h-4 text-emerald-200" />
        </div>
        <div>
          <span className="font-bold">
            {language === 'hi' ? '📱 DEN ऐप इंस्टॉल करें:' : '📱 Install DEN App:'}
          </span>{' '}
          <span className="text-emerald-100 hidden sm:inline">
            {language === 'hi'
              ? 'फुल स्क्रीन, ऑफलाइन और बिना किसी प्ले स्टोर फीस के!'
              : 'Full screen, offline-ready & ₹0 Play Store fee!'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 shadow transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{language === 'hi' ? 'अभी इंस्टॉल करें' : 'Install Now'}</span>
        </button>
        <button
          onClick={handleDismiss}
          className="text-emerald-300 hover:text-white p-1 rounded-md"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
