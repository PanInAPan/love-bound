-- Jalankan sekali di Supabase: SQL Editor > New query > tempel > Run.

-- 1. Tabel keychain. Satu baris = satu keychain fisik.
create table if not exists public.keychains (
  id            text primary key,              -- kode di link NFC, mis. https://domainmu.id/k/DEMO01
  edit_token    uuid not null default gen_random_uuid(),  -- rahasia untuk link isi/ubah milik pembeli
  paket         text not null check (paket in ('basic', 'plus', 'premium')),
  judul         text,
  pesan         text,
  link_lagu     text,
  buka_pada     timestamptz,                   -- kunci waktu (paket premium), kosong = langsung terbuka
  aktif_sampai  timestamptz not null default (now() + interval '36 months'),
  created_at    timestamptz not null default now()
);

-- RLS aktif TANPA policy: browser (publishable key) tidak bisa membaca tabel ini sama sekali.
-- Semua akses lewat server Next.js yang memakai secret key.
alter table public.keychains enable row level security;

-- 2. Bucket privat untuk foto, video, dan voice note.
-- 26214400 byte = 25 MB (batas terbesar, untuk video). Paket gratis Supabase maksimal 50 MB per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kenangan', 'kenangan', false, 26214400,
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/ogg'
  ]
)
on conflict (id) do nothing;

-- 3. Data contoh untuk dicoba.
insert into public.keychains (id, paket, judul, pesan)
values ('DEMO01', 'plus', 'Untuk Ibu', 'Selamat Hari Ibu! Terima kasih untuk semuanya.')
on conflict (id) do nothing;

-- Lihat token edit untuk DEMO01 (dipakai di link /edit/DEMO01?t=TOKEN):
select id, paket, edit_token from public.keychains;
