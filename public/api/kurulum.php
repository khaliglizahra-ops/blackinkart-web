<?php
/**
 * Panel kurulumu ve kullanıcı yönetimi — /api/kurulum
 *
 * İlk açılışta: yönetici kullanıcı adı, şifre ve GitHub erişim anahtarı sorar,
 * bunları public_html dışındaki bia-panel/config.php dosyasına yazar.
 * Kurulumdan sonra: mevcut bir kullanıcının adı ve şifresiyle yeni kullanıcı
 * eklemek, şifre değiştirmek, kullanıcı silmek veya GitHub anahtarını
 * yenilemek için kullanılır.
 *
 * index.php tarafından çağrılır ($DATA_DIR, $CONFIG_FILE, REPO oradan gelir).
 */

declare(strict_types=1);

if (!isset($CONFIG_FILE)) {
    http_response_code(404);
    exit;
}

header('Content-Type: text/html; charset=utf-8');
header('X-Frame-Options: DENY');

function h($s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

function save_config(string $dir, string $file, array $cfg): bool
{
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) {
        return false;
    }
    @file_put_contents($dir . '/.htaccess', "Require all denied\n");
    $php = "<?php\n// Black Ink Art panel ayarları — elle düzenlemeyin, /api/kurulum kullanın.\nreturn " . var_export($cfg, true) . ";\n";
    $tmp = $file . '.tmp';
    if (@file_put_contents($tmp, $php, LOCK_EX) === false) {
        return false;
    }
    @chmod($tmp, 0600);
    return @rename($tmp, $file);
}

/** GitHub anahtarının bu depoya yazma izni var mı? */
function check_github_token(string $token): string
{
    $ch = curl_init('https://api.github.com/repos/' . REPO);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Accept: application/vnd.github+json',
            'User-Agent: blackinkart-panel',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $out = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if ($out === false) {
        return 'GitHub\'a ulaşılamadı.';
    }
    if ($status !== 200) {
        return 'GitHub anahtarı geçersiz ya da bu depoya erişimi yok (HTTP ' . $status . ').';
    }
    $j = json_decode($out, true);
    if (empty($j['permissions']['push'])) {
        return 'GitHub anahtarının bu depoya yazma izni yok. "Contents: Read and write" izni verin.';
    }
    return '';
}

function valid_username(string $u): bool
{
    return (bool) preg_match('/^[a-z0-9._-]{3,32}$/', $u);
}

