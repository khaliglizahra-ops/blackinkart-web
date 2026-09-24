<?php
/**
 * Black Ink Art — yönetim paneli sunucusu (Hostinger, PHP).
 *
 * Netlify Identity + Git Gateway'in yerine geçer. Decap CMS'in "git-gateway"
 * arka ucu bu adreslerle konuşur:
 *
 *   /api/identity/token   kullanıcı adı + şifre ile giriş (GoTrue uyumlu)
 *   /api/identity/user    giriş yapan kullanıcının bilgisi
 *   /api/gateway/settings panele "GitHub kullanılıyor" bilgisini verir
 *   /api/gateway/status   panelin durum kontrolü
 *   /api/gateway/github/* GitHub API'sine vekil: yalnızca bu deponun
 *                         /repos/OWNER/REPO/* adresleri, sunucudaki anahtarla
 *   /api/kurulum          ilk kurulum: kullanıcı adı, şifre, GitHub anahtarı
 *
 * Şifreler ve GitHub anahtarı depoda DEĞİL, sunucuda public_html'in bir üst
 * klasöründeki bia-panel/config.php dosyasında durur (web'den erişilemez).
 */

declare(strict_types=1);

const REPO = 'khaliglizahra-ops/blackinkart-web';
const ACCESS_TTL = 3600;          // giriş anahtarı: 1 saat (panel kendisi yeniler)
const REFRESH_TTL = 30 * 86400;   // "beni hatırla": 30 gün
const MAX_FAILS = 8;              // 15 dakikada aynı IP'den en fazla hatalı giriş

$DATA_DIR = dirname(__DIR__, 2) . '/bia-panel';
$CONFIG_FILE = $DATA_DIR . '/config.php';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// ---------------------------------------------------------------- yardımcılar

function json_out(int $status, $body): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function b64url(string $s): string
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function b64url_dec(string $s): string
{
    return (string) base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4));
}

function jwt_sign(array $claims, string $secret): string
{
    $h = b64url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $p = b64url(json_encode($claims, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    return "$h.$p." . b64url(hash_hmac('sha256', "$h.$p", $secret, true));
}

function jwt_verify(string $token, string $secret, string $typ): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$h, $p, $s] = $parts;
    if (!hash_equals(b64url(hash_hmac('sha256', "$h.$p", $secret, true)), $s)) {
        return null;
    }
    $c = json_decode(b64url_dec($p), true);
    if (!is_array($c) || ($c['typ'] ?? '') !== $typ || ($c['exp'] ?? 0) < time()) {
        return null;
    }
    return $c;
}

function load_config(string $file): ?array
{
    if (!is_file($file)) {
        return null;
    }
    $c = include $file;
    return is_array($c) ? $c : null;
}

function bearer(): string
{
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower($k) === 'authorization') {
                $h = $v;
            }
        }
    }
    return preg_match('/^Bearer\s+(\S+)$/i', $h, $m) ? $m[1] : '';
}

function client_ip(): string
{
    return preg_replace('/[^0-9a-fA-F:.]/', '', $_SERVER['REMOTE_ADDR'] ?? 'x');
}

function fails_file(string $dir): string
{
    return $dir . '/fails-' . md5(client_ip()) . '.json';
}

function too_many_fails(string $dir): bool
{
    $f = fails_file($dir);
    $list = is_file($f) ? (json_decode((string) file_get_contents($f), true) ?: []) : [];
    $list = array_filter($list, fn($t) => $t > time() - 900);
    return count($list) >= MAX_FAILS;
}

function record_fail(string $dir): void
{
    $f = fails_file($dir);
    $list = is_file($f) ? (json_decode((string) file_get_contents($f), true) ?: []) : [];
    $list = array_values(array_filter($list, fn($t) => $t > time() - 900));
    $list[] = time();
    @file_put_contents($f, json_encode($list), LOCK_EX);
}

function user_payload(array $cfg, string $username): array
{
    $u = $cfg['users'][$username];
    return [
        'id' => md5($username),
        'aud' => '',
        'role' => '',
        'email' => $u['email'],
        'confirmed_at' => '2026-01-01T00:00:00Z',
        'app_metadata' => ['provider' => 'email', 'roles' => ['admin']],
        'user_metadata' => ['full_name' => $u['name']],
        'created_at' => '2026-01-01T00:00:00Z',
        'updated_at' => '2026-01-01T00:00:00Z',
    ];
}

function issue_tokens(array $cfg, string $username): void
{
    $now = time();
    $u = $cfg['users'][$username];
    $access = jwt_sign([
        'typ' => 'access',
        'sub' => $username,
        'email' => $u['email'],
        'app_metadata' => ['roles' => ['admin']],
        'user_metadata' => ['full_name' => $u['name']],
        'iat' => $now,
        'exp' => $now + ACCESS_TTL,
        'v' => $u['v'],
    ], $cfg['secret']);
    $refresh = jwt_sign([
        'typ' => 'refresh',
        'sub' => $username,
        'iat' => $now,
        'exp' => $now + REFRESH_TTL,
        'v' => $u['v'],
        'n' => bin2hex(random_bytes(8)),
    ], $cfg['secret']);
    json_out(200, [
        'access_token' => $access,
        'token_type' => 'bearer',
        'expires_in' => ACCESS_TTL,
        'refresh_token' => $refresh,
    ]);
}

/** Geçerli giriş anahtarını doğrular; kullanıcı silinmiş/şifresi değişmişse reddeder. */
function require_user(array $cfg): string
{
    $c = jwt_verify(bearer(), $cfg['secret'], 'access');
    $name = $c['sub'] ?? '';
    if (!$c || !isset($cfg['users'][$name]) || ($cfg['users'][$name]['v'] ?? 0) !== ($c['v'] ?? -1)) {
        json_out(401, ['code' => 401, 'msg' => 'Oturum geçersiz, lütfen yeniden giriş yapın.']);
    }
    return $name;
}

