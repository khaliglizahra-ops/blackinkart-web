import { localizePath, type Lang } from './config';
import { useTranslations, type UIKey } from './ui';

/**
 * Gezinme, sabit sayfa yollarına bağlı olduğu için kodda duruyor (panelde değil).
 * Yollar Türkçe yazılıp `localizePath` ile o dilin adresine çevriliyor.
 */
const NAV: { key: UIKey; href: string }[] = [
  { key: 'nav.home', href: '/' },
  { key: 'nav.portfolio', href: '/portfolyo' },
  { key: 'nav.artists', href: '/sanatcilar' },
  { key: 'nav.tattoo', href: '/dovme' },
  { key: 'nav.piercing', href: '/piercing' },
  { key: 'nav.preview', href: '/dovme-onizleme' },
  { key: 'nav.hygiene', href: '/hijyen-ve-guvenlik' },
  { key: 'nav.contact', href: '/hakkimizda-iletisim' },
];

const LEGAL_NAV: { key: UIKey; href: string }[] = [
  { key: 'legal.kvkk', href: '/kvkk' },
  { key: 'legal.cookies', href: '/cerez-politikasi' },
  { key: 'legal.age', href: '/yas-ve-onam-politikasi' },
];

export function getNav(lang: Lang) {
  const t = useTranslations(lang);
  return NAV.map((item) => ({ key: item.key, label: t(item.key), href: localizePath(item.href, lang) }));
}

export function getLegalNav(lang: Lang) {
  const t = useTranslations(lang);
  return LEGAL_NAV.map((item) => ({ label: t(item.key), href: localizePath(item.href, lang) }));
}
