<?php
// Black Ink Art — iletişim formu (Hostinger).
// "Mesaj Bırakın" formundan gelen mesajı stüdyonun e-postasına iletir,
// sonra ziyaretçiyi ?mesaj=ok / ?mesaj=hata ile forma geri gönderir.

$ALICI = 'black_inkart@hotmail.com';
$GONDEREN = 'noreply@blackinkart.com.tr';

function geri($sonuc) {
    $donus = isset($_POST['donus']) ? (string) $_POST['donus'] : '/hakkimizda-iletisim';
    // Yalnızca site içi yol: "/..." ile başlamalı, "//" veya ters bölü içermemeli.
    if (!preg_match('#^/[A-Za-z0-9/_-]*$#', $donus) || strpos($donus, '//') !== false) {
        $donus = '/hakkimizda-iletisim';
    }
    header('Location: ' . $donus . '?mesaj=' . $sonuc, true, 303);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /hakkimizda-iletisim', true, 302);
    exit;
}

// Bot tuzağı: gerçek ziyaretçi bu alanı görmez; doluysa sessizce "başarılı" de.
if (!empty($_POST['bot-field'])) {
    geri('ok');
}

function alan($ad, $max) {
    $v = isset($_POST[$ad]) ? trim((string) $_POST[$ad]) : '';
    return function_exists('mb_substr') ? mb_substr($v, 0, $max, 'UTF-8') : substr($v, 0, $max);
}

$ad = alan('name', 120);
$iletisim = alan('contact', 160);
$mesaj = alan('message', 5000);

if ($ad === '' || $iletisim === '' || $mesaj === '') {
    geri('hata');
}

// Başlık enjeksiyonunu önle: tek satırlık alanlarda satır sonu olmasın.
$ad = str_replace(["\r", "\n"], ' ', $ad);
$iletisim = str_replace(["\r", "\n"], ' ', $iletisim);

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

$ok = @mail($ALICI, $konu, $govde, implode("\r\n", $basliklar), '-f' . $GONDEREN);
geri($ok ? 'ok' : 'hata');
