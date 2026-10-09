# Sefizlumia — Apotek Digital

Website React + TypeScript + Vite dengan desain responsif, katalog, keranjang, UI autentikasi Supabase, titik awal konsultasi chat, dan tautan WhatsApp.

> **Penting:** proyek ini adalah fondasi aplikasi yang perlu dikonfigurasi dan diuji. Tanpa konfigurasi Supabase, website berjalan dalam mode demo. Checkout sengaja tidak mengaku berhasil dan belum memproses pesanan nyata. Jangan gunakan untuk transaksi atau pelayanan pasien nyata sebelum backend, kebijakan keamanan, dan proses kefarmasian ditinjau.

## Persyaratan

- Node.js 20 atau lebih baru
- npm
- Akun Supabase (gratis untuk pengembangan)
- Git (opsional, untuk version control)

## Jalankan secara lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Di Windows PowerShell, salin `.env.example` menjadi `.env.local` secara manual jika `cp` tidak tersedia.

Buka URL lokal yang ditampilkan Vite, biasanya `http://localhost:5173`.

## Hubungkan Supabase

1. Buat proyek di dashboard Supabase.
2. Buka **Project Settings → API**.
3. Salin Project URL dan anon/public key ke `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=ANON_PUBLIC_KEY
   VITE_WHATSAPP_NUMBER=628xxxxxxxxxx
   ```
4. Jangan masukkan `service_role` key ke frontend.
5. Jalankan SQL di `supabase/migrations/001_initial_schema.sql` melalui SQL Editor Supabase.
6. Di Authentication → URL Configuration, masukkan URL lokal `http://localhost:5173` sebagai Site URL/redirect yang sesuai.
7. Buat akun biasa melalui form daftar. Akun baru tidak mendapat role admin/apoteker otomatis.

## Catatan fitur

- **Katalog:** memakai contoh produk jika Supabase belum terkonfigurasi atau tabel katalog belum berisi produk. Contoh produk/harga/stok bukan data transaksi nyata.
- **Login/daftar:** menggunakan Supabase Auth ketika kredensial `.env.local` tersedia.
- **Konsultasi:** pengguna login dapat membuat permintaan konsultasi. Chat perlu apoteker yang telah diverifikasi dan ditugaskan; role dan assignment perlu dilakukan secara aman melalui proses admin. Tidak ada chatbot yang berpura-pura menjadi apoteker.
- **WhatsApp:** gunakan nomor yang benar-benar dikuasai apotek. Format internasional tanpa `+`, spasi, atau angka nol awal setelah kode negara, misalnya `62812...`. Nomor WhatsApp pada `.env.example` dikosongkan; isi dengan nomor resmi apotek sebelum digunakan.
- **Checkout:** UI keranjang berfungsi di sisi browser. Checkout tidak membuat pesanan nyata karena validasi harga/stok yang atomik harus dibuat di backend sebelum menerima pesanan.
- **Gambar dan artikel:** gambar ilustrasi dari URL eksternal; ganti dengan aset yang memiliki izin pakai dan konten terverifikasi.
- **Informasi apotek:** alamat, izin, identitas apoteker, jadwal, harga dan ketersediaan harus diisi serta diverifikasi sebelum peluncuran.

## Build produksi

```bash
npm run build
npm run preview
```

Folder hasil build adalah `dist/`.

## Deploy ke Cloudflare Pages

1. Push proyek ke repository GitHub.
2. Di Cloudflare Dashboard, buka Workers & Pages → Create → Pages → Connect to Git.
3. Build command: `npm run build`.
4. Build output directory: `dist`.
5. Tambahkan `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan `VITE_WHATSAPP_NUMBER` di environment variables proyek.
6. Deploy dan uji autentikasi serta izin akses dari URL produksi.
7. Hubungkan domain sendiri setelah domain dibeli. Ikuti record DNS persis seperti yang diberikan Cloudflare; jangan menebak record.

## Status pengujian awal

| Pemeriksaan | Status |
|---|---|
| Pembuatan file frontend dan struktur proyek | BERHASIL |
| Build TypeScript/Vite | BELUM DIUJI di lingkungan ini |
| Registrasi/login dengan proyek Supabase nyata | BELUM DIUJI |
| RLS dengan dua akun berbeda | BELUM DIUJI |
| Chat real-time dua akun | BELUM DIUJI |
| Upload file resep privat | BELUM DIIMPLEMENTASIKAN pada UI awal |
| Checkout dengan validasi stok atomik | BELUM DIIMPLEMENTASIKAN |
| WhatsApp membuka nomor konfigurasi | BELUM DIUJI |
| Deployment dan custom domain | BELUM DIUJI |

Jangan mengubah status pengujian menjadi BERHASIL sebelum pengujian benar-benar dilakukan.
