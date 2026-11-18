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

export function formatDateDMY(timestamp: number): string {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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

export function numberToWordsINR(amount: number): string {
  if (isNaN(amount) || amount <= 0) return 'Zero Rupees';
  const rounded = Math.round(amount);

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + units[unit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    if (hundred && rest) return units[hundred] + ' Hundred ' + convertTwoDigits(rest);
    if (hundred) return units[hundred] + ' Hundred';
    return convertTwoDigits(rest);
  }

  let crore = Math.floor(rounded / 10000000);
  let remainder = rounded % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder %= 1000;
  let hundredPart = remainder;

  const parts: string[] = [];
  if (crore) parts.push(convertTwoDigits(crore) + ' Crore');
  if (lakh) parts.push(convertTwoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(convertTwoDigits(thousand) + ' Thousand');
  if (hundredPart) parts.push(convertThreeDigits(hundredPart));

  return (parts.join(' ') + ' Rupees').trim();
}
