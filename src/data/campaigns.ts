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
  images: string[];
};

// Kartlarda gösterilen gerçek fotoğraflar (anahtara göre). Panelden eklenen yeni kampanyada görsel olmaz.
const IMAGES: Record<string, string[]> = {
  minimal: [
    '/images/portfolyo/d45c6c54-eb67-4a38-a198-6eab66d06a6b.jpg',
    '/images/portfolyo/bfd639d1-6a46-40d7-92ca-5b22f6d3d971.jpg',
    '/images/portfolyo/cb7a810f-6780-41fc-8f47-89da33299f30.jpg',
  ],
  steel: ['/images/piercing/kulak/kulak-n03.jpg'],
  titanium: ['/images/piercingland/ti015.webp'],
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
        images: IMAGES[c.key] ?? [],
      };
    });
}
