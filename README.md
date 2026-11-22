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

## REST API

Semua respons JSON: sukses `{ "data": ... }`, gagal `{ "error": "pesan" }` dengan status 400/401/403/404/409/413/500.

**Login:** endpoint `/api/keychains/*` butuh login. Dari browser cukup cookie sesi (setelah login Google).
Dari HP/Postman kirim header `Authorization: Bearer <access_token>`, yaitu access token Supabase dari
`supabase.auth.getSession()` setelah login Google.

| Method | Endpoint | Body | Keterangan |
|---|---|---|---|
| GET | `/api/public/:id` | – | Data slideshow, **tanpa login**. `state`: `open` / `locked` / `expired` |
| GET | `/api/keychains` | – | Daftar keychain milik user |
| POST | `/api/keychains/claim` | `{ "id": "DEMO01", "token": "<edit_token>" }` | Hubungkan keychain ke akun |
| GET | `/api/keychains/:id` | – | Detail + daftar media |
| PUT | `/api/keychains/:id` | `{ "judul", "untuk", "pesan", "link_lagu", "buka_pada" }` | Simpan isi (setelah dikirim, memakai 1 jatah ubah) |
| GET | `/api/keychains/:id/media` | – | Daftar file (URL berlaku 1 jam) |
| POST | `/api/keychains/:id/media` | `{ "kind": "photo", "size": 345000, "ext": "jpg" }` | Minta izin upload → `{ path, token, signedUrl }` |
| DELETE | `/api/keychains/:id/media?path=<path>` | – | Hapus file |

**Upload file (2 langkah):**
```bash
# 1. minta izin upload (server cek batas paket)
curl -X POST http://localhost:3001/api/keychains/DEMO01/media \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"kind":"photo","size":345000,"ext":"jpg"}'
# 2. upload isi file ke signedUrl dari langkah 1
curl -X PUT "<signedUrl>" -H "Content-Type: image/jpeg" --data-binary @foto.jpg
```
Format yang diterima: photo `jpg` · voice `webm m4a mp3 ogg` · video `mp4 mov webm`.
