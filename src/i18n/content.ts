import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LANG, type Lang } from './config';

/**
 * İngilizce içerik, koleksiyonun içinde `en/` klasöründe duruyor:
 *   src/content/dovme-rehberi/dovme-nedir.md        -> slug "dovme-nedir"       (tr)
 *   src/content/dovme-rehberi/en/what-is-a-tattoo.md -> slug "en/what-is-a-tattoo" (en)
 *
 * Böylece iki dil tek koleksiyon şemasını paylaşıyor, panelde de ayrı bir
 * klasör olarak görünüyor. Aşağıdaki yardımcılar bu öneki ayıklıyor.
 */

type AnyCollection = 'dovme-rehberi' | 'piercing-rehberi' | 'piercing-bolgeleri' | 'sanatcilar';

/** Bir girdinin dili — `en/` önekine bakarak. */
export function entryLang(id: string): Lang {
  return id.startsWith('en/') ? 'en' : 'tr';
}

/** Dil önekini atıp sayfada kullanılacak temiz slug'ı verir. */
export function cleanSlug(slug: string): string {
  return slug.replace(/^en\//, '');
}

/** İstenen dilin girdileri, `order` alanına göre sıralı. */
export async function getLocalizedCollection<C extends AnyCollection>(
  collection: C,
  lang: Lang
): Promise<CollectionEntry<C>[]> {
  const all = await getCollection(collection);
  const mine = all.filter((e) => entryLang(e.slug) === lang);
  // İngilizce çeviri henüz yoksa Türkçesine düşülüyor: sayfa boş kalmasın.
  const list = mine.length ? mine : all.filter((e) => entryLang(e.slug) === DEFAULT_LANG);
  return list.sort((a, b) => {
    const ao = (a.data as { order?: number }).order ?? 0;
    const bo = (b.data as { order?: number }).order ?? 0;
    return ao - bo;
  });
}

/** İki dilin girdilerini birden, statik yol üretimi için. */
export async function getAllLocalized<C extends AnyCollection>(collection: C) {
  const all = await getCollection(collection);
  return all.map((entry) => ({
    entry,
    lang: entryLang(entry.slug),
    slug: cleanSlug(entry.slug),
  }));
}
