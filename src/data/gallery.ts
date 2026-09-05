// Portfolio images are managed in the admin panel (Portfolyo) and stored in
// portfolio.json. Piercing area photos live in each area's own content entry.
import portfolio from './portfolio.json';

export type GalleryCategory = {
  key: string;
  label: string;
  images: string[];
};

/** Dövme portfolio grouped by style — drives the filters on /portfolyo. */
export const dovmeGalleries: GalleryCategory[] = portfolio.categories.filter(
  (c) => c.images.length > 0
);

/** Featured set used by the homepage teaser and the top of /portfolyo. */
export const topPortfolio: string[] = portfolio.featured;

export const studioPhotos: string[] = portfolio.studio;
