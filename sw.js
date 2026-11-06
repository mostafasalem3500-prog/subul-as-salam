// Service Worker — يعمل الموقع دون اتصال للصفحات التي فُتحت من قبل
const V = 'subul-v3';
const SHELL = ['./', 'index.html', 'assets/css/app.css', 'assets/img/logo.svg', 'icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname.endsWith('supabase.co')) return;           // بيانات الحساب لا تُخزَّن
  if (/\.(mp3|mp4|pdf)$/i.test(u.pathname)) return;          // الملفات الكبيرة من مصدرها مباشرة
  // شبكة أولًا ثم المخزّن (لتبقى المصادر محدَّثة)
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok && (u.origin === location.origin || /quranenc|hadeethenc|islamhouse|fonts\.g|jsdelivr/.test(u.hostname))) {
      const copy = r.clone(); caches.open(V).then((c) => c.put(e.request, copy));
    }
    return r;
  }).catch(() => caches.match(e.request).then((m) => m || caches.match('index.html'))));
});
