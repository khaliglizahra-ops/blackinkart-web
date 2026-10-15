// Kampanya verisi panelden (Fiyatlar → Kampanyalar) düzenlenir ve campaigns.json'da durur.
import data from './campaigns.json';
import type { Lang } from '../i18n/config';

export type Campaign = {
  key: string;
  title: string;
  text: string;
  count: number;
  price: number;
  /** Tek tek yaptırılsaydı toplam (adet × birim fiyat); kampanya fiyatından büyükse üstü çizili gösterilir. */
  normalTotal: number | null;
};

export function campaigns(lang: Lang): Campaign[] {
  if (!data.enabled) return [];
  return data.items
    .filter((c) => c.price > 0)
    .map((c) => {
      const total = (c.count ?? 0) * (c.unitPrice ?? 0);
      return {
        key: c.key,
        title: lang === 'en' && (c as any).titleEn ? (c as any).titleEn : c.title,
        text: lang === 'en' && (c as any).textEn ? (c as any).textEn : c.text,
        count: c.count,
        price: c.price,
        normalTotal: total > c.price ? total : null,
      };
    });
}
