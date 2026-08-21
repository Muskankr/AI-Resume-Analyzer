'use client';

import React from 'react';
import { SUPPORTED_CURRENCIES, CurrencyCode } from '@/utils/currencyConverter';
import { Globe } from 'lucide-react';

interface SalaryCurrencySelectorProps {
  currentCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

export const SalaryCurrencySelector: React.FC<SalaryCurrencySelectorProps> = ({
  currentCurrency,
  onCurrencyChange,
}) => {
  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-200 shadow-sm">
      <Globe className="h-4 w-4 text-teal-400" />
      <span className="text-xs font-medium text-slate-400">Currency:</span>
      <select
        value={currentCurrency}
        onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
        aria-label="Select salary display currency"
        className="bg-slate-950 border border-slate-700 text-xs font-semibold rounded px-2 py-1 text-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
      >
        {Object.keys(SUPPORTED_CURRENCIES).map((code) => (
          <option key={code} value={code}>
            {code} ({SUPPORTED_CURRENCIES[code as CurrencyCode].symbol})
          </option>
        ))}
      </select>
    </div>
  );
};
