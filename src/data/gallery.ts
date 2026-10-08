// Portfolio images are managed in the admin panel (Portfolyo) and stored in
// portfolio.json. Piercing category photos mirror each area's own photo
// folder (aynı klasörler /piercing/<bölge> sayfalarında da kullanılıyor).
import portfolio from './portfolio.json';

export type GalleryCategory = {
  key: string;
  label: string;
  images: string[];
};

/**
 * Panelden kaydedilen listeler elle düzenleniyor: yarım bırakılmış bir kategoride
 * boş (null) fotoğraf yuvası, ya da aynı fotoğrafın iki kez eklenmesi olabiliyor.
 * Bir boş yuva `thumb(null)`'da derlemeyi çökertip sonraki TÜM panel
 * değişikliklerinin yayına çıkmasını engelleyebilir (6 Ekim 2026'da oldu); o
 * yüzden listeler burada temizleniyor: boşlar atılır, tekrarlar tek kalır.
 */
const cleanImages = (list: unknown): string[] => [
  ...new Set((Array.isArray(list) ? list : []).filter((x): x is string => typeof x === 'string' && x.startsWith('/'))),
];

const cleanGalleries = (cats: { key: string; label: string; images: unknown[] }[]): GalleryCategory[] =>
  cats
    .map((c) => ({ ...c, images: cleanImages(c.images) }))
    // Henüz fotoğrafı olmayan kategori filtre düğmesi olarak hiç görünmez.
    .filter((c) => c.images.length > 0);

/** Dövme portfolio grouped by style — drives the "Dövme" filters on /portfolyo. */
export const dovmeGalleries: GalleryCategory[] = cleanGalleries(portfolio.categories);

/** Piercing portfolio grouped by body area — drives the "Piercing" filters on /portfolyo. */
export const piercingGalleries: GalleryCategory[] = cleanGalleries(portfolio.piercingCategories);

/** Featured set used by the homepage teaser and the top of /portfolyo. */
export const topPortfolio: string[] = cleanImages(portfolio.featured);

export const studioPhotos: string[] = cleanImages(portfolio.studio);

/**
 * Piercing bölge sayfalarının (ve /piercing sayfasındaki kartların) fotoğrafları portfolyodaki
 * bölge kategorisinden geliyor — portfolyo güncellenince bölge sayfaları da güncellenir.
 * Anahtar: bölge içeriğinin `translationKey`i → portfolyo kategori kimliği.
 */
const AREA_TO_CATEGORY: Record<string, string> = {
  ear: 'kulak',
  nose: 'burun',
  lip: 'dudak',
  tongue: 'dil',
  eyebrow: 'kas',
  navel: 'gobek',
  nipple: 'meme-ucu',
  dermal: 'dermal',
  cheek: 'yanak',
};

/** Bölge sayfasındaki nokta şemaları (translationKey → görseller; birden fazlaysa yan yana). Yoksa bölüm gizlenir. */
const D = '/images/piercing/diagram/';
const DIAGRAMS: Record<string, string[]> = {
  ear: [D + 'kulak.jpg'],
  nose: [D + 'burun.jpg'],
  eyebrow: [D + 'yuz.jpg'],
  cheek: [D + 'yuz.jpg'],
  lip: [D + 'dudak.jpg'],
  tongue: [D + 'dil.jpg'],
  navel: [D + 'govde.jpg'],
  nipple: [D + 'govde.jpg'],
  dermal: [D + 'dermal.jpg', D + 'dermal-2.jpg'],
  genital: [D + 'genital.jpg'],
};

export function areaDiagrams(translationKey: string | undefined): string[] {
  return (translationKey && DIAGRAMS[translationKey]) || [];
}

export function areaCategoryKey(translationKey: string | undefined): string | undefined {
  return translationKey ? AREA_TO_CATEGORY[translationKey] : undefined;
}

/** Bölgenin portfolyodaki fotoğrafları; kategori yoksa `fallback` (bölge içeriğindeki liste). */
export function areaPhotos(translationKey: string | undefined, fallback: string[] = []): string[] {
  const key = areaCategoryKey(translationKey);
  const found = piercingGalleries.find((g) => g.key === key);
  return found && found.images.length ? found.images : fallback;
}
