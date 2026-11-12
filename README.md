# PWA Dokumentasi Struk & QR Scanner
Static site, tanpa build/Node.js/backend.
## Deploy ke GitHub Pages
1. Ekstrak ZIP, unggah **isi** folder (index.html di root) ke repository GitHub.
2. Settings → Pages → Source: branch `main`, folder `/ (root)`.
3. Buka `https://username.github.io/nama-repo/` di Chrome Android → menu ⋮ → Instal aplikasi.
Semua path relatif, jadi aman untuk subpath repository. Kamera butuh HTTPS (disediakan GitHub Pages).
## Catatan
- Data lokal di IndexedDB; lakukan Backup JSON rutin.
- Library lokal: jsPDF 2.5.2, jsQR 1.4.0 (folder `vendor/`).
- Pembaruan: naikkan `C='struk-v1'` di service-worker.js (IndexedDB tidak tersentuh).
- Lihat `blueprint.md` untuk spesifikasi.
