# Black Ink Art — Site Notları ve Yapılacaklar

Bu dosya, sitenin mevcut durumunu ve yayın öncesi tamamlanması gerekenleri özetler.

## Nasıl çalıştırılır

```bash
npm install
npm run dev       # geliştirme sunucusu — http://localhost:4321
npm run build     # dist/ klasörüne statik site üretir
npm run preview   # üretilen build'i yerelde önizler
```

`npm run build` sonrası oluşan **dist/** klasörünü [Netlify Drop](https://app.netlify.com/drop) sayfasına
sürükleyip bırakarak siteyi anında yayınlayabilirsiniz (plandaki 1. adım).

## Yer Tutucu (Placeholder) Değerler — Yayın Öncesi Değiştirin

Hepsi tek dosyada toplu: **`src/data/site.ts`**. İçinde şu alanlar gerçek bilgilerle değiştirilmeli:

- `url` — satın alınan gerçek alan adı
- `phone`, `whatsapp`, `email` — gerçek iletişim bilgileri
- `instagram.handle` / `instagram.url`
- `jewelryShopUrl` — piercing takı e-ticaret sitesinin gerçek adresi
- `calcomUrl` — Cal.com hesabı kurulduğunda gerçek randevu linki (`src/pages/randevu.astro` bunu otomatik kullanır)
- `address` (sokak/kapı no, posta kodu) ve `geo` (enlem/boylam) — Google Business Profile onaylandığında
- `mapsEmbedSrc` — gerçek Google Maps embed linki
- `hours` — gerçek çalışma saatleri
- `googleBusinessUrl`

`astro.config.mjs` içindeki `SITE_URL` sabiti de gerçek alan adıyla güncellenmeli (sitemap ve SEO
canonical linkleri için).

## Fiyatlar

Kaynak: `piercing fiyat listeleri/*.docx` (Şubat 2026). Fiyatlar `src/data/prices.ts` dosyasında
düzenlenir — Sanity/Payload admin paneli kurulana kadar fiyat güncellemeleri buradan yapılmalı.
"Fiyatlarımıza KDV dahil değildir" notu, talebiniz üzerine olduğu gibi bırakıldı — Türkiye'de
tüketiciye gösterilen fiyatların KDV dahil olması yasal bir gerekliliktir; yayın öncesi bir mali
müşavire danışmanız önerilir.

## Fotoğraflar

- 199 fotoğraf küratörlük yapılıp `public/images/` altına optimize edilerek (maks. 1600px, JPEG
  kalite 78) kopyalandı. Kaynak klasördeki ~3200 fotoğrafın tamamı **kullanılmadı** — her stil/bölge
  için temsil eden bir seçki yapıldı.
- **Sanatçı portresi eksik:** `public/images/artists/huseyin-olmez.jpg` şu an markalı bir yer
  tutucu (gerçek fotoğraf değil). Gerçek portre geldiğinde aynı dosya yolunu değiştirin.
- **"dudak" ve "dil" piercing fotoğrafları**, tek bir kaynak klasörden (99 karışık fotoğraf) görsel
  olarak sınıflandırılarak ayrıldı; birkaç fotoğraf yanlış kategoriye düşmüş olabilir, gözden geçirmenizi öneririz.
- **Genital ve yanak (cheek) piercing** sayfalarında mahremiyet gerekçesiyle hiç fotoğraf
  kullanılmadı (kaynakta da uygun fotoğraf yoktu).

## Yayınlamadığım İçerikler — Önemli

Kaynak klasörlerde bulduğum aşağıdaki belgeleri **bilerek siteye koymadım**, çünkü hepsinde T.C.
kimlik numaranız açıkça görünüyor (kamuya açık bir sitede yayınlamak kimlik hırsızlığı riski
oluşturur):

- `Belgelerim/IMG_7558.JPG` — Dövme Uygulayıcılığı Eğitimi kurs bitirme belgesi (2017)
- `Black_İnk_Art/hijyen belgeleri/*.pdf` — 3 adet MEB hijyen eğitimi katılım/kurs bitirme belgesi (2022)

Bu sertifikaların **metin bilgilerini** (unvan, kurum, tarih) [Hijyen ve Güvenlik](src/pages/hijyen-ve-guvenlik.astro)
sayfasına görsel olmadan ekledim. İsterseniz kimlik numarası kırpılmış/sansürlenmiş bir versiyonunu
hazırlayıp bana iletebilirsiniz, o zaman görselleri de ekleyebilirim.

`Black_İnk_Art/patent/black ink art.pdf` içinde TÜRKPATENT'e yapılmış bir marka **başvurusu**
(2025/000887, henüz tescil değil) bulunuyor — bu belgede hassas alanlar zaten maskelenmiş, isterseniz
"Marka başvurusu yapılmıştır" notu olarak footer'a eklenebilir.

## Eksik / Sizden Beklenen

- Gerçek logo dosyası bulundu ve kullanıldı: `logo new/black ink art logo.png` (Masaüstü).
- Domain, Cal.com hesabı, Google Business Profile durumu — plandaki "owed" listesi hâlâ geçerli.
- Sitede yer alan KVKK / Çerez Politikası / 18 Yaş ve Onam Politikası metinleri **taslaktır**; genel
  bilgilendirme amaçlıdır ve yayın öncesi bir hukuk danışmanına gösterilmesi önerilir.

## 3D Dövme Önizleme Aracı (`/dovme-onizleme`)

Ziyaretçi hazır bir tasarım seçiyor ya da kendi tasarımını yüklüyor, 3D vücut modelini döndürüp
istediği bölgeye tıklıyor; dövme modelin yüzeyine (decal olarak) sarılıyor. Boyut, açı ve opaklık
ayarlanabiliyor, sonuç PNG olarak indirilebiliyor.

- **3D model:** MakeHuman temel gövde meshi — **CC0 lisanslı** (ticari kullanım serbest, atıf
  gerekmez). Kaynak: `makehumancommunity/makehuman`. Sadece `body` grubu ayıklanıp
  `public/models/human-body.obj` olarak kaydedildi. Model, anatomik bir manken (yüz/uzuv detayı
  düşük, cinsel organ detayı yok); dövme yerleşimi göğüs, kaburga, kalça ve üst bacakta da
  denenebilsin diye kıyafetsiz gösteriliyor (kıyafet ekleme özelliği kullanıcı isteğiyle
  kaldırıldı). Görüntüleyicinin üstünde **Kadın / Erkek** seçimi var: aynı CC0 taban meshinden
  türetilmiş iki varyant
  (`human-body-female.obj`, `human-body-male.obj`). Gövdeler `public/models/build-bodies.py` ile üretiliyor: önce MakeHuman'ın kendi **CC0 morph
  target**'ları (erkek + maksimum kas, kadın + göğüs + ideal oranlar — `public/models/targets/`)
  uygulanıyor, ardından küçük bir düzeltme geçişi (omuz genişliği, bel/kalça oranı, göğüs kütlesi, boyun,
  trapez, kol kalınlığı). Betik her deformasyonu, kol–gövde birleşim noktasına olan **gerçek 3B
  mesafeye** göre söndürüyor; bu sayede omuz/koltukaltı bölgesinde mesh yırtılmıyor. Erkek modelin
  oranları antropometrik aralıkta tutuluyor (göğüs/bel ≈ 1.44, kalça/göğüs ≈ 0.92). Ham mesh
  `human-body-original.obj` olarak duruyor; oranları değiştirmek için betikteki sayıları düzenleyip
  `python3 build-bodies.py` çalıştırmak yeterli. Görüntüleyicinin sol alt
  köşesindeki **"Kıyafet"** düğmesi, gerektiğinde (ör. reklam görselleri, sosyal medya paylaşımı)
  koyu bir üst/şort ekliyor. Not: Meta/Google reklam politikaları 3D de olsa çıplak figüre takılabilir;
  reklam görselleri hazırlarken bu düğmeyi açmak işinizi kolaylaştırır.
- **Kas rölyefi:** `tools/anatomy.py` içinde analitik bir "kas alanı" tanımlı (göğüs, karın, omuz,
  sırt, kalça, bacak kasları, köprücük kemiği, omurga oluğu...). `tools/apply-anatomy.py` bunu iki
  şekilde uyguluyor: (1) vertex'leri normal yönünde kaydırarak **gerçek geometri** (siluete etki
  eder), (2) mesh'in UV'lerinden geçirip **bump map** olarak pişirerek (`anatomy-male.jpg`,
  `anatomy-female.jpg`) gölgelemede kas tanımı. Kadın modelde ağırlıklar yumuşatılmış.
  Modelleri yeniden üretmek için sırayla: `cd tools && python3 build-bodies.py && python3 apply-anatomy.py`
- **Cilt dokusu:** `public/models/skin-color.jpg` + `skin-bump.jpg` — prosedürel olarak üretildi.
- **Hazır tasarımlar:** `public/images/tattoo-templates/*.png` (12 adet) — sıfırdan çizilen vektör
  benzeri flash tasarımlar. Stüdyonun kendi flash çizimleri hazır olduğunda bu klasördeki dosyalar
  değiştirilebilir; sayfadaki `templates` listesine dosya adını eklemek yeterli.
- **Kendi tasarımını yükleme:** arka plan kaldırma `@imgly/background-removal` ile **tamamen
  tarayıcıda** yapılır; fotoğraf sunucuya gitmez. İlk kullanımda ~40 MB model dosyası indirilir.
- **Gezinme:** sürükle = döndür, tekerlek (imleç görüntüleyicinin üzerindeyken) / + − düğmeleri /
  çift tık = tıklanan bölgeye odaklan (boşluğa çift tık = geri uzaklaş); sol alttaki ok tuşları ya da Shift+sürükle = görünümü kaydır (yakınlaşmışken vücutta gezinmek için), ⤢ = seçili bölgeye sığdır. İmleç görüntüleyicinin dışına çıktığında
  tekerlek yeniden sayfayı kaydırır.
- **Teknik:** three.js + OrbitControls + DecalGeometry. Bu sayfanın JS paketi ~134 KB (gzip) ve
  yalnızca bu sayfada yüklenir.

### Daha gerçekçi görünüm istenirse
Şu anki manken temiz ama fotogerçekçi değil. İstenirse satın alınan gerçekçi bir 3D insan modeli
(GLB/GLTF, ~30–80 USD; Sketchfab/TurboSquid) `public/models/` içine konup yükleyici tek satırda
değiştirilebilir — decal/rotasyon/ölçek mantığının tamamı aynen çalışmaya devam eder.

## Teknik Notlar

- Stack: Astro 5.18.2 (statik çıktı), self-hosted fontlar (`@fontsource/cormorant-garamond`,
  `@fontsource/manrope`), `@astrojs/sitemap`.
- İletişim formu (`/hakkimizda-iletisim`) Netlify Forms (`data-netlify="true"`) için hazırlandı —
  Netlify'da otomatik çalışır. Vercel'de host edilirse ayrı bir form backend'i (ör. Formspree)
  gerekir.
- Node sürümü: bu makinede Node 20.18.0 kurulu; Astro 5 bunu destekler (Astro 7 ise Node 22+ ister —
  bu yüzden bilinçli olarak Astro 5.18.2'de kalındı).
- Sanity/Payload CMS entegrasyonu henüz yapılmadı — içerik şu an `src/content/` altında Markdown,
  `src/data/prices.ts` ve `src/data/site.ts` içinde TypeScript olarak tutuluyor.
