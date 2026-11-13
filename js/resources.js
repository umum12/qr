// Sumber tunggal daftar resource (dipakai halaman & service worker). Setiap rilis: naikkan APP_VERSION,
// tambahkan file baru ke CORE. Cache otomatis bernama "struk-"+APP_VERSION.
const APP_VERSION='1.8.1';
const CORE=['./','index.html','manifest.json','css/style.css','js/resources.js','js/boot.js','js/app.js','js/ui.js','js/scanner.js','js/layout-engine.js','js/layout.js','js/camera.js','js/extras.js','js/revisi.js','vendor/jspdf.umd.min.js','vendor/jsQR.js','assets/icons/icon-192.png','assets/icons/icon-512.png'];
const CDN_REQUIRED=[];   // resource CDN wajib: jika gagal diunduh, aplikasi tidak dinyatakan siap
const CDN_OPTIONAL=['https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.3.0/files/inter-latin-wght-normal.woff2'];   // opsional: gagal unduh tidak memblokir (font Inter; URL sama dengan @font-face di style.css)
