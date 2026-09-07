# Yönetim Paneli — Kurulum ve Kullanım

Panel hazır ve projeye eklendi. Çalışması için bir kerelik üç bağlantı kurmanız
gerekiyor: **GitHub** (içeriğin saklandığı yer), **Netlify** (siteyi yayınlayan
servis) ve ikisi arasındaki **giriş izni**. Hepsi ücretsiz.

Bu adımları sizin hesaplarınızla yapmanız gerekiyor — ben sizin adınıza hesap
açamıyorum. Yaklaşık 15 dakika sürer ve bir kez yapılır.

---

## Adım 1 — GitHub deposu oluşturun

1. [github.com](https://github.com) adresinden ücretsiz hesap açın (varsa giriş yapın).
2. Sağ üstteki **+** → **New repository**.
3. **Repository name:** `blackinkart-web`
4. **Private** seçin (site herkese açık, ama kaynak dosyaların gizli kalması daha iyi).
5. Başka hiçbir kutuyu işaretlemeden **Create repository**.

Açılan sayfada size bir adres gösterilecek, şuna benzer:
`https://github.com/khaliglizahra-ops/blackinkart-web.git`

## Adım 2 — Projeyi GitHub'a gönderin

Terminal'i açın ve şu iki komutu sırayla çalıştırın
(`khaliglizahra-ops` yerine kendi GitHub kullanıcı adınızı yazın):

```bash
cd ~/Desktop/blackinkart-web
git remote add origin https://github.com/khaliglizahra-ops/blackinkart-web.git
git push -u origin main
```

GitHub şifre isterse: normal şifreniz çalışmaz, **Personal Access Token**
gerekir. GitHub → Settings → Developer settings → Personal access tokens →
Tokens (classic) → Generate new token → `repo` iznini seçin → oluşturun ve
çıkan uzun metni şifre olarak yapıştırın.

## Adım 3 — Panelin adresini güncelleyin ✅ (yapıldı)

`public/admin/config.yml` dosyasının 7. satırında şu yazıyor:

```yaml
  repo: khaliglizahra-ops/blackinkart-web
```

`khaliglizahra-ops` kısmını gerçek GitHub kullanıcı adınızla değiştirin, kaydedin
ve gönderin:

```bash
git add public/admin/config.yml && git commit -m "panel deposu ayarlandı" && git push
```

## Adım 4 — Netlify'ı GitHub'a bağlayın

Şu ana kadar siteyi zip sürükleyerek yayınlıyordunuz. Artık Netlify'ın kendisi
GitHub'dan alıp yayınlayacak — panelde yaptığınız her değişiklik otomatik
olarak siteye yansıyacak.

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. **GitHub**'ı seçin, izin verin, `blackinkart-web` deposunu seçin.
3. Ayarlar zaten `netlify.toml` dosyasından okunur, dokunmanıza gerek yok:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Deploy site**. İlk yayın 2-4 dakika sürer.

> Eskiden zip ile oluşturduğunuz site duruyorsa onu silebilirsiniz; artık bu yeni
> site geçerli.

## Adım 5 — Panele giriş iznini açın

Panelin GitHub'a yazabilmesi için Netlify'ın giriş sağlayıcısını açmanız gerekir:

1. Netlify'da sitenizi açın → **Site configuration** → **Access & security** →
   **OAuth** bölümü → **Install provider** → **GitHub**.
2. GitHub'a yönlendirilir, izin verirsiniz, geri döner.

Bu kadar. Artık **`blackinkart.netlify.app/admin`** adresine gidip
**"GitHub ile Giriş"** ile panele girebilirsiniz. Alan adınızı bağladığınızda
adres `www.blackinkart.com.tr/admin` olur.

## Adım 6 — Alan adınızı bağlayın

Alan adınız ve WordPress hostinginiz Türk bir firmada. Alan adı sizde kalıyor;
yalnızca "bu adres hangi sunucuyu göstersin" ayarını değiştiriyoruz.

### Önce: e-postanız nerede?

**Bu adımı atlamayın.** `info@www.blackinkart.com.tr` gibi bir e-posta adresiniz
hostinginizde duruyorsa, aşağıdaki iki yoldan **yalnızca ikincisi** güvenli.

- **Nameserver'ları Netlify'a çevirmek** (Netlify'ın önerdiği yol) tüm DNS
  kayıtlarını Netlify'a taşır. E-posta kayıtlarınız (MX) geride kalır ve
  **e-postanız çalışmayı durdurur.**
- **Mevcut DNS'te kalıp yalnızca iki kayıt değiştirmek** e-postaya dokunmaz.

E-postanız varsa ikinci yolu kullanın. Aşağıdaki adımlar onu anlatıyor.

### 1. Netlify'a alan adını tanıtın

Netlify → siteniz → **Domain management** → **Add a domain** → alan adınızı yazın.

Netlify size **tam olarak hangi kayıtları gireceğinizi ekranda gösterir.**
Aşağıdaki değerler tipik olanlar, ama **Netlify'ın size gösterdiği değerleri
kullanın** — zaman içinde değişebiliyorlar.

### 2. Hosting firmanızın DNS panelinde kayıtları girin

cPanel'de **Zone Editor**, firmanın kendi panelinde genelde **DNS Yönetimi**
adıyla geçer.

| Tip | İsim / Host | Değer |
|---|---|---|
| `CNAME` | `www` | `blackinkart.netlify.app` |
| `A` | `@` (kök alan adı) | `75.2.60.5` (Netlify panelinde de aynı değer görünür) |

Aynı isimde **eski bir kayıt varsa silin** — WordPress'i gösteren `A` veya
`CNAME` kaydı duruyorsa çakışır.

**MX kayıtlarına dokunmayın.** Onlar e-postanızı taşır.

### 3. Bekleyin

Değişiklik yayılması 15 dakika ile birkaç saat arasında sürer. Netlify panelde
"Netlify DNS" veya "External DNS" yanında yeşil onay gösterdiğinde tamamdır.

### 4. HTTPS'i açın

Netlify → **Domain management** → **HTTPS** → **Verify DNS configuration** →
**Provision certificate**. Ücretsiz ve otomatik yenilenir. Kilit simgesi
çıkana kadar bekleyin.

### Bilmeniz gerekenler

- Alan adında şu an bir **WordPress sitesi yayındaysa, o an itibarıyla
  görünmez olur.** Dosyaları hostingde durur, silinmez — ama adres artık yeni
  siteyi gösterir. Eski siteyi yedeklemek isterseniz önce yedek alın.
- **Hostingi iptal etmeyin.** Alan adınız ve e-postanız orada duruyor.
- Site Netlify'da yayında olduğu için hostinginizin hızı veya kotası siteyi
  etkilemez.

---

## Panelde neler var

Bölümler, en sık kullanacağınız iş en üstte olacak şekilde sıralandı:

| Bölüm | Ne değiştirebilirsiniz |
|---|---|
| **Portfolyo** | Öne çıkan fotoğraflar, stil kategorileri (blackwork, minimal, portre…) ve stüdyo fotoğrafları. En sık yapacağınız iş olduğu için en üstte. |
| **İletişim ve Saatler** | Çalışma saatleri (en üstte), telefon, WhatsApp, Instagram, e-posta, adres, harita, randevu linki. |
| **Fiyatlar** | Dövme makine açılış fiyatı, fiyat notları ve 5 piercing tablosunun tüm satırları (çelik / taşlı / titanyum). |
| **Piercing Bölgeleri** | 10 bölge sayfası: metin, iyileşme süresi, acı seviyesi, fotoğraflar. |
| **Dövme Rehberi** | 7 dövme yazısının başlığı, metni ve üst görseli. Yeni yazı ekleyebilirsiniz. |
| **Piercing Rehberi** | 6 piercing yazısı — aynı şekilde. |
| **3D Hazır Tasarımlar** | Müşterilerin 3D modelde deneyebildiği 12 hazır dövme tasarımı. |
| **Sanatçılar** | Sanatçı ekleme, fotoğraf ve biyografi düzenleme. |

Hijyen ve Güvenlik sayfası bilinçli olarak panele eklenmedi — sertifika ve
protokol bilgileri sabit kalsın diye.

## Günlük kullanım

1. `/admin` adresine girin, GitHub ile giriş yapın.
2. Soldan bölümü seçin, değişikliği yapın.
3. Sağ üstten **Yayınla** (Publish).
4. 1-2 dakika sonra site güncellenmiş olur. Sayfayı yenileyip kontrol edin.

**Fotoğraf yüklerken:** telefondan çektiğiniz büyük fotoğrafları doğrudan
yükleyebilirsiniz. Yükleme sırasında telefonunuzda küçültülürler ve fotoğrafın
içindeki **konum (GPS) bilgisi silinir** — bu önemli, çünkü telefon fotoğrafları
çekildikleri adresi içinde taşır. Yayın sırasında bir kez daha optimize edilirler.

Her bölüm kendi fotoğraf klasörünü açar (portfolyo, piercing, stüdyo, sanatçı),
yani "Fotoğraf seç" dediğinizde doğrudan o kategorideki fotoğrafları görürsünüz.

**Uzun listeler kapalı gelir.** Portfolyodaki yüzlerce fotoğraf tek tek açılmaz;
başlığa dokununca açılır. Telefonda kullanmayı bu mümkün kılıyor.

**Fiyat değiştirirken:** sadece sayıyı yazın, "TL" yazmayın — o otomatik eklenir.
Bir uygulamanın fiyatını göstermek istemiyorsanız fiyat kutularını boş bırakıp
"Fiyat yerine gösterilecek not" alanına *"Fiyat için iletişime geçin"* yazın.

## Dikkat

- Panelde yapılan değişiklik **doğrudan yayına gider**, ara onay yoktur.
- **Kategori kimliği** (`key`) ve **fiyat tablosu kimliği** (`slug`) alanlarını
  değiştirmeyin; sayfaların birbirine bağlanmasını sağlarlar.
- Bir şeyi yanlışlıkla bozarsanız hiçbir şey kaybolmaz: GitHub her değişikliğin
  geçmişini tutar, önceki hâline dönülebilir.
