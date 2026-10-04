import { site } from './site';

/**
 * Yasal metinlerin (Gizlilik Politikası, KVKK, Kullanım Şartları) kullandığı
 * işletme bilgileri. Projede OLMAYAN bilgi uydurulmaz: `null` olan alan
 * sayfada hiç gösterilmez ve `npm run config:check` çıktısında
 * "CONFIG REQUIRED" olarak listelenir.
 *
 * Adres, telefon, e-posta ve çalışma saatleri zaten panelden yönetilen
 * `site.json`'dan geliyor; burada yalnızca ticari/hukuki kimlik alanları var.
 */
export const legal = {
  // CONFIG REQUIRED — işletmenin ticaret unvanı / şahıs işletmesi adı (varsa).
  companyTitle: null as string | null,
  // CONFIG REQUIRED — vergi dairesi ve vergi kimlik numarası.
  taxOffice: null as string | null,
  taxNumber: null as string | null,
  // CONFIG REQUIRED — MERSİS numarası (varsa).
  mersisNo: null as string | null,
  // CONFIG REQUIRED — VERBİS kaydı gerekip gerekmediği ve kayıt bilgisi
  // (veri sorumluları sicili yükümlülüğü işletmeye göre değişir; hukuk
  // danışmanına sorulmalı).
  verbisNote: null as string | null,
  // CONFIG REQUIRED — KEP adresi (varsa).
  kepAddress: null as string | null,

  /** Kişisel veri başvurularının gideceği adres: şimdilik sitenin e-postası. */
  requestEmail: site.email,

  /** Metinlerin son güncelleme tarihi (ISO). Yasal metinde değişiklik yapınca güncelleyin. */
  updatedAt: '2026-10-04',
};

const REQUIRED: [keyof typeof legal, string][] = [
  ['companyTitle', 'Ticaret unvanı / işletme adı'],
  ['taxOffice', 'Vergi dairesi'],
  ['taxNumber', 'Vergi kimlik numarası'],
  ['verbisNote', 'VERBİS kaydı bilgisi (gerekiyorsa)'],
];

/** Henüz girilmemiş yasal alanların listesi — `npm run config:check` kullanır. */
export function missingLegalFields(): string[] {
  return REQUIRED.filter(([key]) => !legal[key]).map(([, label]) => label);
}
