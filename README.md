# ⚔️ Land of Cakrawala: UM Maps Navigator (MLBB Edition) 🗺️

Aplikasi peta interaktif khusus kawasan **Universitas Negeri Malang (UM)** yang memadukan akurasi navigasi ala **Google Maps** dengan sensasi dan visual HUD ala game **Mobile Legends: Bang Bang (MLBB)**. Didesain khusus untuk membantu Mahasiswa Baru (Maba) agar tidak tersesat saat mencari gedung kuliah, fasilitas, dan urusan administrasi kampus.

---

## 🌟 Fitur Utama

1. **Akurasi Kampus 1 UM (Jl. Semarang No. 5 Malang)**:
   - Data koordinat presisi untuk **Graha Cakrawala (Graca)**, **Graha Rektorat**, **GKB A19 & A20 (Gedung Kembar)**, **Perpustakaan Pusat C3**, seluruh fakultas (**FT, FMIPA, FEB, FS, FIP, FIS, FIK**), **Masjid Al-Hikmah**, **Danau UM**, **Kantin Halal**, **Stadion Atletik**, hingga seluruh pintu gerbang (Semarang, Surabaya, Veteran).
2. **Layout & HUD Mobile Legends**:
   - **Hero Level Badge**: Menampilkan status Maba, HP bar, Mana/XP bar, semester, dan koin UKT.
   - **Minimap Radar di Pojok Kanan Atas**: Menampilkan preview lane (Top, Mid, Bot) dan blip lokasi real-time dengan radar sweep animation. Mengklik radar akan langsung menggeser kamera peta.
   - **MLBB Battle Spells**:
     - 🌀 **Recall**: Teleportasi animasi kembali ke base spawn point (Gerbang Utama Jl. Semarang) disertai sound effect portal.
     - ⚡ **Sprint**: Mode jelajah cepat untuk melihat keseluruhan kawasan kampus.
     - 📍 **Ping Quick Wheel**: Menu radial cepat (Kelas, Perpus, Kantin, Masjid, Medis, Gerbang) yang langsung memandu rute terdekat.
3. **Navigasi Rute Cerdas (Google Maps Waypoint)**:
   - Perhitungan jarak real-time (meter) dan estimasi waktu jalan kaki (menit).
   - Garis rute neon bercahaya dari posisi Maba ke gedung tujuan.
4. **Tips Survival Khusus Mahasiswa Baru (Maba Guide)**:
   - Setiap gedung memiliki info operasional, jumlah lantai, fasilitas stopkontak/AC, dan tips rahasia (contoh: trik lift antre di GKB, aturan pakaian di Rektorat, spot nugas rebahan di Perpustakaan).
5. **Maba Quest Log (RPG System)**:
   - Misi penjelajahan kampus untuk membimbing maba secara interaktif (Klaim misi ➔ naik level semester ➔ kumpulkan koin UKT).
6. **Zero-Dependency Procedural Audio Engine**:
   - Sound effects (Klik, Ping sonar, Waypoint lock, Recall warp, Victory fanfare) disintesis secara langsung menggunakan Web Audio API tanpa perlu unduh file MP3 besar, 100% cepat dan offline-ready.

---

## 🚀 Cara Menjalankan

Cukup buka file `index.html` langsung di browser mana pun (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari) dengan cara:
- **Double click** file `index.html`, atau
- Klik kanan `index.html` ➔ **Open with** ➔ **Google Chrome / Microsoft Edge**.

---

## 📁 Struktur Berkas

- `index.html` : Struktur utama UI game HUD, leaflet container, drawer, modal misi, dan ping wheel.
- `styles.css` : Desain grafis bertema sci-fi MOBA game (cyber-navy, neon cyan, gold borders, animasi radar).
- `data.js` : Basis data komprehensif seluruh gedung, koordinat, lane, dan tips survival maba di UM.
- `audio.js` : Mesin audio prosedural (Web Audio API & Speech Synthesis) untuk SFX dan suara pemandu.
- `app.js` : Logika interaksi, pergerakan peta Leaflet, sinkronisasi minimap, sistem rute, dan pencarian instan.
