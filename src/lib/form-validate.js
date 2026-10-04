/**
 * İletişim formu doğrulaması — public/iletisim.php'deki kuralların birebir
 * aynısı (sunucu her zaman son sözü söyler; buradaki denetim yalnızca
 * ziyaretçiye anında geri bildirim vermek için). DOM'a dokunmaz, Node'da
 * test edilebilir. Kuralı değiştirirken PHP tarafını da değiştirin.
 */

export const LIMITS = {
  nameMin: 2,
  nameMax: 120,
  contactMax: 160,
  messageMin: 10,
  messageMax: 5000,
};

/** Karakter sayısı (PHP mb_strlen ile aynı: kod noktası, UTF-16 birimi değil). */
export function length(value) {
  return [...String(value ?? '')].length;
}

/** Telefon numarası ya da e-posta: tek alan ikisini de kabul ediyor. */
export function isValidContact(value) {
  const v = String(value ?? '').trim();
  if (v.includes('@')) {
    // Basit ve kasıtlı olarak gevşek: son söz sunucuda (FILTER_VALIDATE_EMAIL).
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }
  if (!/^\+?[0-9 ().-]{10,25}$/.test(v)) return false;
  const digits = v.replace(/\D/g, '').length;
  return digits >= 10 && digits <= 15;
}

/**
 * @param {{name?: string, contact?: string, message?: string}} values
 * @returns {{ ok: boolean, errors: { name?: string, contact?: string, message?: string } }}
 *   Hata değerleri bir mesaj anahtarıdır; metni çağıran taraf (dile göre) seçer.
 */
export function validateContactForm(values) {
  const name = String(values?.name ?? '').trim();
  const contact = String(values?.contact ?? '').trim();
  const message = String(values?.message ?? '').trim();
  const errors = {};

  if (!name) errors.name = 'required';
  else if (length(name) < LIMITS.nameMin) errors.name = 'nameShort';
  else if (length(name) > LIMITS.nameMax) errors.name = 'nameLong';

  if (!contact) errors.contact = 'required';
  else if (length(contact) > LIMITS.contactMax || !isValidContact(contact)) errors.contact = 'contactInvalid';

  if (!message) errors.message = 'required';
  else if (length(message) < LIMITS.messageMin) errors.message = 'messageShort';
  else if (length(message) > LIMITS.messageMax) errors.message = 'messageLong';

  return { ok: Object.keys(errors).length === 0, errors };
}

/** Sunucu yanıtını (HTTP durumu + JSON) bir sonuç koduna çevirir. */
export function classifyResponse(status, data) {
  if (status >= 200 && status < 300 && data && data.ok === true) return 'ok';
  if (status === 429 || data?.code === 'rate') return 'rate';
  if (status === 422 || data?.code === 'invalid') return 'invalid';
  return 'error';
}