// ---------------------------------------------------------------- yönlendirme

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$route = preg_replace('#^.*?/api/?#', '', $path);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($route === 'kurulum' || $route === 'kurulum/') {
    require __DIR__ . '/kurulum.php';
    exit;
}

$cfg = load_config($CONFIG_FILE);
if (!$cfg) {
    json_out(503, ['code' => 503, 'msg' => 'Panel henüz kurulmadı: /api/kurulum adresini açın.', 'error_description' => 'Panel henüz kurulmadı: /api/kurulum adresini açın.']);
}

// ----- Kimlik (GoTrue uyumlu)

if ($route === 'identity/settings') {
    json_out(200, ['external' => new stdClass(), 'disable_signup' => true, 'autoconfirm' => false]);
}

if ($route === 'identity/token' && $method === 'POST') {
    $grant = $_POST['grant_type'] ?? '';

    if ($grant === 'password') {
        if (too_many_fails($DATA_DIR)) {
            json_out(429, ['error' => 'rate_limited', 'error_description' => 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.']);
        }
        $name = strtolower(trim((string) ($_POST['username'] ?? '')));
        $pass = (string) ($_POST['password'] ?? '');
        $user = $cfg['users'][$name] ?? null;
        // Kullanıcı yoksa da aynı işi yap: yanıt süresi kullanıcı adını ele vermesin.
        $ok = $user ? password_verify($pass, $user['hash']) : (password_hash($pass, PASSWORD_DEFAULT) && false);
        if (!$user || !$ok) {
            record_fail($DATA_DIR);
            json_out(400, ['error' => 'invalid_grant', 'error_description' => 'Kullanıcı adı veya şifre hatalı.']);
        }
        issue_tokens($cfg, $name);
    }

    if ($grant === 'refresh_token') {
        $c = jwt_verify((string) ($_POST['refresh_token'] ?? ''), $cfg['secret'], 'refresh');
        $name = $c['sub'] ?? '';
        if (!$c || !isset($cfg['users'][$name]) || $cfg['users'][$name]['v'] !== ($c['v'] ?? -1)) {
            json_out(400, ['error' => 'invalid_grant', 'error_description' => 'Oturum süresi doldu, lütfen yeniden giriş yapın.']);
        }
        issue_tokens($cfg, $name);
    }

    json_out(400, ['error' => 'unsupported_grant_type', 'error_description' => 'Desteklenmeyen istek.']);
}

if ($route === 'identity/user') {
    json_out(200, user_payload($cfg, require_user($cfg)));
}

if ($route === 'identity/logout') {
    http_response_code(204);
    exit;
}

// ----- Git Gateway

if ($route === 'gateway/status') {
    json_out(200, ['components' => [['name' => 'Git Gateway', 'status' => 'operational']]]);
}

if ($route === 'gateway/settings') {
    require_user($cfg);
    json_out(200, ['github_enabled' => true, 'gitlab_enabled' => false, 'bitbucket_enabled' => false, 'roles' => null]);
}

if (strpos($route, 'gateway/github/') === 0 || $route === 'gateway/github') {
    require_user($cfg);

    $sub = substr($route, strlen('gateway/github'));
    $sub = ltrim($sub, '/');
    if ($sub !== '' && (!preg_match('#^[A-Za-z0-9._~%/@:+,=-]+$#', $sub) || preg_match('#(^|/)\.\.(/|$)#', rawurldecode($sub)))) {
        json_out(400, ['message' => 'Geçersiz yol']);
    }
    if (!in_array($method, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        json_out(405, ['message' => 'İzin verilmeyen yöntem']);
    }

    $query = $_GET;
    unset($query['r']);
    $url = ($cfg['github_api'] ?? 'https://api.github.com') . '/repos/' . REPO . ($sub !== '' ? '/' . $sub : '');
    if ($query) {
        $url .= '?' . http_build_query($query);
    }

    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    if ($accept === '' || $accept === '*/*') {
        $accept = 'application/vnd.github+json';
    }
    $headers = [
        'Authorization: Bearer ' . $cfg['github_token'],
        'Accept: ' . $accept,
        'User-Agent: blackinkart-panel',
        'X-GitHub-Api-Version: 2022-11-28',
    ];
    $body = null;
    if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        $body = file_get_contents('php://input');
        $headers[] = 'Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'application/json');
    }

    $respHeaders = [];
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$respHeaders) {
            $p = strpos($line, ':');
            if ($p !== false) {
                $respHeaders[strtolower(trim(substr($line, 0, $p)))] = trim(substr($line, $p + 1));
            }
            return strlen($line);
        },
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $out = curl_exec($ch);
    if ($out === false) {
        json_out(502, ['message' => 'GitHub\'a ulaşılamadı: ' . curl_error($ch)]);
    }
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    http_response_code($status);
    if (isset($respHeaders['content-type'])) {
        header('Content-Type: ' . $respHeaders['content-type']);
    }
    if (isset($respHeaders['link'])) {
        // Sayfalama bağlantıları GitHub'ı değil bu vekili göstersin.
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https' ? 'https' : 'http';
        $base = $scheme . '://' . $_SERVER['HTTP_HOST'] . preg_replace('#/api/.*$#', '/api/gateway/github', $path);
        header('Link: ' . preg_replace('#https://api\.github\.com/(repos/[^/]+/[^/?>]+|repositories/\d+)#', $base, $respHeaders['link']));
    }
    echo $out;
    exit;
}

json_out(404, ['code' => 404, 'msg' => 'Bulunamadı']);
