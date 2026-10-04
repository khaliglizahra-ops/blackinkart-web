import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_KEY,
  CONSENT_MAX_AGE_MS,
  CONSENT_VERSION,
  acceptAll,
  createStore,
  fromChoices,
  isAllowed,
  normalize,
  parse,
  rejectAll,
  sameChoices,
  serialize,
} from '../src/lib/consent.js';

const NOW = 1_800_000_000_000;

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => void (data[k] = String(v)),
    removeItem: (k) => void delete data[k],
  };
}

test('reddet: yalnızca zorunlu kategori açık', () => {
  const c = rejectAll(NOW);
  assert.equal(c.necessary, true);
  assert.deepEqual([c.analytics, c.marketing, c.functional], [false, false, false]);
});

test('hepsini kabul et: tüm kategoriler açık', () => {
  const c = acceptAll(NOW);
  assert.deepEqual([c.analytics, c.marketing, c.functional], [true, true, true]);
});

test('seçimlerden kayıt: zorunlu her zaman açık, belirsiz değer reddedilmiş sayılır', () => {
  const c = fromChoices({ analytics: true, marketing: 'yes', necessary: false }, NOW);
  assert.equal(c.necessary, true);
  assert.equal(c.analytics, true);
  assert.equal(c.marketing, false); // yalnızca gerçek `true` kabul edilir
  assert.equal(c.functional, false);
  assert.equal(fromChoices(undefined, NOW).analytics, false);
});

test('karar yokken yalnızca zorunlu kategoriye izin var', () => {
  assert.equal(isAllowed(null, 'necessary'), true);
  for (const k of ['analytics', 'marketing', 'functional']) assert.equal(isAllowed(null, k), false);
  assert.equal(isAllowed(acceptAll(NOW), 'analytics'), true);
  assert.equal(isAllowed(rejectAll(NOW), 'analytics'), false);
});

test('bozuk, eski sürüm, süresi dolmuş ve gelecekteki kayıtlar geçersiz', () => {
  assert.equal(parse('{bozuk json', NOW), null);
  assert.equal(parse('', NOW), null);
  assert.equal(parse(null, NOW), null);
  assert.equal(normalize({ ...acceptAll(NOW), v: CONSENT_VERSION + 1 }, NOW), null);
  assert.equal(normalize({ ...acceptAll(NOW - CONSENT_MAX_AGE_MS - 1) }, NOW), null);
  assert.equal(normalize({ ...acceptAll(NOW + 3_600_000) }, NOW), null);
  assert.equal(normalize({ ...acceptAll(NOW), analytics: 'true' }, NOW), null);
});

test('geçerli kayıt serileştirilip geri okunur', () => {
  const c = fromChoices({ analytics: true }, NOW);
  assert.deepEqual(parse(serialize(c), NOW + 1000), c);
});

test('sameChoices zaman damgasını yok sayar', () => {
  assert.equal(sameChoices(acceptAll(1), acceptAll(2)), true);
  assert.equal(sameChoices(acceptAll(1), rejectAll(1)), false);
  assert.equal(sameChoices(null, null), true);
  assert.equal(sameChoices(null, rejectAll(1)), false);
});

test('depo: yaz → oku → temizle', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  assert.equal(store.read(NOW), null);
  store.write(acceptAll(NOW));
  assert.equal(store.read(NOW).analytics, true);
  assert.ok(storage.data[CONSENT_KEY]);
  store.clear();
  assert.equal(store.read(NOW), null);
});

test('depo: süresi dolmuş kayıt temizlenir ve yeniden sorulur', () => {
  const old = acceptAll(NOW - CONSENT_MAX_AGE_MS - 5);
  const storage = memoryStorage({ [CONSENT_KEY]: serialize(old) });
  const store = createStore(storage);
  assert.equal(store.read(NOW), null);
  assert.equal(CONSENT_KEY in storage.data, false);
});

test('depo: localStorage hata verirse bellekte tutar, çökmez', () => {
  const broken = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('QuotaExceeded'); },
    removeItem() { throw new Error('SecurityError'); },
  };
  const store = createStore(broken);
  assert.equal(store.write(rejectAll(NOW)), false);
  assert.equal(store.read(NOW).analytics, false); // bellekten
  assert.doesNotThrow(() => store.clear());
});

test('depo yok (undefined): çökmez', () => {
  const store = createStore(undefined);
  assert.equal(store.read(NOW), null);
  store.write(acceptAll(NOW));
  assert.equal(store.read(NOW).analytics, true);
});
