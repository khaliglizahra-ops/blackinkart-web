// Studio details are edited in the admin panel (İletişim ve Saatler) and stored in
// site.json. Navigation stays in code because it maps to fixed page routes.
import data from './site.json';

export const site = data;

export const nav = [
  { label: 'Ana Sayfa', href: '/' },
  { label: 'Portfolyo', href: '/portfolyo' },
  { label: 'Sanatçılar', href: '/sanatcilar' },
  { label: 'Dövme', href: '/dovme' },
  { label: 'Piercing', href: '/piercing' },
  { label: 'Önizleme', href: '/dovme-onizleme' },
  { label: 'Hijyen ve Güvenlik', href: '/hijyen-ve-guvenlik' },
  { label: 'İletişim', href: '/hakkimizda-iletisim' },
] as const;

export const legalNav = [
  { label: 'KVKK Aydınlatma Metni', href: '/kvkk' },
  { label: 'Çerez Politikası', href: '/cerez-politikasi' },
  { label: '18 Yaş ve Onam Politikası', href: '/yas-ve-onam-politikasi' },
] as const;
