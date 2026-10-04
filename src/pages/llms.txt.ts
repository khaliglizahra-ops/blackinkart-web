/**
 * /llms.txt — siteyi dil modellerinin kolay okuyabileceği sade bir metinle
 * tanıtır (llmstxt.org önerisi). Henüz robots.txt kadar yerleşik bir standart
 * değil; zararı yok, işe yarayıp yaramayacağı okuyan sisteme bağlı.
 *
 * Metin build sırasında üretiliyor: adres, saat, fiyat ve sayfa listeleri
 * panelden yönetilen veriden geliyor, yani panelde bir şey değişince bu dosya
 * da bir sonraki yayında güncellenir. Burada elle bilgi uydurulmaz.
 */
import type { APIRoute } from 'astro';
import { site } from '../data/site';
import { tattooPricing, kdvNote } from '../data/prices';
import { getLocalizedCollection, cleanSlug } from '../i18n/content';
import { localizePath, type Lang } from '../i18n/config';

const abs = (path: string) => new URL(path, site.url).toString();

type Entry = { data: { title: string; description?: string } ; slug: string };

async function section(collection: 'dovme-rehberi' | 'piercing-rehberi' | 'piercing-bolgeleri' | 'sanatcilar', base: string, lang: Lang) {
  const entries = (await getLocalizedCollection(collection as any, lang)) as unknown as Entry[];
  return entries.map((e) => {
    const title = collection === 'sanatcilar' ? (e.data as any).name : e.data.title;
    const desc = (e.data as any).description;
    return `- [${title}](${abs(`${localizePath(base, lang)}/${cleanSlug(e.slug)}`)})${desc ? `: ${desc}` : ''}`;
  });
}

export const GET: APIRoute = async () => {
  const hoursTr = site.hours.map((h: any) => `${h.day}: ${h.hours}`).join('; ');
  const hoursEn = site.hours.map((h: any) => `${h.dayEn ?? h.day}: ${h.hoursEn ?? h.hours}`).join('; ');

  const page = (trPath: string, label: string, note: string) => `- [${label}](${abs(localizePath(trPath, 'tr'))}): ${note}`;
  const pageEn = (trPath: string, label: string, note: string) => `- [${label}](${abs(localizePath(trPath, 'en'))}): ${note}`;

  const lines: string[] = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `${site.name} is a tattoo and piercing studio in Çankaya, Ankara, Türkiye. The site is in Turkish (default) and English (under /en). It presents the studio's work, artists, prices, hygiene practices and aftercare guides, offers a booking request form that opens a WhatsApp message, and a 3D / photo tattoo try-on tool that runs in the visitor's browser.`,
    '',
    '## Studio',
    '',
    `- Address: ${site.address.full}`,
    `- Phone / WhatsApp: ${site.phone}`,
    `- E-mail: ${site.email}`,
    `- Instagram: ${site.instagram.handle} (${site.instagram.url})`,
    `- Opening hours (TR): ${hoursTr}`,
    `- Opening hours (EN): ${hoursEn}`,
    `- Piercing jewellery shop (own brand, separate site): ${site.jewelryShopUrl}`,
    '',
    '## Main pages (Turkish)',
    '',
    page('/dovme', 'Dövme', 'tattoo services, guides and aftercare'),
    page('/piercing', 'Piercing', 'piercing services, placements, guides and aftercare'),
    page('/portfolyo', 'Portfolyo', 'photo portfolio by tattoo style and piercing placement'),
    page('/sanatcilar', 'Sanatçılar', 'the studio artists'),
    page('/dovme/fiyatlar', 'Dövme fiyatları', `tattoo pricing; machine set-up price ${tattooPricing.openingPrice} ${tattooPricing.currency}. ${kdvNote('tr')}`),
    page('/piercing/fiyatlar', 'Piercing fiyatları', 'piercing price tables by placement and jewellery material'),
    page('/piercing/bolgeler', 'Piercing bölgeleri', 'healing time by placement'),
    page('/hijyen-ve-guvenlik', 'Hijyen ve Güvenlik', 'sterilisation and safety practices, training certificates'),
    page('/dovme-onizleme', '3D Dövme Dene', 'try a tattoo design on a 3D model or your own photo (simulation, runs in the browser)'),
    page('/randevu', 'Randevu', 'booking request form; the message is sent via WhatsApp, the studio confirms the time'),
    page('/hakkimizda-iletisim', 'Hakkımızda / İletişim', 'about the studio, address, map, contact form'),
    page('/yas-ve-onam-politikasi', '18 Yaş ve Onam Politikası', 'age limit and consent rules'),
    '',
    '## Main pages (English)',
    '',
    pageEn('/dovme', 'Tattoo', 'tattoo services, guides and aftercare'),
    pageEn('/piercing', 'Piercing', 'piercing services, placements, guides and aftercare'),
    pageEn('/portfolyo', 'Portfolio', 'photo portfolio'),
    pageEn('/sanatcilar', 'Artists', 'the studio artists'),
    pageEn('/dovme/fiyatlar', 'Tattoo prices', 'tattoo pricing'),
    pageEn('/piercing/fiyatlar', 'Piercing prices', 'piercing price tables'),
    pageEn('/hijyen-ve-guvenlik', 'Hygiene and Safety', 'sterilisation and safety practices'),
    pageEn('/dovme-onizleme', '3D Tattoo Try-On', 'try a tattoo design on a 3D model or your own photo'),
    pageEn('/randevu', 'Booking', 'booking request form via WhatsApp'),
    pageEn('/hakkimizda-iletisim', 'About / Contact', 'about the studio, address, map, contact form'),
    '',
    '## Guides: tattoo (Turkish)',
    '',
    ...(await section('dovme-rehberi', '/dovme', 'tr')),
    '',
    '## Guides: piercing (Turkish)',
    '',
    ...(await section('piercing-rehberi', '/piercing', 'tr')),
    '',
    '## Piercing placements (Turkish)',
    '',
    ...(await section('piercing-bolgeleri', '/piercing', 'tr')),
    '',
    '## Guides and placements (English)',
    '',
    ...(await section('dovme-rehberi', '/dovme', 'en')),
    ...(await section('piercing-rehberi', '/piercing', 'en')),
    ...(await section('piercing-bolgeleri', '/piercing', 'en')),
    '',
    '## Artists',
    '',
    ...(await section('sanatcilar', '/sanatcilar', 'tr')),
    '',
    '## Optional',
    '',
    `- [Sitemap](${abs('/sitemap-index.xml')}): all indexable URLs`,
    `- [Privacy Policy](${abs(localizePath('/gizlilik-politikasi', 'en'))}) and [Terms of Use](${abs(localizePath('/kullanim-sartlari', 'en'))})`,
    '',
    'Notes: prices are indicative; the exact price and the appointment are agreed with the studio. The aftercare guides are general information, not medical advice.',
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
