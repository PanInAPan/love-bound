-- Tambahan untuk dashboard login Google. Jalankan SETELAH 01_setup.sql.
-- Hanya menambah kolom; tidak mengubah yang sudah ada.
alter table public.keychains
  add column if not exists owner_id     uuid references auth.users(id) on delete set null, -- pembeli yang login Google
  add column if not exists untuk        text,                       -- nama penerima (opsional)
  add column if not exists dikirim_pada timestamptz,                -- pertama kali "Simpan & kirim"
  add column if not exists jumlah_ubah  int not null default 0;     -- dipakai untuk batas ubah isi per paket
