<?php
// Black Ink Art — iletişim formu (Hostinger).
// "Mesaj Bırakın" formundan gelen mesajı stüdyonun e-postasına iletir.
//
// İki şekilde çalışır:
//  - Tarayıcıda JavaScript varsa form fetch ile gönderilir (X-Requested-With: fetch)
//    ve JSON yanıt döner; sayfa yenilenmez, yükleniyor/hata durumları gösterilir.
//  - JavaScript yoksa düz form gönderimi çalışır ve ziyaretçi ?mesaj=ok / ?mesaj=hata
//    ile forma geri yönlendirilir.
// Doğrulama (ad, telefon/e-posta, mesaj uzunluğu) iki yolda da sunucuda yapılır;
// tarayıcıdaki denetim yalnızca kolaylık içindir, güvenlik buraya dayanır.

header_remove('X-Powered-By');

$ALICI = 'black_inkart@hotmail.com';
$GONDEREN = 'noreply@blackinkart.com.tr';

// ---- Hız sınırı: aynı IP 10 dakikada en fazla 5 mesaj gönderebilir. Sınırsız
// gönderim, sunucunun mail() işlevini spam için kötüye kullanmaya ya da
// stüdyonun kutusunu doldurmaya açıktı. Kayıtlar public_html dışında,
// panelin kullandığı bia-panel klasöründe tutuluyor.
$RATE_DIR = dirname(__DIR__) . '/bia-panel';
$RATE_MAX = 5;
$RATE_WINDOW = 600;
$RATE_FILE_MAX_AGE = 86400; // süresi dolmuş sayaç dosyaları bir günden sonra silinir

$AJAX = (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch');

function iletisim_ip(): string
{
    return preg_replace('/[^0-9a-fA-F:.]/', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
}

/** Eski sayaç dosyalarını siler (IP özetleri sunucuda gereğinden uzun kalmasın). */
function iletisim_temizle(string $dir, int $maxYas): void
{
    foreach (['ilet-*.json', 'fails-*.json'] as $desen) {
        foreach (@glob($dir . '/' . $desen) ?: [] as $dosya) {
            if (@filemtime($dosya) < time() - $maxYas) {
                @unlink($dosya);
            }
        }
    }
}

function iletisim_rate_asildi(string $dir): bool
{
    global $RATE_MAX, $RATE_WINDOW, $RATE_FILE_MAX_AGE;
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) {
        return false; // Klasör oluşmuyorsa sınırı uygulayamayız; formu engellemeyelim.
    }
    // Her isteğe temizlik yüklemeyelim: yaklaşık yirmide birinde yeterli.
    if (random_int(1, 20) === 1) {
        iletisim_temizle($dir, $RATE_FILE_MAX_AGE);
    }
    $f = $dir . '/ilet-' . md5(iletisim_ip()) . '.json';
    $list = is_file($f) ? (json_decode((string) file_get_contents($f), true) ?: []) : [];
    $list = array_values(array_filter($list, fn($t) => $t > time() - $RATE_WINDOW));
    if (count($list) >= $RATE_MAX) {
        return true;
    }
    $list[] = time();
    @file_put_contents($f, json_encode($list), LOCK_EX);
    return false;
}

/**
 * Sonucu bildirir ve çıkar. JavaScript'li istekte JSON, düz formda yönlendirme.
 * Hata ayrıntısı (yığın izi, sunucu yolu) hiçbir zaman istemciye gitmez.
 */
function iletisim_bitir(bool $ok, string $kod, int $http): void
{
    global $AJAX;
    if ($AJAX) {
        http_response_code($http);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => $ok, 'code' => $kod]);
        exit;
    }
    $donus = isset($_POST['donus']) && is_string($_POST['donus']) ? $_POST['donus'] : '/hakkimizda-iletisim';
    // Yalnızca site içi yol: "/..." ile başlamalı, "//" veya ters bölü içermemeli.
    if (!preg_match('#^/[A-Za-z0-9/_-]*$#', $donus) || strpos($donus, '//') !== false) {
        $donus = '/hakkimizda-iletisim';
    }
    // #çapa: JavaScript kapalıyken sayfa CSS :target ile ilgili mesajı gösteriyor.
    header('Location: ' . $donus . '?mesaj=' . ($ok ? 'ok' : 'hata') . '#' . ($ok ? 'form-sent' : 'form-error'), true, 303);
    exit;
}

function iletisim_alan(string $ad, int $max): string
{
    $v = (isset($_POST[$ad]) && is_string($_POST[$ad])) ? trim($_POST[$ad]) : '';
    return function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : substr($v, 0, $max);
}

function iletisim_uzunluk(string $s): int
{
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
}

/** Telefon numarası ya da e-posta: tek alan ikisini de kabul ediyor. */
function iletisim_gecerli_iletisim(string $v): bool
{
    if (strpos($v, '@') !== false) {
        return (bool) filter_var($v, FILTER_VALIDATE_EMAIL);
    }
    if (!preg_match('/^\+?[0-9 ().\-]{10,25}$/', $v)) {
        return false;
    }
    $rakam = strlen(preg_replace('/\D/', '', $v));
    return $rakam >= 10 && $rakam <= 15;
}

// Gönderim ayrı bir işlevde: sunucuda mail() kullanılır, testlerde yerine bir
// kayıtçı konulabilsin diye.
if (!function_exists('iletisim_gonder')) {
    function iletisim_gonder(string $alici, string $konu, string $govde, string $basliklar, string $param): bool
    {
        return @mail($alici, $konu, $govde, $basliklar, $param);
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: /hakkimizda-iletisim', true, 302);
    exit;
}

if (iletisim_rate_asildi($RATE_DIR)) {
    iletisim_bitir(false, 'rate', 429);
}

// Bot tuzağı: gerçek ziyaretçi bu alanı görmez; doluysa sessizce "başarılı" de.
if (!empty($_POST['bot-field'])) {
    iletisim_bitir(true, 'ok', 200);
}

$ad = iletisim_alan('name', 120);
$iletisim = iletisim_alan('contact', 160);
$mesaj = iletisim_alan('message', 5000);

// Başlık enjeksiyonunu önle: tek satırlık alanlarda satır sonu olmasın.
$ad = str_replace(["\r", "\n"], ' ', $ad);
$iletisim = str_replace(["\r", "\n"], ' ', $iletisim);

if (iletisim_uzunluk($ad) < 2 || iletisim_uzunluk($mesaj) < 10 || !iletisim_gecerli_iletisim($iletisim)) {
    iletisim_bitir(false, 'invalid', 422);
}

$konu = '=?UTF-8?B?' . base64_encode('Web sitesinden mesaj: ' . $ad) . '?=';
$govde = "Ad: $ad\nTelefon / E-posta: $iletisim\n\nMesaj:\n$mesaj\n\n"
       . "---\nblackinkart.com.tr iletişim formu, " . date('d.m.Y H:i') . "\n";

$basliklar = [
    'From: Black Ink Art Web <' . $GONDEREN . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];
if (filter_var($iletisim, FILTER_VALIDATE_EMAIL)) {
    $basliklar[] = 'Reply-To: ' . $iletisim;
}

$ok = iletisim_gonder($ALICI, $konu, $govde, implode("\r\n", $basliklar), '-f' . $GONDEREN);
iletisim_bitir($ok, $ok ? 'ok' : 'mail', $ok ? 200 : 502);
