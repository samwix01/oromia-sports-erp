export type Locale = 'om' | 'am' | 'en';

/**
 * Ethiopian month names, Meskerem (1) … Pagume (13).
 * DECISION: OD-18 — Afaan Oromo and Amharic spellings to be confirmed by Bureau communications.
 */
export const MONTH_NAMES: Record<Locale, readonly string[]> = {
  om: [
    'Fulbaana',
    'Onkoloolessa',
    'Sadaasa',
    'Muddee',
    'Amajjii',
    'Guraandhala',
    'Bitootessa',
    'Eebila',
    'Caamsaa',
    'Waxabajjii',
    'Adoolessa',
    'Hagayya',
    'Qaammee',
  ],
  am: ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'],
  en: [
    'Meskerem',
    'Tikimt',
    'Hidar',
    'Tahsas',
    'Tir',
    'Yekatit',
    'Megabit',
    'Miyazya',
    'Ginbot',
    'Sene',
    'Hamle',
    'Nehasse',
    'Pagume',
  ],
};
