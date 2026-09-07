import { getCollection } from 'astro:content';
import { LANGS, localizePath, toTurkishPath, langFromPath, type Lang } from './config';
import { entryLang, cleanSlug } from './content';

/**
 * Dil değiştiricinin doğru sayfaya gitmesi için içerik sayfalarının slug
 * eşleşmesi. `/piercing/kulak` ile `/en/piercing/ear` aynı sayfa ama
 * slug'ları farklı; sabit yol tablosu (config.ts ROUTES) yalnızca menüdeki
 * sayfaları kapsıyor, yazı ve bölge sayfalarını kapsamıyordu.
 *
 * Eşleştirme frontmatter'daki `translationKey` üzerinden yapılıyor. Panelde
 * yeni bir yazı tek dilde eklenirse karşılığı bulunamaz ve değiştirici o
 * bölümün ana sayfasına düşer — kırık bağlantı yerine çalışan bir bağlantı.
 */

type Entry = { lang: Lang; slug: string; key: string | undefined };

const SECTIONS: { collection: 'dovme-rehberi' | 'piercing-rehberi' | 'piercing-bolgeleri' | 'sanatcilar'; base: string }[] = [
  { collection: 'dovme-rehberi', base: '/dovme' },
  { collection: 'piercing-rehberi', base: '/piercing' },
  { collection: 'piercing-bolgeleri', base: '/piercing' },
  { collection: 'sanatcilar', base: '/sanatcilar' },
];

let cache: Map<string, Record<Lang, string>> | null = null;

/** Tam adres -> her dildeki karşılığı. Derleme başına bir kez kuruluyor. */
async function buildMap() {
  if (cache) return cache;
  const map = new Map<string, Record<Lang, string>>();

  for (const { collection, base } of SECTIONS) {
    const all = await getCollection(collection);
    const entries: Entry[] = all.map((e) => ({
      lang: entryLang(e.slug),
      slug: cleanSlug(e.slug),
      key: (e.data as { translationKey?: string }).translationKey,
    }));

    const byKey = new Map<string, Partial<Record<Lang, string>>>();
    for (const e of entries) {
      if (!e.key) continue;
      const slot = byKey.get(e.key) ?? {};
      slot[e.lang] = e.slug;
      byKey.set(e.key, slot);
    }

    for (const slots of byKey.values()) {
      const urls = {} as Record<Lang, string>;
      for (const l of LANGS) {
        const slug = slots[l];
        // Karşılığı yoksa bölümün ana sayfasına düş.
        urls[l] = slug ? `${localizePath(base, l)}/${slug}` : localizePath(base, l);
      }
      for (const l of LANGS) {
        if (slots[l]) map.set(urls[l], urls);
      }
    }
  }

  cache = map;
  return map;
}

/** Verilen adresin hedef dildeki karşılığı. */
export async function alternateFor(currentPath: string, target: Lang): Promise<string> {
  const clean = currentPath.replace(/\/$/, '') || '/';
  const map = await buildMap();
  const hit = map.get(clean);
  if (hit) return hit[target];
  // İçerik sayfası değilse sabit yol tablosu yeterli.
  return localizePath(toTurkishPath(clean), target);
}

/** Sayfanın her iki dildeki adresi — hreflang ve dil değiştirici için. */
export async function alternatesFor(currentPath: string) {
  const out = {} as Record<Lang, string>;
  for (const l of LANGS) out[l] = await alternateFor(currentPath, l);
  return out;
}

export { langFromPath };
