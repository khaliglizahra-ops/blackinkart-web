// Kendi ziyaretçi sayacımız: çerezsiz, tarayıcıda hiçbir şey saklamaz.
// Her sayfa görüntülemesinde sunucuya (/api/visit) adres, geldiği sitenin adı ve ekran
// genişliği gider; IP adresi sunucuda da diske yazılmaz (bkz. public/api/visits.php).
// ClientRouter sayfa geçişlerinde tam yükleme olmadığı için astro:page-load dinleniyor.

let lastHref = '';

function send() {
  const href = location.pathname + location.search;
  if (href === lastHref) return;
  lastHref = href;
  // Panel, API ve geliştirme sunucusu sayılmaz.
  if (/^\/(admin|api)(\/|$)/.test(location.pathname)) return;
  if (/^(localhost|127\.|\[::1\])/.test(location.hostname)) return;

  let refHost = '';
  try {
    if (document.referrer) refHost = new URL(document.referrer).hostname;
  } catch {
    refHost = '';
  }
  const body = JSON.stringify({ p: location.pathname, r: refHost, w: window.innerWidth });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon('/api/visit', new Blob([body], { type: 'text/plain' }))) return;
  } catch {
    // sendBeacon yoksa aşağıdaki yedeğe düşer
  }
  fetch('/api/visit', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
}

document.addEventListener('astro:page-load', send);
if (document.readyState !== 'loading') send();
