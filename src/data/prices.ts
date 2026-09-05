// Price data is edited in the admin panel (Fiyatlar) and stored in prices.json.
// This module only types it and derives helpers — do not hard-code prices here.
import data from './prices.json';

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

export const allPiercingPriceTables: PriceTableData[] = data.piercingTables.map((t) => ({
  slug: t.slug,
  title: t.title,
  rows: t.rows.map((r) => ({
    name: r.name,
    steel: r.steel ?? null,
    stoneRing: r.stoneRing ?? null,
    titanium: r.titanium ?? null,
    ...(('note' in r && r.note) ? { note: r.note as string } : {}),
  })),
}));

export const tattooPricing = {
  openingPrice: data.tattoo.openingPrice,
  currency: data.tattoo.currency,
  notes: data.tattoo.notes,
};

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
