/**
 * Analitik yapılandırması — kimlikler koda değil ortam değişkenine yazılır
 * (bkz. .env.example). İkisi de boşsa site hiçbir analitik kodu yüklemez ve
 * çerez onayında "Analitik" seçeneği "şu an kullanılmıyor" diye görünür.
 *
 * Kimlikler gizli değil (sayfa kaynağında zaten görünür) ama sahte/yanlış bir
 * değerin sessizce yayına gitmemesi için biçim doğrulanıyor.
 */
const GA_PATTERN = /^G-[A-Z0-9]{6,14}$/;
const GTM_PATTERN = /^GTM-[A-Z0-9]{4,10}$/;

function readEnv(name: string): string {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  const fromVite = (import.meta.env as Record<string, string | undefined>)?.[name];
  return String(fromProcess ?? fromVite ?? '').trim();
}

function validated(name: string, pattern: RegExp): string {
  const value = readEnv(name);
  if (!value) return '';
  if (!pattern.test(value)) {
    console.warn(`[analytics] ${name} geçerli bir kimlik biçiminde değil, yok sayıldı: "${value}"`);
    return '';
  }
  return value;
}

// Sitenin Google Analytics mülkü (canlı sayfalarda bulunan kimlik). Ortam değişkeni verilmezse bu kimlik
// kullanılır ki yayın bir değişkene bağlı kalıp analitiği sessizce kaybetmesin. Kapatmak için
// GA_MEASUREMENT_ID=off yazın. Yükleme yine yalnızca çerez onayından sonra olur.
const DEFAULT_GA_ID = 'G-836P8JNPN3';
const rawGa = readEnv('GA_MEASUREMENT_ID');
const gaId = rawGa.toLowerCase() === 'off' ? '' : rawGa === '' ? DEFAULT_GA_ID : validated('GA_MEASUREMENT_ID', GA_PATTERN);
const gtmId = validated('GTM_ID', GTM_PATTERN);

export const analytics = {
  gaId,
  gtmId,
  /** İkisi de varsa çift sayımı önlemek için yalnızca Tag Manager kullanılır. */
  provider: gtmId ? ('gtm' as const) : gaId ? ('ga4' as const) : null,
  enabled: Boolean(gtmId || gaId),
};
