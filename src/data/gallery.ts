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
