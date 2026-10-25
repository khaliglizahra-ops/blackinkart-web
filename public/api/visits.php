<?php
/**
 * Black Ink Art — kendi ziyaretçi sayacı (çerezsiz, tarayıcıda hiçbir şey saklamaz).
 *
 *   POST /api/visit   sayfa görüntülemesini bildirir (her zaman 204 döner)
 *   GET  /api/stats   panel için özet (yalnızca panele girmiş kullanıcı)
 *
 * Gizlilik: IP adresi ve tarayıcı bilgisi diske YAZILMAZ. "Aynı ziyaretçi" yalnızca
 * gün içinde, her gün yeniden üretilen rastgele bir tuzla alınmış kısa bir özetten
 * anlaşılır; bu özet listesi gece yarısından (Türkiye saati) sonra silinir. Kalıcı
 * olarak yalnızca günlük toplamlar tutulur: görüntüleme, ziyaretçi, sayfa, cihaz
 * türü, geldiği yerin adı ve saat dilimi.
 *
 * Veriler web'den erişilemeyen bia-panel/visits klasöründe durur ve FTP yüklemesi
 * bu klasöre dokunmaz.
 */

declare(strict_types=1);

const VISIT_MAX_BODY = 2048;
const VISIT_RATE_PER_MIN = 60;      // aynı kişiden dakikada en fazla bu kadar görüntüleme
const VISIT_KEEP_DAYS = 800;        // günlük toplamlar bu kadar gün saklanır

function visit_dir(string $dataDir): string
{
    $d = $dataDir . '/visits';
    if (!is_dir($d)) {
        @mkdir($d, 0700, true);
    }
    return $d;
}

function visit_today(): string
{
    return (new DateTime('now', new DateTimeZone('Europe/Istanbul')))->format('Y-m-d');
}

function visit_is_bot(string $ua): bool
{
    if ($ua === '' || strlen($ua) < 12) {
        return true;
    }
    return (bool) preg_match('/bot|crawl|spider|slurp|mediapartners|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|go-http|java\/|httpclient|libwww|scrapy|preview|archiver|validator/i', $ua);
}

/** Gelen adresi güvenli bir yola indirger; sayılmayacak adreslerde null döner. */
function visit_clean_path($p): ?string
{
    if (!is_string($p) || $p === '' || $p[0] !== '/') {
        return null;
    }
    $p = preg_replace('/[?#].*$/', '', $p);
    $p = preg_replace('#//+#', '/', $p);
    if (strlen($p) > 120 || !preg_match('#^/[A-Za-z0-9._~%/+-]*$#', $p)) {
        return null;
    }
    if ($p !== '/') {
        $p = rtrim($p, '/');
    }
    if (preg_match('#^/(admin|api)(/|$)#', $p)) {
        return null;
    }
    return $p;
}

/** Geldiği yeri kısa bir ada çevirir. İç yönlendirme ve boş değer "Doğrudan" sayılır. */
function visit_source(string $refHost, string $ownHost): string
{
    $h = strtolower(preg_replace('/^www\./', '', $refHost));
    if ($h === '' || !preg_match('/^[a-z0-9.-]{3,80}$/', $h)) {
        return 'Doğrudan';
    }
    $own = strtolower(preg_replace('/^www\./', '', $ownHost));
    if ($h === $own) {
        return 'Doğrudan';
    }
    $map = [
        'google.' => 'Google', 'bing.com' => 'Bing', 'yandex.' => 'Yandex', 'duckduckgo.com' => 'DuckDuckGo',
        'instagram.com' => 'Instagram', 'facebook.com' => 'Facebook', 'fb.com' => 'Facebook', 'l.facebook.com' => 'Facebook',
        't.co' => 'X', 'twitter.com' => 'X', 'x.com' => 'X', 'tiktok.com' => 'TikTok', 'youtube.com' => 'YouTube',
        'whatsapp.com' => 'WhatsApp', 'pinterest.' => 'Pinterest', 'piercingland.com.tr' => 'Piercingland',
    ];
    foreach ($map as $needle => $name) {
        if (strpos($h, $needle) !== false) {
            return $name;
        }
    }
    return $h;
}

function visit_device(int $w): string
{
    if ($w > 0 && $w < 768) {
        return 'mobile';
    }
    if ($w > 0 && $w < 1100) {
        return 'tablet';
    }
    return 'desktop';
}

function visit_empty_day(): array
{
    return [
        'views' => 0, 'visitors' => 0, 'pages' => new stdClass(), 'devices' => new stdClass(),
        'sources' => new stdClass(), 'hours' => new stdClass(),
    ];
}

function visit_bump(array &$day, string $key, string $sub, int $by = 1): void
{
    if (!isset($day[$key]) || !is_array($day[$key])) {
        $day[$key] = [];
    }
    if (count($day[$key]) > 400 && !isset($day[$key][$sub])) {
        $sub = 'diğer';
    }
    $day[$key][$sub] = ($day[$key][$sub] ?? 0) + $by;
}

