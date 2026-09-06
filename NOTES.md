# Black Ink Art — Site Notları ve Yapılacaklar

Bu dosya, sitenin mevcut durumunu ve yayın öncesi tamamlanması gerekenleri özetler.

## Nasıl çalıştırılır

```bash
npm install
npm run dev       # geliştirme sunucusu — http://localhost:4321
npm run build     # dist/ klasörüne statik site üretir
npm run preview   # üretilen build'i yerelde önizler
```

## Yayınlama ve Yönetim Paneli

Site artık GitHub + Netlify üzerinden yayınlanacak şekilde hazırlandı: depoya gönderilen her
değişiklik otomatik olarak yeniden yayınlanır. İçerik, fiyat, fotoğraf ve iletişim bilgileri
`/admin` adresindeki **yönetim panelinden** (Decap CMS) düzenlenir — kod bilmeye gerek yoktur.

Kurulum sizin GitHub ve Netlify hesaplarınızı gerektirir; adım adım anlatımı
**[YONETIM-PANELI.md](YONETIM-PANELI.md)** dosyasında. Kurulum tamamlanana kadar `npm run build`
çıktısı olan **dist/** klasörünü [Netlify Drop](https://app.netlify.com/drop) sayfasına sürükleyerek
de yayınlayabilirsiniz (panel bu yöntemle çalışmaz).

## Yer Tutucu (Placeholder) Değerler — Yayın Öncesi Değiştirin

Hepsi tek yerde: yönetim panelindeki **İletişim ve Saatler** bölümü (dosya karşılığı
`src/data/site.json`). Şu alanlar gerçek bilgilerle değiştirilmeli:

- `url` — satın alınan gerçek alan adı
- `phone`, `whatsapp`, `email` — gerçek iletişim bilgileri
- `instagram.handle` / `instagram.url`
- `jewelryShopUrl` — piercing takı e-ticaret sitesinin gerçek adresi
- `address` (sokak/kapı no, posta kodu) ve `geo` (enlem/boylam) — Google Business Profile onaylandığında
- `mapsEmbedSrc` — gerçek Google Maps embed linki
- `hours` — gerçek çalışma saatleri
- `googleBusinessUrl`

`astro.config.mjs` içindeki `SITE_URL` sabiti de gerçek alan adıyla güncellenmeli (sitemap ve SEO
canonical linkleri için).

## Randevu Akışı

`/randevu` bir takvim değil, **WhatsApp'a giden yapılandırılmış bir form**. Ziyaretçi ne
istediğini seçiyor (dövme stili/tasarımı ya da piercing bölgesi + adet), tercih ettiği günü
ve saat aralığını belirtiyor; form bunları düzgün bir Türkçe mesaja çevirip kendi
WhatsApp'ında açıyor. Gönderdiğinde stüdyoya tek mesajda her şey ulaşıyor, saati stüdyo
belirliyor.

Neden takvim değil: gerçek "boş saat" göstermek bir takvim sunucusu, hesap ve aylık ücret
gerektirir. Bu akış hiçbir arka uç istemiyor, site tamamen statik kalıyor ve sahibinin
onaylamadığı bir randevu asla kesinleşmiş görünmüyor.

- Numara `src/data/site.json` içindeki `whatsapp` alanından geliyor; panelden değiştirilince
  form da otomatik olarak yeni numaraya yazıyor.
- Dövme stilleri `portfolio.json`'daki kategorilerden, piercing bölgeleri
  `src/content/piercing-bolgeleri/` içeriğinden okunuyor — panelden yeni bölge eklenince
  formdaki listeye de kendiliğinden geliyor.
- Cal.com entegrasyonu kaldırıldı (Eylül 2026): stüdyo sahibi harici hesap istemedi.

## Fiyatlar

Kaynak: `piercing fiyat listeleri/*.docx` (Şubat 2026). Fiyatlar artık yönetim panelindeki
**Fiyatlar** bölümünden düzenlenir (dosya karşılığı `src/data/prices.json`).
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

## Sertifika Görselleri — Sansürlenerek Yayınlandı

Talebiniz üzerine 6 belgenin görseli [Hijyen ve Güvenlik](src/pages/hijyen-ve-guvenlik.astro)
sayfasına eklendi. Belgelerin hepsinde **T.C. kimlik numarası, anne ve baba adı**, üçünde ayrıca
**tam doğum tarihi** yer alıyordu. Bu dörtlü, Türkiye'de kimlik doğrulama ve hesap kurtarma için
kullanılan bilgi setinin ta kendisi — kamuya açık bir sitede olduğu gibi yayınlanması kimlik
hırsızlığına açık kapı bırakırdı. Bu yüzden yayınlanan görsellerde o alanlar opak kutuyla
kapatıldı. e-Devlet belgelerindeki **barkod ve karekodlar da kapatıldı**: okutulduklarında belgenin
sansürlenmemiş tam hâli görüntülenebiliyordu.

Kurum, program, tarih, isim ve fotoğraf görünür bırakıldı; belge ziyaretçi için hâlâ ikna edici.

- Kaynaklar: `Belgelerim/` klasöründeki 3 ekran görüntüsü ve 3 fotoğraf (bu klasör siteye
  kopyalanmadı, sadece okundu).
- Sansürleme betiği: `tools/redact-certificates.py` — kapatılacak alanlar orana göre tanımlı,
  `python3 redact-certificates.py` ile yeniden üretilebilir.
- Çıktılar: `public/images/sertifikalar/*.jpg`

Sayfaya ayrıca daha önce hiç yer almayan **Ustalık Belgesi** ve **Kalfalık Belgesi** (TESK, meslek
dalı: Dövme, 2020) eklendi — bunlar mesleki yeterliliğin en güçlü kanıtı olduğu için listenin
başına konuldu.

`Black_İnk_Art/patent/black ink art.pdf` içinde TÜRKPATENT'e yapılmış bir marka **başvurusu**
(2025/000887, henüz tescil değil) bulunuyor — bu belgede hassas alanlar zaten maskelenmiş,
isterseniz "Marka başvurusu yapılmıştır" notu olarak footer'a eklenebilir.

## Eksik / Sizden Beklenen

- Gerçek logo dosyası bulundu ve kullanıldı: `logo new/black ink art logo.png` (Masaüstü).
- **GitHub + Netlify kurulumu** — yönetim panelinin çalışması için tek eksik adım.
  Anlatımı: [YONETIM-PANELI.md](YONETIM-PANELI.md). Kurulumdan sonra
  `public/admin/config.yml` içindeki `repo:` satırı gerçek `kullanıcı/depo` adıyla güncellenmeli.
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
  `python3 build-bodies.py` çalıştırmak yeterli.
  Not: Meta/Google reklam politikaları 3D de olsa çıplak figüre takılabilir; bu sayfanın ekran
  görüntüsünü reklamda kullanacaksanız dövmeli bölgeyi yakın plan kırpmanız işinizi kolaylaştırır.
- **Kaburga kafesi derinliği:** Ölçüldüğünde erkeğin göğüs derinlik/genişlik oranı 0.705 çıkıyordu —
  onaylı KADIN modelinde 0.761, ANSUR erkek ortalaması ~0.756. Yani erkeğin göğsü kadınınkinden
  daha yassıydı; "gerçek göğse benzemiyor" geri bildiriminin fiziksel sebebi buydu. Kafesi
  genişletmek sorunu kötüleştiriyordu, eksik olan DERİNLİKTİ (`build-bodies.py` içinde z ekseni).
  Kafes derinleşince göğsün öne doğru kavisinin çoğunu kemik taşıyor ve pektoral genliği
  düşürülebiliyor — kavis iki kez sayılmıyor. Şu an 0.775.
- **Göğüs (pektoral):** `tools/anatomy.py` içindeki `pec_plate()` göğsü BEŞGEN, ÖN YÜZÜ DÜZ bir
  plaka olarak modelliyor — kubbe/Gauss olarak değil. Bunun sebebi ölçülebilir: erkek göğsünü
  kadın göğsünden ayıran şey hacim değil profil tipi; merkezde tepe yapan radyal simetrik her
  alan koni profili üretir ve "meme" gibi okunur. Kalınlık gerçek anatomik ölçüden geliyor
  (antrenmanlı pektoral ~11 mm; modelde tepe deplasman ~12.9 mm), çünkü göğüs kavisinin çoğu
  kaburga kafesinden yani KEMİKTEN gelir; üstüne kalın bir şişkinlik eklemek kavisi iki kez
  saymak olur. Ayar düğmeleri `anatomy.PEC` sözlüğünde toplu; `tools/tune-chest.py` birkaç
  ayarı yan yana render edip karşılaştırmayı sağlıyor (public/models'a hiçbir şey yazmaz).
- **Kas rölyefi:** `tools/anatomy.py` içinde analitik bir "kas alanı" tanımlı (göğüs, karın, omuz,
  sırt, kalça, bacak kasları, köprücük kemiği, omurga oluğu...). `tools/apply-anatomy.py` bunu iki
  şekilde uyguluyor: (1) vertex'leri normal yönünde kaydırarak **gerçek geometri** (siluete etki
  eder), (2) mesh'in UV'lerinden geçirip **bump map** olarak pişirerek (`anatomy-male.jpg`,
  `anatomy-female.jpg`) gölgelemede kas tanımı. Kadın modelde ağırlıklar yumuşatılmış.
  Modelleri yeniden üretmek için sırayla: `cd tools && python3 build-bodies.py && python3 apply-anatomy.py`
  `apply-anatomy.py` kendi girdisinin üzerine yazar; iki kez üst üste çalıştırılırsa deplasman
  ikiye katlanırdı (pektoral 12.9 mm -> 25.8 mm, yani "biraz kaslı"dan doğrudan vücut
  geliştiriciye). Artık dosyaya bir işaret satırı koyup ikinci çalıştırmayı reddediyor.
- **Form incelemesi:** `tools/render-preview.py` mesh'i gri kil olarak, sıyırma ışığı altında
  render eder (`--chest` yakın plan göğüs). Tarayıcıdaki görüntüleyici müşteri için iyi ama
  anatomi incelemek için elverişsiz: kamerayı yerleştirmek zor, cilt dokusu yüzeyi gizler.
  Sıyırma ışığı en sığ kabartıyı bile gölgeye çevirdiği için hatalar orada görünür.
- **Oranlar:** `build-bodies.py` içindeki `report()` her derlemede omuz, göğüs/bel, kalça/göğüs ve
  göğüs derinlik/genişlik oranlarını hedef aralıklarıyla birlikte basar (ANSUR erkek verisi).
  Ölçüm dilimi bilerek ince (tol=0.008): daha kalın bir dilim istenen yüksekliğin altındaki ve
  üstündeki en geniş noktayı da yakalayıp göğsü %6 şişiriyor, kalçanın gerçekten en geniş olduğu
  yeri ıskalıyordu — bir süre yanlış cetvele göre karar verildi.
- **Kadın modeli dokunulmaz:** erkek için yapılan her değişiklik, kadın mesh'i ve bump map'i
  bayt bayt aynı kalacak şekilde uygulandı (`w["pec"]`/`w["pecedge"]` kadında 0; klavikula
  bandı genişliği gibi ortak parametreler cinsiyete göre ayrıldı). Değişiklik sonrası
  `git diff` ile doğrulanmalı.
- **Cilt dokusu:** `public/models/skin-color.jpg` + `skin-bump.jpg` — prosedürel olarak üretildi.
- **Hazır tasarımlar:** `public/images/tattoo-templates/*.png` (12 adet) — sıfırdan çizilen vektör
  benzeri flash tasarımlar. Stüdyonun kendi flash çizimleri hazır olduğunda yönetim panelindeki
  **3D Hazır Tasarımlar** bölümünden değiştirilebilir/eklenebilir (dosya karşılığı
  `src/data/templates.json`). Şeffaf arka planlı PNG yüklemek gerekir; bu klasördeki dosyalar
  görsel optimizasyonundan bilerek muaf tutulur, şeffaflıkları bozulmasın diye.
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
- **İçerik yönetimi:** Decap CMS 3.16 (`public/admin/`), GitHub backend. Ayrı bir sunucu ya da
  veritabanı yok — panel doğrudan depodaki dosyaları düzenler: `src/content/` altındaki Markdown
  yazıları ve `src/data/{prices,site,portfolio,templates}.json`. TypeScript dosyaları
  (`prices.ts`, `site.ts`, `gallery.ts`) artık bu JSON'ları okuyup tiplendiren ince yükleyicilerdir;
  panelin düzenlediği veri hep JSON tarafındadır.
- **Görsel optimizasyonu:** `scripts/optimize-images.mjs` her build'de çalışır (`npm run build`
  zincirinde). `public/images` altındaki 1600px'i veya 400 KB'ı aşan JPEG/PNG'leri kendi formatında
  yeniden kodlar; `tattoo-templates` klasörü hariç tutulur. Sonuçlar
  `node_modules/.cache/image-optimize.json` içinde önbelleklenir, tekrar eden build'ler hızlıdır.
  Böylece panelden telefon fotoğrafı yüklemek siteyi yavaşlatmaz.
- **Netlify yapılandırması:** `netlify.toml` — build komutu, Node 22, `/admin/*` için SPA
  yönlendirmesi, panelde `noindex` başlığı ve `/_astro/*` + `/models/*` için önbellek başlıkları.
