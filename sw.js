/* Service worker — guarda toda la app (incluidas ilustraciones y fotos) para usarla sin internet.
   Cambia VERSION al publicar cambios (y añade a ARCHIVOS cualquier archivo nuevo). */
var VERSION = 'cocina-v2-0';
var ARCHIVOS = [
  './', 'index.html', 'styles.css', 'app.js', 'data/curso.json', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  'img/tecnicas/arroz-proporcion.svg',
  'img/tecnicas/cortes-basicos.svg',
  'img/tecnicas/garra-agarre.svg',
  'img/tecnicas/huevo-punto.svg',
  'img/tecnicas/olla-presion.svg',
  'img/tecnicas/tabla-crudo-cocido.svg',
  'img/tecnicas/temperaturas.svg',
  'img/platos/1-2-verduras-salteadas.webp',
  'img/platos/2-1-huevos-pochados.webp',
  'img/platos/2-2-tortilla-espinaca.webp',
  'img/platos/2-3-arroz-con-pollo.webp',
  'img/platos/3-2-garbanzos-espinaca.webp',
  'img/platos/4-1-sopa-de-pollo.webp',
  'img/platos/4-3-crema-de-zapallo.webp',
  'img/platos/5-1-pechuga-plancha.webp',
  'img/platos/5-2-albondigas.webp',
  'img/platos/6-1-pollo-al-horno.webp',
  'img/platos/6-3-bizcocho-platano.webp',
  'img/platos/7-3-macarrones-gratinados.webp',
  'img/platos/8-1-pescado-limon.webp',
  'img/platos/8-2-ceviche-camaron.webp',
  'img/platos/8-3-pescado-en-coco.webp',
  'img/platos/10-1-pasta-tomate.webp',
  'img/platos/10-2-arroz-chaufa.webp',
  'img/platos/10-3-curry-pollo.webp',
  'img/platos/bonus-tacos.webp'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return; // la app no pide nada a otros sitios (los enlaces de Créditos abren Unsplash en otra pestaña)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok) { var copia = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copia); }); }
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
