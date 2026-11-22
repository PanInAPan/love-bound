"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BUCKET, PACKAGES, type MediaKind } from "@/lib/packages";
import type { Keychain, MediaItem as Media } from "@/lib/keychain";
import { claimKeychain, createUpload, deleteMedia, getMedia, saveKeychain } from "./actions";

const supabase = createClient();

export default function Dashboard({ email, initialKeychains, initialSelected, claimError }: {
  email: string; initialKeychains: Keychain[]; initialSelected: string | null; claimError: string | null;
}) {
  const router = useRouter();
  const [keychains, setKeychains] = useState(initialKeychains);
  const [selectedId, setSelectedId] = useState(initialSelected);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(claimError);

  const selected = keychains.find((k) => k.id === selectedId) ?? null;

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    // Terima link lengkap (…/edit/KODE?t=TOKEN) atau "KODE TOKEN".
    const raw = code.trim();
    let id = "", token = "";
    const m = raw.match(/\/(?:edit|k)\/([^/?#\s]+)\?(?:.*&)?t=([0-9a-f-]{36})/i);
    if (m) { id = decodeURIComponent(m[1]); token = m[2]; }
    else [id, token = ""] = raw.split(/\s+/);
    const res = await claimKeychain(id, token);
    if (!res.ok) return setMsg(res.error);
    const k = res.data;
    setKeychains((list) => (list.some((x) => x.id === k.id) ? list : [...list, k]));
    setSelectedId(k.id);
    setCode("");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-dvh bg-rose-50">
      <header className="bg-white/80">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-rose-900">Keychain Kenangan</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-neutral-500 hidden sm:inline">{email}</span>
            <button onClick={signOut} className="text-rose-700 hover:underline">Keluar</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-medium">Tambah keychain</h2>
          <form onSubmit={claim} className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Tempel link dari kartu petunjuk"
              className="flex-1 rounded-lg px-3 py-2 bg-rose-50/60 outline-none focus:ring-2 focus:ring-rose-200 placeholder:text-neutral-400" />
            <button className="rounded-lg bg-rose-600 px-4 py-2 text-white disabled:opacity-50" disabled={!code.trim()}>Tambah</button>
          </form>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          {keychains.length > 1 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {keychains.map((k) => (
                <button key={k.id} onClick={() => setSelectedId(k.id)}
                  className={`rounded-full px-3 py-1 text-sm ${k.id === selectedId ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-800 hover:bg-rose-100"}`}>
                  {k.judul || k.id}
                </button>
              ))}
            </div>
          )}
        </section>

        {selected ? (
          <Editor key={selected.id} keychain={selected}
            onSaved={(k) => setKeychains((list) => list.map((x) => (x.id === k.id ? k : x)))} />
        ) : (
          <p className="text-center text-neutral-500">Masukkan kode keychain untuk mulai mengisi kenangan.</p>
        )}
      </div>
    </main>
  );
}

function Editor({ keychain, onSaved }: { keychain: Keychain; onSaved: (k: Keychain) => void }) {
  const pkg = PACKAGES[keychain.paket];
  const [form, setForm] = useState({
    judul: keychain.judul ?? "", untuk: keychain.untuk ?? "", pesan: keychain.pesan ?? "",
    link_lagu: keychain.link_lagu ?? "", buka_pada: keychain.buka_pada ? toLocalInput(keychain.buka_pada) : "",
  });
  const [media, setMedia] = useState<Media[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const editsLeft = keychain.dikirim_pada == null ? null
    : pkg.edits == null ? Infinity : pkg.edits - keychain.jumlah_ubah;
  const locked = editsLeft !== null && editsLeft <= 0;
  const slideshowUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/k/${keychain.id}`;

  const loadMedia = useCallback(async () => {
    const res = await getMedia(keychain.id);
    if (res.ok) setMedia(res.data);
  }, [keychain.id]);
  useEffect(() => { loadMedia(); }, [loadMedia]);

  const count = (kind: MediaKind) => media.filter((m) => m.kind === kind).length;

  async function upload(kind: MediaKind, file: Blob, ext: string) {
    if (count(kind) >= pkg.max[kind]) throw new Error(`Maksimal ${pkg.max[kind]} ${LABEL[kind]} untuk paket ${pkg.label}`);
    if (file.size > pkg.maxMB[kind] * 1024 * 1024) throw new Error(`Ukuran maksimal ${pkg.maxMB[kind]} MB`);
    const res = await createUpload(keychain.id, kind, file.size, ext);
    if (!res.ok) throw new Error(res.error);
    const up = await supabase.storage.from(BUCKET)
      .uploadToSignedUrl(res.data.path, res.data.token, file, { contentType: file.type || undefined });
    if (up.error) throw up.error;
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setNotice(null);
    try { await fn(); } catch (e) { setNotice({ ok: false, text: (e as Error).message }); }
    setBusy(null);
    loadMedia();
  }

  async function onPhotos(files: FileList | null) {
    if (!files) return;
    await run("Mengunggah foto…", async () => {
      for (const f of Array.from(files)) {
        const blob = await compressImage(f);
        await upload("photo", blob, "jpg");
      }
    });
  }

  async function onFile(kind: "voice" | "video", files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    await run(`Mengunggah ${LABEL[kind]}…`, async () => {
      if (kind === "video") {
        const secs = await videoDuration(f);
        if (secs > 61) throw new Error("Durasi video maksimal 60 detik");
      }
      await upload(kind, f, f.name.split(".").pop() || (kind === "video" ? "mp4" : "webm"));
    });
  }

  async function remove(m: Media) {
    await run("Menghapus…", async () => {
      const res = await deleteMedia(keychain.id, m.path);
      if (!res.ok) throw new Error(res.error);
    });
  }

  async function save() {
    if (keychain.dikirim_pada && editsLeft !== Infinity &&
      !confirm(`Menyimpan perubahan memakai 1 jatah ubah (sisa ${editsLeft}). Lanjut?`)) return;
    setBusy("Menyimpan…"); setNotice(null);
    const res = await saveKeychain(keychain.id, {
      ...form, buka_pada: form.buka_pada ? new Date(form.buka_pada).toISOString() : null,
    });
    setBusy(null);
    if (!res.ok) return setNotice({ ok: false, text: res.error });
    onSaved(res.data);
    setNotice({ ok: true, text: "Tersimpan! Tempelkan keychain ke HP untuk melihat slideshow." });
  }

  const input = "w-full rounded-lg px-3 py-2 bg-rose-50/60 outline-none focus:ring-2 focus:ring-rose-200 placeholder:text-neutral-400 disabled:opacity-60";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium text-base">Keychain {keychain.id}</span>
          <span className="rounded-full bg-rose-100 px-3 py-0.5 text-rose-800">Paket {pkg.label}</span>
        </div>
        <p className="text-neutral-600">
          Slideshow: <a href={slideshowUrl} target="_blank" className="text-rose-700 underline break-all">{slideshowUrl}</a>
        </p>
        <p className="text-neutral-600">
          {editsLeft === null ? "Belum dikirim — isi lalu tekan Simpan & kirim."
            : editsLeft === Infinity ? "Bisa diubah tanpa batas."
            : `Sisa jatah ubah: ${Math.max(editsLeft, 0)}`}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-medium">Pesan</h2>
        <input className={input} disabled={locked} placeholder="Judul (mis. Happy Anniversary!)"
          value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
        <input className={input} disabled={locked} placeholder="Untuk siapa?"
          value={form.untuk} onChange={(e) => setForm({ ...form, untuk: e.target.value })} />
        <textarea className={`${input} min-h-36`} disabled={locked} placeholder="Tulis surat/pesan kamu di sini…"
          value={form.pesan} onChange={(e) => setForm({ ...form, pesan: e.target.value })} />
        <input className={input} disabled={locked} placeholder="Link lagu Spotify / YouTube (opsional)"
          value={form.link_lagu} onChange={(e) => setForm({ ...form, link_lagu: e.target.value })} />
        {pkg.timeLock && (
          <label className="block text-sm space-y-1">
            <span className="text-neutral-600">Kunci waktu — pesan baru bisa dibuka mulai (opsional)</span>
            <input type="datetime-local" className={input} disabled={locked}
              value={form.buka_pada} onChange={(e) => setForm({ ...form, buka_pada: e.target.value })} />
          </label>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-medium">Foto, voice note & video</h2>
        <div className="flex flex-wrap gap-2">
          <PickButton disabled={locked || count("photo") >= pkg.max.photo} accept="image/*" multiple
            onPick={onPhotos} label={`+ Foto (${count("photo")}/${pkg.max.photo})`} />
          {pkg.max.voice > 0 && (
            <>
              <VoiceRecorder disabled={locked || count("voice") >= pkg.max.voice}
                onDone={(b) => run("Mengunggah voice note…", () => upload("voice", b, b.type.includes("mp4") ? "m4a" : "webm"))}
                label={`Rekam voice note (${count("voice")}/${pkg.max.voice})`} />
              <PickButton disabled={locked || count("voice") >= pkg.max.voice} accept="audio/*"
                onPick={(f) => onFile("voice", f)} label="Unggah file audio" />
            </>
          )}
          {pkg.max.video > 0 && (
            <PickButton disabled={locked || count("video") >= pkg.max.video} accept="video/*"
              onPick={(f) => onFile("video", f)} label={`+ Video (${count("video")}/${pkg.max.video})`} />
          )}
        </div>
        {pkg.max.voice === 0 && <p className="text-xs text-neutral-500">Voice note & video tersedia di paket Plus dan Premium.</p>}
        {busy && <p className="text-sm text-rose-700">{busy}</p>}

        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {media.map((m) => (
            <li key={m.path} className="rounded-xl overflow-hidden bg-rose-50/60">
              {m.kind === "photo" && <img src={m.url} alt="" className="aspect-square w-full object-cover" />}
              {m.kind === "video" && <video src={m.url} className="aspect-square w-full object-cover" controls />}
              {m.kind === "voice" && (
                <div className="aspect-square flex flex-col items-center justify-center gap-2 p-2">
                  <span className="text-3xl">🎙️</span>
                  <audio src={m.url} controls className="w-full" />
                </div>
              )}
              {!locked && (
                <div className="flex justify-end px-2 py-1 text-sm">
                  <button onClick={() => remove(m)} className="text-red-600">Hapus</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {notice && <p className={`text-sm ${notice.ok ? "text-green-700" : "text-red-600"}`}>{notice.text}</p>}
      <button onClick={save} disabled={locked || !!busy}
        className="w-full rounded-xl bg-rose-600 py-3 font-medium text-white disabled:opacity-50">
        {locked ? "Jatah ubah sudah habis" : keychain.dikirim_pada ? "Simpan perubahan" : "Simpan & kirim"}
      </button>
    </div>
  );
}

const LABEL: Record<MediaKind, string> = { photo: "foto", voice: "voice note", video: "video" };

function PickButton({ label, accept, multiple, disabled, onPick }: {
  label: string; accept: string; multiple?: boolean; disabled?: boolean; onPick: (f: FileList | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => ref.current?.click()}
        className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 hover:bg-rose-100 disabled:opacity-40">{label}</button>
      <input ref={ref} type="file" hidden accept={accept} multiple={multiple}
        onChange={(e) => { onPick(e.target.files); e.target.value = ""; }} />
    </>
  );
}

function VoiceRecorder({ label, disabled, onDone }: { label: string; disabled?: boolean; onDone: (b: Blob) => void }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const r = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 });
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => chunks.push(e.data);
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      setRec(null);
      onDone(new Blob(chunks, { type: mime }));
    };
    r.start();
    setRec(r); setSecs(0);
    timer.current = setInterval(() => setSecs((s) => {
      if (s + 1 >= 120) r.stop(); // ±2 menit ≈ 1 MB di 64 kbps
      return s + 1;
    }), 1000);
  }

  return rec ? (
    <button type="button" onClick={() => rec.stop()} className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white">
      ■ Stop ({secs}s / 120s)
    </button>
  ) : (
    <button type="button" disabled={disabled} onClick={start}
      className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 hover:bg-rose-100 disabled:opacity-40">🎙️ {label}</button>
  );
}

// Perkecil foto di HP pembeli: sisi terpanjang 1600 px, JPEG, target < 1 MB.
async function compressImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  for (const q of [0.85, 0.75, 0.6, 0.45]) {
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", q));
    if (blob.size <= 1024 * 1024) return blob;
  }
  throw new Error(`Foto ${file.name} terlalu besar setelah dikompres`);
}

function videoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
