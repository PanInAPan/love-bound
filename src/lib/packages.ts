// Batas per paket, sesuai sheet "Budget & Harga Keychain Kenangan NFC".
// Harus sama dengan fungsi package_limits() di supabase/schema.sql.
export type PackageName = "basic" | "plus" | "premium";
export type MediaKind = "photo" | "voice" | "video";

export const PACKAGES: Record<PackageName, {
  label: string;
  max: Record<MediaKind, number>;
  maxMB: Record<MediaKind, number>;
  timeLock: boolean;
  edits: number | null; // null = tanpa batas
}> = {
  basic:   { label: "Basic",   max: { photo: 10, voice: 0, video: 0 }, maxMB: { photo: 1, voice: 0, video: 0 },  timeLock: false, edits: 1 },
  plus:    { label: "Plus",    max: { photo: 20, voice: 1, video: 1 }, maxMB: { photo: 1, voice: 2, video: 25 }, timeLock: false, edits: 3 },
  premium: { label: "Premium", max: { photo: 40, voice: 3, video: 3 }, maxMB: { photo: 1, voice: 2, video: 25 }, timeLock: true,  edits: null },
};

export const BUCKET = "kenangan";
export const EXT: Record<MediaKind, string[]> = {
  photo: ["jpg"],
  voice: ["webm", "m4a", "mp3", "ogg"],
  video: ["mp4", "mov", "webm"],
};

// Maksimal keychain yang dibuat sekali klik di /admin.
export const MAKS_PER_BATCH = 50;
