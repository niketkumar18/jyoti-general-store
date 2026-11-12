import type { UnitType, RiskLevel } from '../types';
import type { Language } from './translations';

export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

export function formatCurrencyPrecise(amount: number): string {
  if (isNaN(amount)) return '₹0.00';
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(timestamp: number, lang: Language = 'hi'): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(timestamp: number, lang: Language = 'hi'): string {
  const d = new Date(timestamp);
  return d.toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function formatUnit(unit: UnitType, lang: Language = 'hi'): string {
  const map: Record<UnitType, { hi: string; en: string }> = {
    KG: { hi: 'किग्रा (kg)', en: 'KG' },
    GM: { hi: 'ग्राम (gm)', en: 'GM' },
    LITRE: { hi: 'लीटर (Ltr)', en: 'Litre' },
    ML: { hi: 'मिली (ml)', en: 'ML' },
    PACKET: { hi: 'पैकेट (Pkt)', en: 'Packet' },
    PIECE: { hi: 'पीस (Pcs)', en: 'Piece' },
    DOZEN: { hi: 'दर्जन (Dzn)', en: 'Dozen' }
  };
  return map[unit] ? map[unit][lang] : unit;
}

export function calculateRiskLevel(currentBalance: number, creditLimit: number): RiskLevel {
  if (creditLimit <= 0) return 'safe';
  const ratio = (currentBalance / creditLimit) * 100;
  if (ratio > 100) return 'danger';
  if (ratio >= 50) return 'warning';
  return 'safe';
}

export function getRiskColorClasses(level: RiskLevel): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (level) {
    case 'danger':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-300',
        dot: 'bg-red-500'
      };
    case 'warning':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-300',
        dot: 'bg-amber-500'
      };
    case 'safe':
    default:
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-300',
        dot: 'bg-emerald-500'
      };
  }
}
