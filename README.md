# Keychain Kenangan NFC

Next.js 15 + Supabase (Auth Google, Postgres, Storage privat `kenangan`).

| Halaman | Login? | Fungsi |
|---|---|---|
| `/k/<KODE>` | Tidak | Slideshow, link yang ditulis ke chip NFC |
| `/edit/<KODE>?t=<edit_token>` | Google | Link di kartu petunjuk → klaim keychain ke akun Google pembeli |
| `/dashboard` | Google | Upload foto, voice note, video, pesan, link lagu |

Tabel `keychains` dan bucket `kenangan` tidak bisa diakses langsung dari browser (RLS tanpa policy, bucket privat).
Semua baca/tulis lewat server Next.js pakai `SUPABASE_SECRET_KEY`; upload file memakai signed upload URL
setelah server mengecek batas paket (`src/lib/packages.ts`).

## Setup
1. `cp .env.local.example .env.local`, isi URL, publishable key, dan secret key.
2. SQL Editor: jalankan `supabase/01_setup.sql` (sudah dijalankan?) lalu `supabase/02_dashboard.sql`.
3. Supabase → Authentication → Providers → Google: aktifkan, isi Client ID/Secret dari Google Cloud Console
   (redirect URI Google: `https://<project>.supabase.co/auth/v1/callback`).
   Authentication → URL Configuration: tambahkan `http://localhost:3000/auth/callback` dan domain produksi.
4. `npm run dev`, buka `http://localhost:3000/edit/DEMO01?t=<edit_token dari SQL>`.
