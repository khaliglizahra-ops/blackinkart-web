/**
 * Çerez onayı — saf mantık (DOM'a dokunmaz, bu yüzden Node'da test edilebiliyor).
 *
 * Tercih tarayıcıda (localStorage) tutulur; sunucuya gönderilmez. Kayıt
 * sürümlü ve süreli: kategori listesi değişirse (CONSENT_VERSION artarsa) ya
 * da bir yıl geçerse tercih geçersiz sayılır ve ziyaretçiye yeniden sorulur.
 */

export const CONSENT_KEY = 'bia_consent';
export const CONSENT_VERSION = 1;
/** Bir yıl: KVKK/GDPR uygulamalarında onayın periyodik olarak yenilenmesi beklenir. */
export const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/** `necessary` her zaman açık; geri kalanı ziyaretçinin kararı. */
export const CATEGORIES = ['necessary', 'analytics', 'marketing', 'functional'];

/**
 * @typedef {{ v: number, ts: number, necessary: true, analytics: boolean, marketing: boolean, functional: boolean }} Consent
 */

/** Hiçbir şey seçilmemişken geçerli olan hâl: yalnızca zorunlu. */
export function rejectAll(now = Date.now()) {
  return { v: CONSENT_VERSION, ts: now, necessary: true, analytics: false, marketing: false, functional: false };
}

export function acceptAll(now = Date.now()) {
  return { v: CONSENT_VERSION, ts: now, necessary: true, analytics: true, marketing: true, functional: true };
}

/** Kullanıcının tek tek seçtiği kategorilerden bir kayıt üretir; `necessary` zorla açık. */
export function fromChoices(choices, now = Date.now()) {
  return {
    v: CONSENT_VERSION,
    ts: now,
    necessary: true,
    analytics: choices?.analytics === true,
    marketing: choices?.marketing === true,
    functional: choices?.functional === true,
  };
}

/**
 * Saklanan değeri doğrular. Bozuk, eski sürüm ya da süresi dolmuş kayıtta
 * `null` döner — çağıran taraf bunu "henüz karar verilmedi" sayıp sorar.
 */
export function normalize(raw, now = Date.now()) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.v !== CONSENT_VERSION) return null;
  if (typeof raw.ts !== 'number' || !Number.isFinite(raw.ts)) return null;
  if (raw.ts > now + 60_000) return null; // saati ileri alınmış/bozuk kayıt
  if (now - raw.ts > CONSENT_MAX_AGE_MS) return null;
  for (const key of ['analytics', 'marketing', 'functional']) {
    if (typeof raw[key] !== 'boolean') return null;
  }
  return { v: raw.v, ts: raw.ts, necessary: true, analytics: raw.analytics, marketing: raw.marketing, functional: raw.functional };
}

export function parse(text, now = Date.now()) {
  if (typeof text !== 'string' || !text) return null;
  try {
    return normalize(JSON.parse(text), now);
  } catch {
    return null;
  }
}

export function serialize(consent) {
  return JSON.stringify(consent);
}

/** `consent` null ise (karar yok) yalnızca zorunlu kategoriye izin var. */
export function isAllowed(consent, category) {
  if (category === 'necessary') return true;
  return Boolean(consent && consent[category] === true);
}

/** İki kayıt aynı tercihleri mi içeriyor (zaman damgası hariç)? */
export function sameChoices(a, b) {
  if (!a || !b) return a === b;
  return ['analytics', 'marketing', 'functional'].every((k) => a[k] === b[k]);
}

/**
 * Depolama erişimi (localStorage) gizli modda/engellenince hata verebilir.
 * Hata durumunda bellekte tutar: sayfa kapanana kadar sorulmaz, sonra tekrar sorulur.
 */
export function createStore(storage) {
  let memory = null;
  return {
    read(now = Date.now()) {
      try {
        const parsed = parse(storage?.getItem(CONSENT_KEY), now);
        if (parsed) return parsed;
        // Geçersiz/süresi dolmuş kaydı temizle ki sürekli bozuk veri dolaşmasın.
        if (storage?.getItem(CONSENT_KEY)) storage.removeItem(CONSENT_KEY);
      } catch {
        /* depolama kapalı */
      }
      return memory && normalize(memory, now);
    },
    write(consent) {
      memory = consent;
      try {
        storage?.setItem(CONSENT_KEY, serialize(consent));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      memory = null;
      try {
        storage?.removeItem(CONSENT_KEY);
      } catch {
        /* yok say */
      }
    },
  };
}
