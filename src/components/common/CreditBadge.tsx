import React from 'react';
import type { RiskLevel } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { getRiskColorClasses } from '../../utils/formatters';

interface CreditBadgeProps {
  riskLevel: RiskLevel;
  showText?: boolean;
  className?: string;
}

export const CreditBadge: React.FC<CreditBadgeProps> = ({ riskLevel, showText = true, className = '' }) => {
  const { t } = useLanguage();
  const styles = getRiskColorClasses(riskLevel);

  const getLabel = () => {
    switch (riskLevel) {
      case 'danger':
        return t('danger_badge');
      case 'warning':
        return t('warning_badge');
      case 'safe':
      default:
        return t('safe_badge');
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles.bg} ${styles.text} ${styles.border} ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${styles.dot} animate-pulse`} />
      {showText && <span>{getLabel()}</span>}
    </span>
  );
};
