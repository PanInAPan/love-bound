"use client";

import { useEffect, useState } from "react";

import type { PublicView } from "@/lib/keychain-service";
export type SlideshowData = PublicView;

const PHOTO_MS = 4000;

export default function Slideshow({ data }: { data: SlideshowData }) {
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);

  const photos = data.state === "open" ? data.media.filter((m) => m.kind !== "voice") : [];
  const voices = data.state === "open" ? data.media.filter((m) => m.kind === "voice") : [];
  const current = photos[i];

  useEffect(() => {
    if (!started || !current || current.kind !== "photo") return;
    const t = setTimeout(() => setI((x) => (x + 1) % photos.length), PHOTO_MS);
    return () => clearTimeout(t);
  }, [started, i, current, photos.length]);

  const shell = "min-h-dvh bg-gradient-to-b from-rose-950 to-neutral-950 text-white flex flex-col items-center justify-center px-6 text-center";

  if (data.state === "expired") {
    return <main className={shell}><p className="text-xl">Masa aktif keychain ini sudah habis.</p></main>;
  }
  if (data.state === "locked") return <Countdown data={data} shell={shell} />;

  if (data.empty) {
    return (
      <main className={shell}>
        <p className="text-xl">Keychain ini belum diisi 💌</p>
        <p className="mt-3 text-sm text-white/60">Pemilik: buka link di kartu petunjuk untuk mengisi.</p>
      </main>
    );
  }

  if (!started) {
    return (
      <main className={shell}>
        {data.untuk && <p className="text-rose-200">Untuk {data.untuk}</p>}
        <h1 className="mt-2 text-3xl font-semibold">{data.judul || "Sebuah kenangan untukmu"}</h1>
        <button onClick={() => setStarted(true)} className="mt-10 rounded-full bg-rose-600 px-8 py-3 text-lg">Buka 💝</button>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-neutral-950 text-white">
      {photos.length > 0 && (
        <section className="relative h-dvh w-full overflow-hidden" onClick={() => setI((x) => (x + 1) % photos.length)}>
          {photos.map((m, idx) => m.kind === "photo" ? (
            <img key={m.url} src={m.url} alt=""
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-1000 ${idx === i ? "opacity-100" : "opacity-0"}`} />
          ) : idx === i ? (
            <video key={m.url} src={m.url} autoPlay playsInline controls
              onEnded={() => setI((x) => (x + 1) % photos.length)}
              className="absolute inset-0 h-full w-full object-contain" />
          ) : null)}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5">
            {photos.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />
            ))}
          </div>
          <p className="absolute bottom-12 w-full text-center text-sm text-white/70 animate-bounce">scroll ke bawah ↓</p>
        </section>
      )}

      <section className="mx-auto max-w-xl px-6 py-16 space-y-8">
        {data.judul && <h1 className="text-3xl font-semibold text-center">{data.judul}</h1>}
        {data.pesan && <p className="whitespace-pre-wrap text-lg leading-relaxed text-white/90">{data.pesan}</p>}
        {voices.map((v, idx) => (
          <div key={v.url} className="rounded-2xl bg-white/10 p-4 space-y-2">
            <p className="text-sm text-white/70">🎙️ Voice note {voices.length > 1 ? idx + 1 : ""}</p>
            <audio src={v.url} controls autoPlay={idx === 0} className="w-full" />
          </div>
        ))}
        {data.link_lagu && <SongEmbed url={data.link_lagu} />}
      </section>
    </main>
  );
}

function SongEmbed({ url }: { url: string }) {
  const sp = url.match(/open\.spotify\.com\/(?:intl-\w+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/);
  if (sp) return <iframe className="w-full rounded-xl" height={152} src={`https://open.spotify.com/embed/${sp[1]}/${sp[2]}`} allow="encrypted-media" />;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
  if (yt) return <iframe className="w-full aspect-video rounded-xl" src={`https://www.youtube.com/embed/${yt[1]}`} allow="encrypted-media" allowFullScreen />;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="block text-center underline text-rose-300">🎵 Dengarkan lagunya</a>;
}

function Countdown({ data, shell }: { data: { buka_pada: string; judul: string | null; untuk: string | null }; shell: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = new Date(data.buka_pada).getTime() - now;
  useEffect(() => { if (ms <= 0) location.reload(); }, [ms]);
  const s = Math.max(0, Math.floor(ms / 1000));
  const parts = [[Math.floor(s / 86400), "hari"], [Math.floor(s / 3600) % 24, "jam"], [Math.floor(s / 60) % 60, "menit"], [s % 60, "detik"]] as const;
  return (
    <main className={shell}>
      <p className="text-4xl">🔒</p>
      {data.untuk && <p className="mt-4 text-rose-200">Untuk {data.untuk}</p>}
      <h1 className="mt-1 text-2xl font-semibold">{data.judul || "Pesan rahasia"}</h1>
      <p className="mt-6 text-white/70">Bisa dibuka dalam</p>
      <div className="mt-3 flex gap-4">
        {parts.map(([n, l]) => (
          <div key={l}><div className="text-3xl font-mono">{String(n).padStart(2, "0")}</div><div className="text-xs text-white/60">{l}</div></div>
        ))}
      </div>
      <p className="mt-6 text-sm text-white/50">{new Date(data.buka_pada).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}</p>
    </main>
  );
}
