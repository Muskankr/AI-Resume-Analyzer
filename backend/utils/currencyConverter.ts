export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP' | 'CAD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  rateFromUSD: number; // Base conversion relative to USD
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', rateFromUSD: 1.0, locale: 'en-US' },
  INR: { code: 'INR', symbol: '₹', rateFromUSD: 83.0, locale: 'en-IN' },
  EUR: { code: 'EUR', symbol: '€', rateFromUSD: 0.92, locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', rateFromUSD: 0.79, locale: 'en-GB' },
  CAD: { code: 'CAD', symbol: 'CA$', rateFromUSD: 1.35, locale: 'en-CA' },
};

/**
 * Converts a base USD amount to the target currency and formats it cleanly.
 */
export function formatSalary(amountInUSD: number, targetCurrency: CurrencyCode): string {
  const config = SUPPORTED_CURRENCIES[targetCurrency] || SUPPORTED_CURRENCIES.USD;
  const convertedAmount = amountInUSD * config.rateFromUSD;

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: targetCurrency,
    maximumFractionDigits: 0,
  }).format(convertedAmount);
}
