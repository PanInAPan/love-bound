"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canEdit, KEYCHAIN_COLS, listMedia, type Keychain } from "@/lib/keychain";
import { BUCKET, EXT, PACKAGES, type MediaKind } from "@/lib/packages";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Harus login");
  return user;
}

async function getOwned(id: string): Promise<Keychain> {
  const user = await requireUser();
  const { data } = await createAdminClient().from("keychains").select(KEYCHAIN_COLS)
    .eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!data) throw new Error("Keychain tidak ditemukan");
  return data as Keychain;
}

async function wrap<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try { return { ok: true, data: await fn() }; } catch (e) { return fail((e as Error).message); }
}

// Klaim keychain pakai kode + edit_token (dari link /edit/<kode>?t=<token> di kartu petunjuk).
export async function claimKeychain(id: string, token: string) {
  return wrap(async () => {
    const user = await requireUser();
    const admin = createAdminClient();
    const { data: k } = await admin.from("keychains").select("id, edit_token, owner_id").eq("id", id).maybeSingle();
    if (!k || k.edit_token !== token) throw new Error("Kode atau token tidak cocok");
    if (k.owner_id && k.owner_id !== user.id) throw new Error("Keychain ini sudah dipakai akun Google lain");
    if (!k.owner_id) {
      const { error } = await admin.from("keychains").update({ owner_id: user.id }).eq("id", id).is("owner_id", null);
      if (error) throw new Error(error.message);
    }
    return getOwned(id);
  });
}

export async function getMedia(id: string) {
  return wrap(async () => { await getOwned(id); return listMedia(id); });
}

export async function createUpload(id: string, kind: MediaKind, size: number, ext: string) {
  return wrap(async () => {
    const k = await getOwned(id);
    if (!canEdit(k)) throw new Error("Jatah ubah isi sudah habis");
    const pkg = PACKAGES[k.paket];
    ext = ext.toLowerCase();
    if (!EXT[kind].includes(ext)) throw new Error(`Format .${ext} tidak didukung`);
    if (size > pkg.maxMB[kind] * 1024 * 1024) throw new Error(`Ukuran maksimal ${pkg.maxMB[kind]} MB`);
    const existing = (await listMedia(id, 60)).filter((m) => m.kind === kind).length;
    if (existing >= pkg.max[kind]) throw new Error(`Batas ${kind} untuk paket ${pkg.label} sudah penuh (${pkg.max[kind]})`);
    const path = `${id}/${Date.now()}-${kind}.${ext}`;
    const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: data.token };
  });
}

export async function deleteMedia(id: string, path: string) {
  return wrap(async () => {
    const k = await getOwned(id);
    if (!canEdit(k)) throw new Error("Jatah ubah isi sudah habis");
    if (!path.startsWith(`${id}/`) || path.includes("..")) throw new Error("Path tidak valid");
    const { error } = await createAdminClient().storage.from(BUCKET).remove([path]);
    if (error) throw new Error(error.message);
    return true;
  });
}

export async function saveKeychain(id: string, f: {
  judul: string; untuk: string; pesan: string; link_lagu: string; buka_pada: string | null;
}) {
  return wrap(async () => {
    const k = await getOwned(id);
    if (!canEdit(k)) throw new Error("Jatah ubah isi sudah habis");
    const pkg = PACKAGES[k.paket];
    const clean = (s: string, max: number) => s.trim().slice(0, max) || null;
    const { data, error } = await createAdminClient().from("keychains").update({
      judul: clean(f.judul, 120), untuk: clean(f.untuk, 120), pesan: clean(f.pesan, 5000), link_lagu: clean(f.link_lagu, 500),
      buka_pada: pkg.timeLock && f.buka_pada ? new Date(f.buka_pada).toISOString() : null,
      dikirim_pada: k.dikirim_pada ?? new Date().toISOString(),
      jumlah_ubah: k.dikirim_pada ? k.jumlah_ubah + 1 : 0,
    }).eq("id", id).eq("jumlah_ubah", k.jumlah_ubah).select(KEYCHAIN_COLS).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Data berubah di tempat lain, muat ulang halaman");
    return data as Keychain;
  });
}
