/**
 * Sık sorulan sorular. Cevaplar yeni bilgi üretmiyor: fiyat, saat, adres gibi
 * değişebilen değerler panelden yönetilen veriden (site.json, prices.json)
 * çekiliyor; kural ve hijyen maddeleri ilgili sayfalardaki metnin özeti.
 * Bir sayfadaki bilgi değişirse buradaki özeti de gözden geçirin.
 *
 * Görünen metin ile FAQPage şeması aynı kaynaktan üretiliyor (`faqSchema`),
 * böylece şema sayfada görünmeyen bir şey söylemiyor.
 */
import { site } from './site';
import { tattooPricing, tattooNotes, kdvNote } from './prices';
import { localizePath, type Lang } from '../i18n/config';
import { alternateFor } from '../i18n/routes';

export type FaqItem = {
  q: string;
  a: string;
  /** Cevabın altında "ayrıntı" bağlantısı olarak gösterilir (şemaya girmez). */
  link?: { href: string; label: string; external?: boolean };
};

export type FaqTopic = 'general' | 'tattoo' | 'piercing';

const fmt = (n: number, lang: Lang) => n.toLocaleString(lang === 'en' ? 'en-GB' : 'tr-TR');

export async function getFaq(lang: Lang, topic: FaqTopic): Promise<FaqItem[]> {
  const L = (tr: string, en: string) => (lang === 'en' ? en : tr);
  const loc = (trPath: string) => localizePath(trPath, lang);
  // Rehber yazılarının slug'ı dile göre değişiyor; eşleşmeyi `translationKey` kuruyor.
  const guide = (trPath: string) => alternateFor(trPath, lang);

  const hours = site.hours
    .map((h: any) => `${lang === 'en' && h.dayEn ? h.dayEn : h.day}: ${lang === 'en' && h.hoursEn ? h.hoursEn : h.hours}`)
    .join('; ');

  const items: Record<string, FaqItem> = {
    booking: {
      q: L('Randevuyu nasıl alırım?', 'How do I book an appointment?'),
      a: L(
        'Randevu sayfasındaki formu doldurup mesajı WhatsApp\'tan gönderebilirsiniz. Telefon, e-posta ya da Instagram üzerinden yazmak da mümkün. Günü ve saati stüdyo belirler; mesajınız bize ulaşıp onaylanmadan randevu kesinleşmez.',
        'Fill in the form on the booking page and send the message on WhatsApp. You can also write by phone, e-mail or Instagram. The studio sets the day and time; an appointment is not confirmed until your message reaches us and we agree.'
      ),
      link: { href: loc('/randevu'), label: L('Randevu formu', 'Booking form') },
    },
    where: {
      q: L('Stüdyo nerede, hangi saatlerde açıksınız?', 'Where is the studio and when are you open?'),
      a: L(
        `Stüdyo ${site.address.full} adresinde. Çalışma saatleri — ${hours}.`,
        `The studio is at ${site.address.full}. Opening hours — ${hours}.`
      ),
      link: { href: loc('/hakkimizda-iletisim'), label: L('Adres ve harita', 'Address and map') },
    },
    age: {
      q: L('18 yaşından küçükler dövme veya piercing yaptırabilir mi?', 'Can people under 18 get a tattoo or piercing?'),
      a: L(
        '18 yaşından küçüklere kural olarak uygulama yapılmaz ve uygulamadan önce kimlikle yaş doğrulaması istenir. Tek istisna, velinin ya da yasal vasinin uygulama sırasında stüdyoda bizzat bulunması, çocukla akrabalığı gösteren belgeyi ibraz etmesi ve onam formunu çocuk adına imzalamasıdır. Bu durumda bile uygun bulmadığımız talebi reddetme hakkımız saklıdır.',
        'As a rule we do not tattoo or pierce anyone under 18, and we ask for ID to check age before any procedure. The only exception is a parent or legal guardian who is present in the studio during the procedure, shows a document proving their relationship to the child, and signs the consent form on the child\'s behalf. Even then we may decline a request we do not think suitable.'
      ),
      link: { href: loc('/yas-ve-onam-politikasi'), label: L('18 Yaş ve Onam Politikası', 'Age & Consent Policy') },
    },
    hygiene: {
      q: L('Hijyen ve sterilizasyon nasıl sağlanıyor?', 'How are hygiene and sterilisation handled?'),
      a: L(
        'Her uygulamada tek kullanımlık, steril paketinden müşterinin gözü önünde açılan iğne kullanılır. Tekrar kullanılabilir metal ekipman her kullanım sonrası otoklavda sterilize edilir. Çalışma yüzeyleri her müşteriden önce dezenfekte edilir ve tek kullanımlık örtüyle kaplanır; uygulama boyunca tek kullanımlık steril eldiven kullanılır.',
        'Every procedure uses a single-use needle opened from its sterile packaging in front of the client. Reusable metal equipment is sterilised in an autoclave after every use. Work surfaces are disinfected and covered with a single-use cover before each client, and single-use sterile gloves are worn throughout.'
      ),
      link: { href: loc('/hijyen-ve-guvenlik'), label: L('Hijyen ve Güvenlik', 'Hygiene and Safety') },
    },
    tattooPrice: {
      q: L('Dövme fiyatları nasıl belirleniyor?', 'How are tattoo prices set?'),
      a: L(
        `Makine açılış fiyatı ${fmt(tattooPricing.openingPrice, lang)} TL. ${tattooNotes(lang)[0]} ${tattooNotes(lang)[tattooNotes(lang).length - 1]} ${kdvNote(lang)}`,
        `The machine set-up price is ${fmt(tattooPricing.openingPrice, lang)} TRY. ${tattooNotes(lang)[0]} ${tattooNotes(lang)[tattooNotes(lang).length - 1]} ${kdvNote(lang)}`
      ),
      link: { href: loc('/dovme/fiyatlar'), label: L('Dövme fiyatları', 'Tattoo prices') },
    },
    piercingPrice: {
      q: L('Piercing fiyatları nedir?', 'How much does a piercing cost?'),
      a: L(
        'Fiyat, uygulama yerine ve takının malzemesine (cerrahi çelik, taşlı ve ring, titanyum) göre değişir. Güncel tabloyu fiyat sayfasında bulabilirsiniz.',
        'The price depends on the placement and the jewellery material (surgical steel, gemmed and ring, titanium). You will find the current table on the prices page.'
      ),
      link: { href: loc('/piercing/fiyatlar'), label: L('Piercing fiyatları', 'Piercing prices') },
    },
    tryOn: {
      q: L('Dövmeyi yaptırmadan önce vücudumda nasıl görebilirim?', 'How can I see a tattoo on my body before getting it?'),
      a: L(
        '3D dövme deneme aracında hazır tasarımlardan birini seçip 3D modelde ya da kendi fotoğrafınızda deneyebilirsiniz. Araç bir simülasyondur; gerçek sonuç vücut hatlarınıza, cilt tonunuza ve uygulama tekniğine göre farklı olabilir.',
        'In the 3D tattoo try-on tool you can pick one of the ready designs and try it on a 3D model or on your own photo. The tool is a simulation; the real result can differ depending on your body shape, skin tone and the technique used.'
      ),
      link: { href: loc('/dovme-onizleme'), label: L('3D Dövme Dene', 'Try a 3D Tattoo') },
    },
    jewelry: {
      q: L('Piercing takısını nereden alabilirim?', 'Where can I buy piercing jewellery?'),
      a: L(
        'Stüdyomuzda kendi markamız Piercingland\'in takıları kullanılıyor. Online sipariş verebilir ya da stüdyoya gelmeden ürün seçebilirsiniz.',
        'The studio uses jewellery from our own brand, Piercingland. You can order online or choose your pieces before you come in.'
      ),
      link: { href: site.jewelryShopUrl, label: 'Piercingland', external: true },
    },
  };

  // Rehber yazılarına bağlananlar (slug dile göre değişiyor).
  const tattooHealing: FaqItem = {
    q: L('Dövme ne kadar sürede iyileşir?', 'How long does a tattoo take to heal?'),
    a: L(
      'İnsan derisi ortalama 21 günde yenilenir, ancak bu süre kişiden kişiye değiştiği için bakımı 30 gün boyunca sürdürmenizi öneriyoruz.',
      'Human skin renews itself in about 21 days on average, but this varies from person to person, so we recommend keeping up the aftercare for 30 days.'
    ),
    link: { href: await guide('/dovme/dovme-bakimi'), label: L('Dövme bakımı', 'Tattoo aftercare') },
  };
  const piercingCare: FaqItem = {
    q: L('Piercing bakımı nasıl yapılır?', 'How do I look after a new piercing?'),
    a: L(
      'İlk 2 gün bölgeyi sudan koruyun. Delim gününden itibaren 10 gün boyunca, günde en az 5 kez tuzlu su ya da piercing solüsyonu uygulayın. Yeni piercing ilk 2 ay hareket ettirilmemeli ve çıkarılmamalıdır.',
      'Keep the area out of water for the first 2 days. From the day of piercing, apply saline or piercing solution at least 5 times a day for 10 days. A new piercing should not be moved or taken out for the first 2 months.'
    ),
    link: { href: await guide('/piercing/piercing-bakimi'), label: L('Piercing bakımı', 'Piercing aftercare') },
  };
  const piercingHealing: FaqItem = {
    q: L('Piercing ne kadar sürede iyileşir?', 'How long does a piercing take to heal?'),
    a: L(
      'Süre uygulama yerine göre değişir; her bölgenin iyileşme süresi kendi sayfasında yazıyor.',
      'The time depends on the placement; the healing time for each placement is on its own page.'
    ),
    link: { href: loc('/piercing/bolgeler'), label: L('Bölgelere göre iyileşme süresi', 'Healing time by placement') },
  };
  const piercingMaterial: FaqItem = {
    q: L('İlk piercing için hangi takı malzemesi uygun?', 'Which jewellery material suits a first piercing?'),
    a: L(
      'İlk delimde titanyum ya da doğru standarttaki 316L cerrahi çelik kullanılmasını öneriyoruz.',
      'For a first piercing we recommend titanium or surgical steel of the right standard (316L).'
    ),
    link: { href: await guide('/piercing/piercing-malzemeleri'), label: L('Piercing malzemeleri', 'Piercing materials') },
  };

  switch (topic) {
    case 'tattoo':
      return [items.tattooPrice, tattooHealing, items.age, items.tryOn, items.booking];
    case 'piercing':
      return [piercingCare, piercingHealing, piercingMaterial, items.piercingPrice, items.jewelry, items.age];
    default:
      return [items.booking, items.where, items.age, items.hygiene, items.tattooPrice, items.piercingPrice, items.tryOn, items.jewelry];
  }
}

/** Görünen sorularla birebir aynı FAQPage şeması. */
export function faqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
