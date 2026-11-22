export type DataKenangan = {
  judul: string | null;
  untuk: string | null; // nama penerima, ditampilkan di sampul dan sebagai salam surat
  pesan: string | null;
  linkLagu: string | null;
  foto: string[];
  video: string[];
  voice: string[];
};

export type Slide =
  | { tipe: "foto"; url: string; urutan: number }
  | { tipe: "surat" }
  | { tipe: "voice"; url: string }
  | { tipe: "video"; url: string }
  | { tipe: "penutup" };

// Urutan cerita: beberapa foto pembuka, lalu surat dan pesan suara,
// sisa foto, video, dan halaman penutup.
export function susunSlide(data: DataKenangan): Slide[] {
  const foto: Slide[] = data.foto.map((url, urutan) => ({ tipe: "foto", url, urutan }));
  const pembuka = foto.slice(0, 3);
  const sisa = foto.slice(3);

  return [
    ...pembuka,
    ...(data.pesan ? [{ tipe: "surat" } as const] : []),
    ...data.voice.map((url) => ({ tipe: "voice", url }) as const),
    ...sisa,
    ...data.video.map((url) => ({ tipe: "video", url }) as const),
    { tipe: "penutup" },
  ];
}

// Lama tampil (ms) untuk slide yang tidak berupa video/suara.
export function lamaTampil(slide: Slide, pesan: string | null) {
  if (slide.tipe === "foto") return 5000;
  if (slide.tipe === "surat") {
    const panjang = pesan?.length ?? 0;
    return Math.min(25000, Math.max(7000, 4000 + panjang * 55));
  }
  return 0;
}

export function paragraf(pesan: string | null) {
  return (pesan ?? "")
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Teks kecil di atas judul pada sampul dan album.
export function labelSampul(untuk: string | null) {
  return untuk ? `Untuk ${untuk}` : "Album kenangan";
}