function record_visit(string $dataDir): void
{
    http_response_code(204);

    $host = $_SERVER['HTTP_HOST'] ?? '';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        $oh = (string) parse_url($origin, PHP_URL_HOST);
        $norm = fn(string $s) => strtolower(preg_replace('/^www\./', '', $s));
        if ($norm($oh) !== $norm($host)) {
            return;
        }
    }

    $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
    if (visit_is_bot($ua)) {
        return;
    }

    $raw = (string) file_get_contents('php://input', false, null, 0, VISIT_MAX_BODY);
    $in = json_decode($raw, true);
    if (!is_array($in)) {
        return;
    }
    $path = visit_clean_path($in['p'] ?? null);
    if ($path === null) {
        return;
    }
    $ref = is_string($in['r'] ?? null) ? substr($in['r'], 0, 120) : '';
    $device = visit_device((int) ($in['w'] ?? 0));

    $dir = visit_dir($dataDir);
    $today = visit_today();
    $lock = @fopen($dir . '/.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) {
        return;
    }

    $saltFile = $dir . "/salt-$today.txt";
    $salt = is_file($saltFile) ? (string) file_get_contents($saltFile) : '';
    if ($salt === '') {
        $salt = bin2hex(random_bytes(16));
        @file_put_contents($saltFile, $salt);
        // Önceki günlerin tuzlarını ve ziyaretçi listelerini sil.
        foreach (glob($dir . '/{salt,seen}-*', GLOB_BRACE) ?: [] as $f) {
            if (strpos($f, $today) === false) {
                @unlink($f);
            }
        }
    }

    $ip = preg_replace('/[^0-9a-fA-F:.]/', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
    $vid = substr(hash('sha256', $salt . '|' . $ip . '|' . $ua), 0, 16);

    $seenFile = $dir . "/seen-$today.json";
    $seen = is_file($seenFile) ? (json_decode((string) file_get_contents($seenFile), true) ?: []) : [];
    $minute = (int) floor(time() / 60);
    $entry = $seen[$vid] ?? [$minute, 0];
    if ($entry[0] !== $minute) {
        $entry = [$minute, 0];
    }
    if ($entry[1] >= VISIT_RATE_PER_MIN) {
        flock($lock, LOCK_UN);
        return;
    }
    $isNew = !isset($seen[$vid]);
    $entry[1]++;
    $seen[$vid] = $entry;
    @file_put_contents($seenFile, json_encode($seen));

    $dayFile = $dir . "/$today.json";
    $day = is_file($dayFile) ? (json_decode((string) file_get_contents($dayFile), true) ?: visit_empty_day()) : visit_empty_day();
    $day['views'] = ($day['views'] ?? 0) + 1;
    visit_bump($day, 'pages', $path);
    $hour = (new DateTime('now', new DateTimeZone('Europe/Istanbul')))->format('G');
    visit_bump($day, 'hours', $hour);
    if ($isNew) {
        $day['visitors'] = ($day['visitors'] ?? 0) + 1;
        visit_bump($day, 'devices', $device);
        visit_bump($day, 'sources', visit_source((string) $ref, $host));
    }
    @file_put_contents($dayFile, json_encode($day, JSON_UNESCAPED_UNICODE));

    // Çok eski günlük toplamları ara sıra temizle.
    if (random_int(1, 200) === 1) {
        foreach (glob($dir . '/20??-??-??.json') ?: [] as $f) {
            if (basename($f, '.json') < date('Y-m-d', time() - VISIT_KEEP_DAYS * 86400)) {
                @unlink($f);
            }
        }
    }
    flock($lock, LOCK_UN);
}

/** Son $days günün özeti (bugün dahil). */
function visit_stats(string $dataDir, int $days): array
{
    $days = max(1, min(90, $days));
    $dir = visit_dir($dataDir);
    $tz = new DateTimeZone('Europe/Istanbul');
    $now = new DateTime('now', $tz);

    $series = [];
    $pages = [];
    $devices = [];
    $sources = [];
    $hours = array_fill(0, 24, 0);
    $views = 0;
    $visitors = 0;

    for ($i = $days - 1; $i >= 0; $i--) {
        $d = (clone $now)->modify("-$i day")->format('Y-m-d');
        $f = "$dir/$d.json";
        $day = is_file($f) ? (json_decode((string) file_get_contents($f), true) ?: []) : [];
        $v = (int) ($day['views'] ?? 0);
        $u = (int) ($day['visitors'] ?? 0);
        $series[] = ['date' => $d, 'views' => $v, 'visitors' => $u];
        $views += $v;
        $visitors += $u;
        foreach (($day['pages'] ?? []) as $k => $n) {
            $pages[$k] = ($pages[$k] ?? 0) + (int) $n;
        }
        foreach (($day['devices'] ?? []) as $k => $n) {
            $devices[$k] = ($devices[$k] ?? 0) + (int) $n;
        }
        foreach (($day['sources'] ?? []) as $k => $n) {
            $sources[$k] = ($sources[$k] ?? 0) + (int) $n;
        }
        foreach (($day['hours'] ?? []) as $k => $n) {
            $hours[(int) $k] = ($hours[(int) $k] ?? 0) + (int) $n;
        }
    }
    arsort($pages);
    arsort($sources);
    arsort($devices);

    $last = count($series) - 1;
    return [
        'days' => $days,
        'today' => $series[$last] ?? null,
        'yesterday' => $series[$last - 1] ?? null,
        'totals' => ['views' => $views, 'visitors' => $visitors],
        'series' => $series,
        'pages' => array_slice($pages, 0, 15, true),
        'sources' => array_slice($sources, 0, 10, true),
        'devices' => $devices,
        'hours' => $hours,
        'generatedAt' => $now->format(DATE_ATOM),
    ];
}
