// Price data is edited in the admin panel (Fiyatlar) and stored in prices.json.
// This module only types it and derives helpers — do not hard-code prices here.
import data from './prices.json';
import type { Lang } from '../i18n/config';

/** Panelde Türkçe alan düzenleniyor; `*En` kardeşi varsa İngilizce sayfada o kullanılıyor. */
const pick = (tr: string, en: string | undefined, lang: Lang) => (lang === 'en' && en ? en : tr);

export type PriceRow = {
  name: string;
  steel: number | null; // Cerrahi Çelik
  stoneRing: number | null; // Taşlı & Ring
  titanium: number | null; // Titanium
  note?: string;
};

export type PriceTableData = {
  slug: string;
  title: string;
  rows: PriceRow[];
};

export const KDV_NOTE: string = data.kdvNote;
export const MULTI_PIERCING_NOTE: string = data.multiPiercingNote;

export const kdvNote = (lang: Lang) => pick(data.kdvNote, (data as any).kdvNoteEn, lang);
export const multiPiercingNote = (lang: Lang) =>
  pick(data.multiPiercingNote, (data as any).multiPiercingNoteEn, lang);

export function piercingPriceTables(lang: Lang): PriceTableData[] {
  return data.piercingTables.map((t) => ({
    slug: t.slug,
    title: pick(t.title, (t as any).titleEn, lang),
    rows: t.rows.map((r) => ({
      name: r.name,
      steel: r.steel ?? null,
      stoneRing: r.stoneRing ?? null,
      titanium: r.titanium ?? null,
      ...(('note' in r && r.note) ? { note: pick(r.note as string, (r as any).noteEn, lang) } : {}),
    })),
  }));
}

export const allPiercingPriceTables: PriceTableData[] = piercingPriceTables('tr');

export const tattooPricing = {
  openingPrice: data.tattoo.openingPrice,
  currency: data.tattoo.currency,
  notes: data.tattoo.notes,
};

export const tattooNotes = (lang: Lang): string[] =>
  lang === 'en' && (data.tattoo as any).notesEn ? (data.tattoo as any).notesEn : data.tattoo.notes;

function bySlug(slug: string): PriceTableData | undefined {
  return allPiercingPriceTables.find((t) => t.slug === slug);
}

export const earPiercingPrices = bySlug('kulak')!;
export const nosePiercingPrices = bySlug('burun')!;
export const lipPiercingPrices = bySlug('dudak')!;
export const tonguePiercingPrices = bySlug('dil')!;
export const otherPiercingPrices = bySlug('diger')!;

/** Cheapest surgical-steel price in a table — used as the "from" price on area pages. */
export function startingPrice(table: PriceTableData): number | null {
  const values = table.rows
    .map((r) => r.steel)
    .filter((v): v is number => typeof v === 'number');
  return values.length ? Math.min(...values) : null;
}
