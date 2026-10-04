import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, classifyResponse, isValidContact, length, validateContactForm } from '../src/lib/form-validate.js';

const good = { name: 'Ayşe Yılmaz', contact: '0555 123 45 67', message: 'Merhaba, randevu almak istiyorum.' };

test('geçerli form hatasız geçer', () => {
  assert.deepEqual(validateContactForm(good), { ok: true, errors: {} });
});

test('boş alanlar "required" döner', () => {
  const r = validateContactForm({});
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors, { name: 'required', contact: 'required', message: 'required' });
});

test('yalnızca boşluktan oluşan değerler boş sayılır', () => {
  assert.equal(validateContactForm({ ...good, name: '   ' }).errors.name, 'required');
});

test('ad ve mesaj uzunluk sınırları', () => {
  assert.equal(validateContactForm({ ...good, name: 'A' }).errors.name, 'nameShort');
  assert.equal(validateContactForm({ ...good, name: 'A'.repeat(LIMITS.nameMax + 1) }).errors.name, 'nameLong');
  assert.equal(validateContactForm({ ...good, message: 'kısa' }).errors.message, 'messageShort');
  assert.equal(validateContactForm({ ...good, message: 'x'.repeat(LIMITS.messageMax + 1) }).errors.message, 'messageLong');
  assert.equal(validateContactForm({ ...good, message: 'x'.repeat(LIMITS.messageMax) }).ok, true);
});

test('telefon ya da e-posta kabul edilir', () => {
  for (const v of ['05551234567', '+90 555 123 45 67', '(0312) 123 45 67', 'ad@ornek.com', 'a.b+c@alan.com.tr']) {
    assert.equal(isValidContact(v), true, v);
  }
});

test('geçersiz iletişim bilgileri reddedilir', () => {
  for (const v of ['', '123', 'abc', 'ad@', '@ornek.com', 'ad@ornek', 'ad @ornek.com', '++905551234567', '1'.repeat(30), 'telefon: 0555 123 45 67']) {
    assert.equal(isValidContact(v), false, JSON.stringify(v));
  }
});

test('uzunluk kod noktası sayar (emoji tek karakter)', () => {
  assert.equal(length('a😀b'), 3);
  assert.equal(length(null), 0);
});

test('sunucu yanıtı sınıflandırması', () => {
  assert.equal(classifyResponse(200, { ok: true }), 'ok');
  assert.equal(classifyResponse(200, { ok: false }), 'error');
  assert.equal(classifyResponse(422, { ok: false, code: 'invalid' }), 'invalid');
  assert.equal(classifyResponse(429, { ok: false, code: 'rate' }), 'rate');
  assert.equal(classifyResponse(502, { ok: false, code: 'mail' }), 'error');
  assert.equal(classifyResponse(500, null), 'error');
  assert.equal(classifyResponse(200, null), 'error'); // gövde çözülemedi → başarılı sayma
});
