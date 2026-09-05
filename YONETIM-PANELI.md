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
`https://github.com/KULLANICI_ADINIZ/blackinkart-web.git`

## Adım 2 — Projeyi GitHub'a gönderin

Terminal'i açın ve şu iki komutu sırayla çalıştırın
(`KULLANICI_ADINIZ` yerine kendi GitHub kullanıcı adınızı yazın):

```bash
cd ~/Desktop/blackinkart-web
git remote add origin https://github.com/KULLANICI_ADINIZ/blackinkart-web.git
git push -u origin main
```

GitHub şifre isterse: normal şifreniz çalışmaz, **Personal Access Token**
gerekir. GitHub → Settings → Developer settings → Personal access tokens →
Tokens (classic) → Generate new token → `repo` iznini seçin → oluşturun ve
çıkan uzun metni şifre olarak yapıştırın.

## Adım 3 — Panelin adresini güncelleyin

`public/admin/config.yml` dosyasının 7. satırında şu yazıyor:

```yaml
  repo: KULLANICI_ADINIZ/blackinkart-web
```

`KULLANICI_ADINIZ` kısmını gerçek GitHub kullanıcı adınızla değiştirin, kaydedin
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

Bu kadar. Artık **`siteadresiniz.netlify.app/admin`** adresine gidip
**"GitHub ile Giriş"** ile panele girebilirsiniz. Alan adınızı bağladığınızda
adres `www.blackinkart.com.tr/admin` olur.

---

## Panelde neler var

| Bölüm | Ne değiştirebilirsiniz |
|---|---|
| **Fiyatlar** | Dövme makine açılış fiyatı, fiyat notları ve 5 piercing tablosunun tüm satırları (çelik / taşlı / titanyum). Satır ekleyip silebilirsiniz. |
| **Sanatçılar** | Sanatçı ekleme, silme, fotoğraf ve biyografi düzenleme. |
| **Dövme Rehberi** | 7 dövme yazısının başlığı, metni ve üst görseli. Yeni yazı ekleyebilirsiniz. |
| **Piercing Rehberi** | 6 piercing yazısı — aynı şekilde. |
| **Piercing Bölgeleri** | 10 bölge sayfası: metin, iyileşme süresi, acı seviyesi, fotoğraflar. |
| **Portfolyo** | Öne çıkan fotoğraflar, stil kategorileri (blackwork, minimal, portre…) ve stüdyo fotoğrafları. |
| **3D Hazır Tasarımlar** | Müşterilerin 3D modelde deneyebildiği 12 hazır dövme tasarımı. |
| **İletişim ve Saatler** | Telefon, WhatsApp, Instagram, e-posta, adres, harita, çalışma saatleri, randevu linki. |

Hijyen ve Güvenlik sayfası bilinçli olarak panele eklenmedi — sertifika ve
protokol bilgileri sabit kalsın diye.

## Günlük kullanım

1. `/admin` adresine girin, GitHub ile giriş yapın.
2. Soldan bölümü seçin, değişikliği yapın.
3. Sağ üstten **Yayınla** (Publish).
4. 1-2 dakika sonra site güncellenmiş olur. Sayfayı yenileyip kontrol edin.

**Fotoğraf yüklerken:** telefondan çektiğiniz büyük fotoğrafları doğrudan
yükleyebilirsiniz. Yayın sırasında otomatik olarak küçültülüp sıkıştırılırlar,
sitenin hızı bozulmaz. Boyut düşünmenize gerek yok.

**Fiyat değiştirirken:** sadece sayıyı yazın, "TL" yazmayın — o otomatik eklenir.
Bir uygulamanın fiyatını göstermek istemiyorsanız fiyat kutularını boş bırakıp
"Fiyat yerine gösterilecek not" alanına *"Fiyat için iletişime geçin"* yazın.

## Dikkat

- Panelde yapılan değişiklik **doğrudan yayına gider**, ara onay yoktur.
- **Kategori kimliği** (`key`) ve **fiyat tablosu kimliği** (`slug`) alanlarını
  değiştirmeyin; sayfaların birbirine bağlanmasını sağlarlar.
- Bir şeyi yanlışlıkla bozarsanız hiçbir şey kaybolmaz: GitHub her değişikliğin
  geçmişini tutar, önceki hâline dönülebilir.
