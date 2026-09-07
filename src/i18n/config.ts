/**
 * İki dilli yapının tek kaynağı.
 *
 * Türkçe kök adreste kalıyor (`/piercing`), İngilizce `/en` önekiyle
 * (`/en/piercing`). Türkçe varsayılan olduğu için mevcut adresler değişmiyor —
 * Google'da dizinlenmiş bağlantılar ve basılı materyaldeki adresler kırılmıyor.
 */
export const LANGS = ['tr', 'en'] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = 'tr';

export const LANG_LABELS: Record<Lang, { label: string; short: string; htmlLang: string; ogLocale: string }> = {
  tr: { label: 'Türkçe', short: 'TR', htmlLang: 'tr', ogLocale: 'tr_TR' },
  en: { label: 'English', short: 'EN', htmlLang: 'en', ogLocale: 'en_US' },
};

/**
 * Sayfa adresleri de çevriliyor: `/piercing/fiyatlar` yerine
 * `/en/piercing/prices`. Yabancı ziyaretçi adresi okuyabilsin diye — ve
 * arama motorları için de doğrusu bu.
 *
 * Anahtar Türkçe (kaynak) yol, değer İngilizce karşılığı.
 */
export const ROUTES: Record<string, string> = {
  '/': '/',
  '/portfolyo': '/portfolio',
  '/sanatcilar': '/artists',
  '/dovme': '/tattoo',
  '/dovme/fiyatlar': '/tattoo/prices',
  '/piercing': '/piercing',
  '/piercing/fiyatlar': '/piercing/prices',
  '/piercing/bolgeler': '/piercing/placements',
  '/dovme-onizleme': '/tattoo-preview',
  '/hijyen-ve-guvenlik': '/hygiene-and-safety',
  '/hakkimizda-iletisim': '/about-contact',
  '/randevu': '/booking',
  '/kvkk': '/privacy-notice',
  '/cerez-politikasi': '/cookie-policy',
  '/yas-ve-onam-politikasi': '/age-and-consent-policy',
};

const REVERSE_ROUTES: Record<string, string> = Object.fromEntries(
  Object.entries(ROUTES).map(([tr, en]) => [en, tr])
);

/** Türkçe yolu istenen dilin tam adresine çevirir. */
export function localizePath(trPath: string, lang: Lang): string {
  const clean = trPath.replace(/\/$/, '') || '/';
  if (lang === DEFAULT_LANG) return clean;
  const mapped = ROUTES[clean] ?? clean;
  return mapped === '/' ? '/en' : `/en${mapped}`;
}

/** `/en/piercing/prices` -> `/piercing/fiyatlar`. Dil değiştirici bunu kullanıyor. */
export function toTurkishPath(path: string): string {
  const clean = path.replace(/\/$/, '') || '/';
  if (!clean.startsWith('/en')) return clean;
  const rest = clean.slice(3) || '/';
  return REVERSE_ROUTES[rest] ?? rest;
}

/** Adresten dili okur. */
export function langFromPath(path: string): Lang {
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'tr';
}

/** Aynı sayfanın diğer dildeki karşılığı — dil değiştirici için. */
export function alternatePath(currentPath: string, target: Lang): string {
  return localizePath(toTurkishPath(currentPath), target);
}
