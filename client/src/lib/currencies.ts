export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  country: string;
  flag: string;
  isPopular?: boolean;
}

export const POPULAR_CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'India', flag: '🇮🇳', isPopular: true },
  { code: 'USD', symbol: '$', name: 'US Dollar', country: 'United States', flag: '🇺🇸', isPopular: true },
  { code: 'EUR', symbol: '€', name: 'Euro', country: 'European Union', flag: '🇪🇺', isPopular: true },
  { code: 'GBP', symbol: '£', name: 'British Pound', country: 'United Kingdom', flag: '🇬🇧', isPopular: true },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', country: 'United Arab Emirates', flag: '🇦🇪', isPopular: true },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', country: 'Saudi Arabia', flag: '🇸🇦', isPopular: true },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', country: 'Canada', flag: '🇨🇦', isPopular: true },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', country: 'Australia', flag: '🇦🇺', isPopular: true },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', country: 'Japan', flag: '🇯🇵', isPopular: true },
  { code: 'SGD', symbol: 'SG$', name: 'Singapore Dollar', country: 'Singapore', flag: '🇸🇬', isPopular: true },
  { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar', country: 'Kuwait', flag: '🇰🇼', isPopular: true },
  { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal', country: 'Qatar', flag: '🇶🇦', isPopular: true },
];

export const ALL_CURRENCIES: CurrencyInfo[] = [
  // Popular Currencies
  ...POPULAR_CURRENCIES,

  // Asia & Middle East
  { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar', country: 'Bahrain', flag: '🇧🇭' },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', country: 'Oman', flag: '🇴🇲' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', country: 'China', flag: '🇨🇳' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', country: 'Hong Kong', flag: '🇭🇰' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', country: 'South Korea', flag: '🇰🇷' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', country: 'Indonesia', flag: '🇮🇩' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', country: 'Malaysia', flag: '🇲🇾' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', country: 'Philippines', flag: '🇵🇭' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', country: 'Thailand', flag: '🇹🇭' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', country: 'Vietnam', flag: '🇻🇳' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', country: 'Pakistan', flag: '🇵🇰' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', country: 'Bangladesh', flag: '🇧🇩' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', country: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee', country: 'Nepal', flag: '🇳🇵' },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', country: 'Israel', flag: '🇮🇱' },
  { code: 'JOD', symbol: 'JOD', name: 'Jordanian Dinar', country: 'Jordan', flag: '🇯🇴' },
  { code: 'LBP', symbol: 'L£', name: 'Lebanese Pound', country: 'Lebanon', flag: '🇱🇧' },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', country: 'Taiwan', flag: '🇹🇼' },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', country: 'Kazakhstan', flag: '🇰🇿' },
  { code: 'UZS', symbol: 'soʻm', name: 'Uzbekistani Som', country: 'Uzbekistan', flag: '🇺🇿' },
  { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat', country: 'Azerbaijan', flag: '🇦🇿' },
  { code: 'GEL', symbol: '₾', name: 'Georgian Lari', country: 'Georgia', flag: '🇬🇪' },
  { code: 'AMD', symbol: '֏', name: 'Armenian Dram', country: 'Armenia', flag: '🇦🇲' },
  { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik', country: 'Mongolia', flag: '🇲🇳' },
  { code: 'LAK', symbol: '₭', name: 'Lao Kip', country: 'Laos', flag: '🇱🇦' },
  { code: 'KHR', symbol: '៛', name: 'Cambodian Riel', country: 'Cambodia', flag: '🇰🇭' },
  { code: 'MMK', symbol: 'K', name: 'Myanmar Kyat', country: 'Myanmar', flag: '🇲🇲' },
  { code: 'BND', symbol: 'B$', name: 'Brunei Dollar', country: 'Brunei', flag: '🇧🇳' },
  { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa', country: 'Maldives', flag: '🇲🇻' },
  { code: 'AFN', symbol: '؋', name: 'Afghan Afghani', country: 'Afghanistan', flag: '🇦🇫' },
  { code: 'IQD', symbol: 'IQD', name: 'Iraqi Dinar', country: 'Iraq', flag: '🇮🇶' },
  { code: 'YER', symbol: '﷼', name: 'Yemeni Rial', country: 'Yemen', flag: '🇾🇪' },

  // Europe
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', country: 'Switzerland', flag: '🇨🇭' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', country: 'Sweden', flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', country: 'Norway', flag: '🇳🇴' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', country: 'Denmark', flag: '🇩🇰' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', country: 'Poland', flag: '🇵🇱' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', country: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', country: 'Hungary', flag: '🇭🇺' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', country: 'Romania', flag: '🇷🇴' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', country: 'Bulgaria', flag: '🇧🇬' },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna', country: 'Croatia', flag: '🇭🇷' },
  { code: 'RSD', symbol: 'дин.', name: 'Serbian Dinar', country: 'Serbia', flag: '🇷🇸' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', country: 'Turkey', flag: '🇹🇷' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble', country: 'Russia', flag: '🇷🇺' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', country: 'Ukraine', flag: '🇺🇦' },
  { code: 'ISK', symbol: 'kr', name: 'Icelandic Krona', country: 'Iceland', flag: '🇮🇸' },
  { code: 'ALL', symbol: 'L', name: 'Albanian Lek', country: 'Albania', flag: '🇦🇱' },
  { code: 'BAM', symbol: 'KM', name: 'Bosnia-Herzegovina Mark', country: 'Bosnia', flag: '🇧🇦' },
  { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar', country: 'North Macedonia', flag: '🇲🇰' },
  { code: 'MDL', symbol: 'L', name: 'Moldovan Leu', country: 'Moldova', flag: '🇲🇩' },
  { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble', country: 'Belarus', flag: '🇧🇾' },

  // Americas
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', country: 'Brazil', flag: '🇧🇷' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', country: 'Mexico', flag: '🇲🇽' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso', country: 'Argentina', flag: '🇦🇷' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', country: 'Chile', flag: '🇨🇱' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso', country: 'Colombia', flag: '🇨🇴' },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', country: 'Peru', flag: '🇵🇪' },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso', country: 'Uruguay', flag: '🇺🇾' },
  { code: 'BOB', symbol: 'Bs.', name: 'Bolivian Boliviano', country: 'Bolivia', flag: '🇧🇴' },
  { code: 'PYG', symbol: '₲', name: 'Paraguayan Guarani', country: 'Paraguay', flag: '🇵🇾' },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colon', country: 'Costa Rica', flag: '🇨🇷' },
  { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso', country: 'Dominican Republic', flag: '🇩🇴' },
  { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal', country: 'Guatemala', flag: '🇬🇹' },
  { code: 'HNL', symbol: 'L', name: 'Honduran Lempira', country: 'Honduras', flag: '🇭🇳' },
  { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Cordoba', country: 'Nicaragua', flag: '🇳🇮' },
  { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa', country: 'Panama', flag: '🇵🇦' },
  { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar', country: 'Jamaica', flag: '🇯🇲' },
  { code: 'TTD', symbol: 'TT$', name: 'Trinidad and Tobago Dollar', country: 'Trinidad and Tobago', flag: '🇹🇹' },
  { code: 'BSD', symbol: 'B$', name: 'Bahamian Dollar', country: 'Bahamas', flag: '🇧🇸' },
  { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar', country: 'Barbados', flag: '🇧🇧' },

  // Africa
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', country: 'South Africa', flag: '🇿🇦' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', country: 'Nigeria', flag: '🇳🇬' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', country: 'Egypt', flag: '🇪🇬' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', country: 'Kenya', flag: '🇰🇪' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', country: 'Ghana', flag: '🇬🇭' },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham', country: 'Morocco', flag: '🇲🇦' },
  { code: 'DZD', symbol: 'DA', name: 'Algerian Dinar', country: 'Algeria', flag: '🇩🇿' },
  { code: 'TND', symbol: 'DT', name: 'Tunisian Dinar', country: 'Tunisia', flag: '🇹🇳' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', country: 'Uganda', flag: '🇺🇬' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', country: 'Tanzania', flag: '🇹🇿' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', country: 'Ethiopia', flag: '🇪🇹' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc', country: 'Rwanda', flag: '🇷🇼' },
  { code: 'MUR', symbol: 'Rs', name: 'Mauritian Rupee', country: 'Mauritius', flag: '🇲🇺' },
  { code: 'BWP', symbol: 'P', name: 'Botswana Pula', country: 'Botswana', flag: '🇧🇼' },
  { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar', country: 'Namibia', flag: '🇳🇦' },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha', country: 'Zambia', flag: '🇿🇲' },
  { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical', country: 'Mozambique', flag: '🇲🇿' },
  { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza', country: 'Angola', flag: '🇦🇴' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc', country: 'West Africa (BCEAO)', flag: '🌍' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc', country: 'Central Africa (BEAC)', flag: '🌍' },

  // Oceania
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', country: 'New Zealand', flag: '🇳🇿' },
  { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar', country: 'Fiji', flag: '🇫🇯' },
  { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina', country: 'Papua New Guinea', flag: '🇵🇬' },
  { code: 'WST', symbol: 'WS$', name: 'Samoan Tala', country: 'Samoa', flag: '🇼🇸' },
  { code: 'TOP', symbol: 'T$', name: 'Tongan Paʻanga', country: 'Tonga', flag: '🇹🇴' },

  // Digital & Crypto Assets
  { code: 'BTC', symbol: '₿', name: 'Bitcoin', country: 'Decentralized / Crypto', flag: '🪙' },
  { code: 'ETH', symbol: 'Ξ', name: 'Ethereum', country: 'Decentralized / Crypto', flag: '🪙' },
  { code: 'USDT', symbol: '₮', name: 'Tether USD', country: 'Stablecoin / Crypto', flag: '🪙' },
  { code: 'SOL', symbol: '◎', name: 'Solana', country: 'Decentralized / Crypto', flag: '🪙' },
];

/**
 * Filter currencies by search query across code, name, country, and symbol
 */
export function searchCurrencies(query: string): CurrencyInfo[] {
  if (!query || !query.trim()) {
    return ALL_CURRENCIES;
  }
  const clean = query.trim().toLowerCase();
  return ALL_CURRENCIES.filter((c) => {
    return (
      c.code.toLowerCase().includes(clean) ||
      c.name.toLowerCase().includes(clean) ||
      c.country.toLowerCase().includes(clean) ||
      c.symbol.toLowerCase().includes(clean)
    );
  });
}

/**
 * Finds a CurrencyInfo by symbol or code, or returns a fallback
 */
export function findCurrencyInfo(currencyOrSymbol: string): CurrencyInfo {
  const match = ALL_CURRENCIES.find(
    (c) => c.symbol === currencyOrSymbol || c.code.toLowerCase() === currencyOrSymbol.toLowerCase()
  );
  if (match) return match;

  return {
    code: currencyOrSymbol.toUpperCase(),
    symbol: currencyOrSymbol,
    name: `Custom (${currencyOrSymbol})`,
    country: 'Custom Currency',
    flag: '🌐',
  };
}
