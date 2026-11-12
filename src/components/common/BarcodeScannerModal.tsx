import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { playBeepSound } from '../../utils/audio';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onScan,
  onClose
}) => {
  const { language } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-reader-viewport';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    const startCamera = async () => {
      try {
        setError(null);
        setScanning(true);
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 180 },
            aspectRatio: 1.33
          },
          (decodedText) => {
            if (isMounted) {
              playBeepSound();
              onScan(decodedText);
              stopAndClose();
            }
          },
          () => {
            // Ignore scan parse frames
          }
        );
      } catch (err: any) {
        if (isMounted) {
          setError(
            language === 'hi'
              ? 'कैमरा शुरू करने में समस्या आई। कृपया कैमरा परमिशन दें।'
              : 'Unable to start camera. Please ensure camera permissions are granted.'
          );
          setScanning(false);
        }
      }
    };

    // Small delay to allow modal element to mount in DOM
    const timer = setTimeout(() => {
      startCamera();
    }, 200);

    const stopAndClose = async () => {
      try {
        if (scannerRef.current && scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        // ignore
      }
    };

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopAndClose();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">
              {language === 'hi' ? 'बारकोड / QR कोड स्कैन करें' : 'Scan Barcode / QR'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="p-4 bg-slate-100 flex flex-col items-center justify-center min-h-[300px]">
          {error ? (
            <div className="text-center p-6 space-y-3">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <p className="text-sm font-semibold text-rose-700">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                {language === 'hi' ? 'बंद करें' : 'Close'}
              </button>
            </div>
          ) : (
            <div className="w-full relative rounded-xl overflow-hidden shadow-inner bg-black">
              <div id={containerId} className="w-full h-[280px]" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-36 border-2 border-emerald-400 rounded-lg animate-pulse" />
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 text-center mt-3">
            {language === 'hi'
              ? 'उत्पाद का बारकोड कैमरे के सामने लाएं, अपने आप स्कैन होगा'
              : 'Point camera at the item barcode to scan automatically'}
          </p>
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl"
          >
            {language === 'hi' ? 'रद्द करें' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
