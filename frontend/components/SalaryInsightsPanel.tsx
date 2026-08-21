'use client';

import React, { useState } from 'react';
import { CurrencyCode } from '@/utils/currencyConverter';
import { formatSalary } from '@/utils/currencyConverter';
import { SalaryCurrencySelector } from '@/components/SalaryCurrencySelector';
import { DollarSign, TrendingUp } from 'lucide-react';

interface SalaryInsightsProps {
  baseSalaryUSD: number; // Assuming internal data is indexed in USD
  marketAverageUSD: number;
}

export const SalaryInsightsPanel: React.FC<SalaryInsightsProps> = ({
  baseSalaryUSD,
  marketAverageUSD,
}) => {
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-slate-100 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-teal-400" />
            Estimated Salary Insights
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Based on your resume profile and current market benchmarks.
          </p>
        </div>
        
        {/* Currency Selector Control */}
        <SalaryCurrencySelector currentCurrency={currency} onCurrencyChange={setCurrency} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated Match Salary</span>
          <div className="text-2xl font-black text-teal-400">
            {formatSalary(baseSalaryUSD, currency)}
          </div>
          <span className="text-[10px] text-slate-500">Displayed in {currency} (converted from base model data)</span>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-teal-400" /> Market Average
          </span>
          <div className="text-2xl font-black text-white">
            {formatSalary(marketAverageUSD, currency)}
          </div>
          <span className="text-[10px] text-slate-500">Industry baseline for matched role requirements</span>
        </div>
      </div>
    </div>
  );
};