$cfg = load_config($CONFIG_FILE);
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $p = fn($k) => trim((string) ($_POST[$k] ?? ''));

    if (!$cfg) {
        // ---- İlk kurulum
        $user = strtolower($p('kullanici'));
        $pass = (string) ($_POST['sifre'] ?? '');
        $pass2 = (string) ($_POST['sifre2'] ?? '');
        $token = $p('github');
        if (!valid_username($user)) {
            $err = 'Kullanıcı adı 3-32 karakter olmalı; yalnızca küçük harf, rakam, nokta, tire ve alt çizgi.';
        } elseif (strlen($pass) < 10) {
            $err = 'Şifre en az 10 karakter olmalı.';
        } elseif ($pass !== $pass2) {
            $err = 'Şifreler aynı değil.';
        } elseif (($e = check_github_token($token)) !== '') {
            $err = $e;
        } else {
            $new = [
                'secret' => bin2hex(random_bytes(32)),
                'github_token' => $token,
                'users' => [
                    $user => [
                        'hash' => password_hash($pass, PASSWORD_DEFAULT),
                        'name' => $p('adsoyad') !== '' ? $p('adsoyad') : $user,
                        'email' => $user . '@blackinkart.com.tr',
                        'v' => 1,
                    ],
                ],
            ];
            if (save_config($DATA_DIR, $CONFIG_FILE, $new)) {
                $cfg = $new;
                $msg = 'Kurulum tamamlandı. Artık /admin adresinden "' . $user . '" kullanıcı adı ve şifrenizle giriş yapabilirsiniz.';
            } else {
                $err = 'Ayar dosyası yazılamadı (' . $DATA_DIR . '). Klasör izinlerini kontrol edin.';
            }
        }
    } else {
        // ---- Yönetim: önce mevcut bir kullanıcıyla doğrula
        $adminName = strtolower($p('yonetici'));
        $adminPass = (string) ($_POST['yonetici_sifre'] ?? '');
        if (too_many_fails($DATA_DIR)) {
            $err = 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.';
        } elseif (!isset($cfg['users'][$adminName]) || !password_verify($adminPass, $cfg['users'][$adminName]['hash'])) {
            record_fail($DATA_DIR);
            $err = 'Yönetici kullanıcı adı veya şifresi hatalı.';
        } else {
            $action = $p('islem');
            $target = strtolower($p('kullanici'));
            if ($action === 'kaydet') {
                $pass = (string) ($_POST['sifre'] ?? '');
                if (!valid_username($target)) {
                    $err = 'Kullanıcı adı 3-32 karakter olmalı; yalnızca küçük harf, rakam, nokta, tire ve alt çizgi.';
                } elseif (strlen($pass) < 10) {
                    $err = 'Şifre en az 10 karakter olmalı.';
                } elseif ($pass !== (string) ($_POST['sifre2'] ?? '')) {
                    $err = 'Şifreler aynı değil.';
                } else {
                    $old = $cfg['users'][$target] ?? null;
                    $cfg['users'][$target] = [
                        'hash' => password_hash($pass, PASSWORD_DEFAULT),
                        'name' => $p('adsoyad') !== '' ? $p('adsoyad') : ($old['name'] ?? $target),
                        'email' => $target . '@blackinkart.com.tr',
                        // Şifre değişince eski oturumlar kapanır.
                        'v' => ($old['v'] ?? 0) + 1,
                    ];
                    $msg = $old ? '"' . $target . '" kullanıcısının şifresi değiştirildi.' : '"' . $target . '" kullanıcısı eklendi.';
                }
            } elseif ($action === 'sil') {
                if (!isset($cfg['users'][$target])) {
                    $err = 'Böyle bir kullanıcı yok.';
                } elseif (count($cfg['users']) === 1) {
                    $err = 'Son kullanıcı silinemez.';
                } else {
                    unset($cfg['users'][$target]);
                    $msg = '"' . $target . '" kullanıcısı silindi.';
                }
            } elseif ($action === 'github') {
                $token = $p('github');
                if (($e = check_github_token($token)) !== '') {
                    $err = $e;
                } else {
                    $cfg['github_token'] = $token;
                    $msg = 'GitHub anahtarı güncellendi.';
                }
            } else {
                $err = 'Bir işlem seçin.';
            }
            if ($err === '' && !save_config($DATA_DIR, $CONFIG_FILE, $cfg)) {
                $err = 'Ayar dosyası yazılamadı.';
                $msg = '';
            }
        }
    }
}
?>
<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Panel Kurulumu — Black Ink Art</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; font: 16px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; background: #0f0e0c; color: #ece6da; }
  main { max-width: 520px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 1.5rem; margin: 0 0 4px; }
  h2 { font-size: 1.1rem; margin: 28px 0 8px; }
  p.lead { color: #b3aa9b; margin: 0 0 24px; }
  form { background: #1a1815; border: 1px solid #2c2822; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
  label { display: block; margin: 0 0 14px; font-size: .92rem; color: #cfc6b6; }
  input, select { display: block; width: 100%; box-sizing: border-box; margin-top: 6px; padding: 10px 12px; border-radius: 6px; border: 1px solid #3a352d; background: #0f0e0c; color: #ece6da; font: inherit; }
  button { padding: 11px 18px; border: 0; border-radius: 6px; background: #f2b01e; color: #111; font: inherit; font-weight: 600; cursor: pointer; }
  .ok, .err { padding: 12px 14px; border-radius: 8px; margin-bottom: 20px; }
  .ok { background: rgba(58,107,69,.25); border: 1px solid #3a6b45; }
  .err { background: rgba(138,58,58,.25); border: 1px solid #8a3a3a; }
  small { color: #9a9182; display: block; margin-top: 4px; }
  a { color: #f2b01e; }
  hr { border: 0; border-top: 1px solid #2c2822; margin: 16px 0; }
</style>
</head>
<body>
<main>
  <h1>Yönetim paneli</h1>
  <?php if (!$cfg): ?>
    <p class="lead">İlk kurulum. Panele girecek kullanıcıyı ve sitenin GitHub deposuna yazmak için kullanılacak anahtarı girin. Bu bilgiler yalnızca sunucuda saklanır.</p>
  <?php else: ?>
    <p class="lead">Kurulum tamam. Panele giriş: <a href="/admin/">/admin</a>. Aşağıdan kullanıcı ekleyebilir, şifre değiştirebilir veya GitHub anahtarını yenileyebilirsiniz.</p>
  <?php endif; ?>

  <?php if ($msg): ?><div class="ok"><?= h($msg) ?></div><?php endif; ?>
  <?php if ($err): ?><div class="err"><?= h($err) ?></div><?php endif; ?>

  <?php if (!$cfg): ?>
    <form method="post" autocomplete="off">
      <label>Kullanıcı adı
        <input name="kullanici" required pattern="[a-z0-9._\-]{3,32}" value="<?= h($_POST['kullanici'] ?? '') ?>">
        <small>Küçük harf, rakam, nokta, tire. Örn: huseyin</small>
      </label>
      <label>Ad soyad <small>(değişiklik kayıtlarında görünür, isteğe bağlı)</small>
        <input name="adsoyad" value="<?= h($_POST['adsoyad'] ?? '') ?>">
      </label>
      <label>Şifre
        <input type="password" name="sifre" required minlength="10" autocomplete="new-password">
        <small>En az 10 karakter.</small>
      </label>
      <label>Şifre (tekrar)
        <input type="password" name="sifre2" required minlength="10" autocomplete="new-password">
      </label>
      <label>GitHub erişim anahtarı
        <input type="password" name="github" required autocomplete="off">
        <small>GitHub → Settings → Developer settings → Fine-grained tokens → yalnızca <b><?= h(REPO) ?></b> deposu, izin: <b>Contents: Read and write</b>.</small>
      </label>
      <button type="submit">Kurulumu tamamla</button>
    </form>
  <?php else: ?>
    <form method="post" autocomplete="off">
      <h2 style="margin-top:0">Kullanıcı ekle / şifre değiştir</h2>
      <input type="hidden" name="islem" value="kaydet">
      <label>Kullanıcı adı
        <input name="kullanici" required pattern="[a-z0-9._\-]{3,32}">
      </label>
      <label>Ad soyad <small>(isteğe bağlı)</small><input name="adsoyad"></label>
      <label>Yeni şifre<input type="password" name="sifre" required minlength="10" autocomplete="new-password"></label>
      <label>Yeni şifre (tekrar)<input type="password" name="sifre2" required minlength="10" autocomplete="new-password"></label>
      <hr>
      <label>Onay için sizin kullanıcı adınız<input name="yonetici" required></label>
      <label>Sizin şifreniz<input type="password" name="yonetici_sifre" required autocomplete="current-password"></label>
      <button type="submit">Kaydet</button>
    </form>

    <form method="post" autocomplete="off">
      <h2 style="margin-top:0">Kullanıcı sil</h2>
      <input type="hidden" name="islem" value="sil">
      <label>Silinecek kullanıcı
        <input name="kullanici" required pattern="[a-z0-9._\-]{3,32}">
      </label>
      <label>Onay için sizin kullanıcı adınız<input name="yonetici" required></label>
      <label>Sizin şifreniz<input type="password" name="yonetici_sifre" required autocomplete="current-password"></label>
      <button type="submit">Sil</button>
    </form>

    <form method="post" autocomplete="off">
      <h2 style="margin-top:0">GitHub anahtarını yenile</h2>
      <input type="hidden" name="islem" value="github">
      <label>Yeni GitHub erişim anahtarı<input type="password" name="github" required></label>
      <label>Onay için sizin kullanıcı adınız<input name="yonetici" required></label>
      <label>Sizin şifreniz<input type="password" name="yonetici_sifre" required autocomplete="current-password"></label>
      <button type="submit">Güncelle</button>
    </form>
  <?php endif; ?>
</main>
</body>
</html>
