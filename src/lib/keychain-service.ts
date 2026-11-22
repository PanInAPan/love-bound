import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { canEdit, KEYCHAIN_COLS, listMedia, type Keychain } from "@/lib/keychain";
import { BUCKET, EXT, PACKAGES, type MediaKind } from "@/lib/packages";

// Logika bisnis keychain, dipakai Server Actions (dashboard) dan REST API (/api/...).
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type KeychainInput = {
  judul?: string | null; untuk?: string | null; pesan?: string | null; link_lagu?: string | null; buka_pada?: string | null;
};

export async function listOwned(userId: string): Promise<Keychain[]> {
  const { data, error } = await createAdminClient().from("keychains").select(KEYCHAIN_COLS)
    .eq("owner_id", userId).order("created_at");
  if (error) throw new ApiError(500, error.message);
  return (data ?? []) as Keychain[];
}

export async function getOwned(userId: string, id: string): Promise<Keychain> {
  const { data } = await createAdminClient().from("keychains").select(KEYCHAIN_COLS)
    .eq("id", id).eq("owner_id", userId).maybeSingle();
  if (!data) throw new ApiError(404, "Keychain tidak ditemukan");
  return data as Keychain;
}

async function getEditable(userId: string, id: string) {
  const k = await getOwned(userId, id);
  if (!canEdit(k)) throw new ApiError(403, "Jatah ubah isi sudah habis");
  return k;
}

export async function claim(userId: string, id: string, token: string) {
  const admin = createAdminClient();
  const { data: k } = await admin.from("keychains").select("id, edit_token, owner_id").eq("id", id).maybeSingle();
  if (!k || k.edit_token !== token) throw new ApiError(404, "Kode atau token tidak cocok");
  if (k.owner_id && k.owner_id !== userId) throw new ApiError(409, "Keychain ini sudah dipakai akun Google lain");
  if (!k.owner_id) {
    const { error } = await admin.from("keychains").update({ owner_id: userId }).eq("id", id).is("owner_id", null);
    if (error) throw new ApiError(500, error.message);
  }
  return getOwned(userId, id);
}

export async function media(userId: string, id: string) {
  await getOwned(userId, id);
  return listMedia(id);
}

export async function createUpload(userId: string, id: string, kind: MediaKind, size: number, ext: string) {
  if (!["photo", "voice", "video"].includes(kind)) throw new ApiError(400, "kind harus photo, voice, atau video");
  if (!Number.isFinite(size) || size <= 0) throw new ApiError(400, "size tidak valid");
  const k = await getEditable(userId, id);
  const pkg = PACKAGES[k.paket];
  ext = String(ext ?? "").toLowerCase().replace(/^\./, "");
  if (!EXT[kind].includes(ext)) throw new ApiError(400, `Format .${ext} tidak didukung untuk ${kind}`);
  if (size > pkg.maxMB[kind] * 1024 * 1024) throw new ApiError(413, `Ukuran maksimal ${pkg.maxMB[kind]} MB`);
  const existing = (await listMedia(id, 60)).filter((m) => m.kind === kind).length;
  if (existing >= pkg.max[kind]) throw new ApiError(409, `Batas ${kind} untuk paket ${pkg.label} sudah penuh (${pkg.max[kind]})`);
  const path = `${id}/${Date.now()}-${kind}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new ApiError(500, error.message);
  return { path, token: data.token, signedUrl: data.signedUrl };
}

export async function removeMedia(userId: string, id: string, path: string) {
  await getEditable(userId, id);
  if (!path || !path.startsWith(`${id}/`) || path.includes("..")) throw new ApiError(400, "Path tidak valid");
  const { error } = await createAdminClient().storage.from(BUCKET).remove([path]);
  if (error) throw new ApiError(500, error.message);
}

export async function save(userId: string, id: string, f: KeychainInput) {
  const k = await getEditable(userId, id);
  const pkg = PACKAGES[k.paket];
  const clean = (s: string | null | undefined, max: number) => (s ?? "").toString().trim().slice(0, max) || null;
  let buka: string | null = null;
  if (pkg.timeLock && f.buka_pada) {
    const d = new Date(f.buka_pada);
    if (isNaN(d.getTime())) throw new ApiError(400, "buka_pada bukan tanggal yang valid");
    buka = d.toISOString();
  }
  const { data, error } = await createAdminClient().from("keychains").update({
    judul: clean(f.judul, 120), untuk: clean(f.untuk, 120), pesan: clean(f.pesan, 5000), link_lagu: clean(f.link_lagu, 500),
    buka_pada: buka,
    dikirim_pada: k.dikirim_pada ?? new Date().toISOString(),
    jumlah_ubah: k.dikirim_pada ? k.jumlah_ubah + 1 : 0,
  }).eq("id", id).eq("jumlah_ubah", k.jumlah_ubah).select(KEYCHAIN_COLS).maybeSingle();
  if (error) throw new ApiError(500, error.message);
  if (!data) throw new ApiError(409, "Data berubah di tempat lain, muat ulang");
  return data as Keychain;
}

// Data slideshow publik (tanpa login).
export type PublicView =
  | { state: "expired"; judul: string | null }
  | { state: "locked"; buka_pada: string; judul: string | null; untuk: string | null }
  | { state: "open"; empty: boolean; judul: string | null; untuk: string | null; pesan: string | null; link_lagu: string | null;
      media: { kind: MediaKind; url: string }[] };

export async function publicView(id: string): Promise<PublicView | null> {
  const { data } = await createAdminClient().from("keychains").select(KEYCHAIN_COLS).eq("id", id).maybeSingle();
  if (!data) return null;
  const k = data as Keychain;
  if (new Date(k.aktif_sampai) < new Date()) return { state: "expired", judul: k.judul };
  if (k.buka_pada && new Date(k.buka_pada) > new Date())
    return { state: "locked", buka_pada: k.buka_pada, judul: k.judul, untuk: k.untuk };
  const m = (await listMedia(k.id)).map(({ kind, url }) => ({ kind, url }));
  return { state: "open", judul: k.judul, untuk: k.untuk, pesan: k.pesan, link_lagu: k.link_lagu, media: m,
    empty: !k.pesan && m.length === 0 };
}
