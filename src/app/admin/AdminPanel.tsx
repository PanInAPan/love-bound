"use client";

import { useEffect, useState } from "react";
import { MAKS_PER_BATCH, PACKAGES, type PackageName } from "@/lib/packages";
import type { KeychainAdmin } from "@/lib/admin";
import { buatKeychain, tandaiDitulis } from "./actions";

// Web NFC hanya ada di Chrome Android (HTTPS atau localhost). Tipe minimal karena belum ada di lib DOM.
type NdefWriter = { write: (msg: { records: { recordType: "url"; data: string }[] }, opts?: { signal?: AbortSignal }) => Promise<void> };
type NdefCtor = new () => NdefWriter;

export default function AdminPanel({ email, base, awal, galatAwal }: {
  email: string; base: string; awal: KeychainAdmin[]; galatAwal: string | null;
}) {
  const [daftar, setDaftar] = useState(awal);
  const [batchBaru, setBatchBaru] = useState<string[]>([]);
  const [paket, setPaket] = useState<PackageName>("plus");
  const [jumlah, setJumlah] = useState(1);
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(galatAwal ? { ok: false, teks: galatAwal } : null);
  const [hanyaBelum, setHanyaBelum] = useState(false);
  const [adaWebNfc, setAdaWebNfc] = useState(false);

  useEffect(() => { setAdaWebNfc("NDEFReader" in window); }, []);

  const lokal = /\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(base);
  const tampil = hanyaBelum ? daftar.filter((k) => !k.nfc_ditulis_pada) : daftar;
  const baru = daftar.filter((k) => batchBaru.includes(k.id));

  async function buat(e: React.FormEvent) {
    e.preventDefault();
    setSibuk(true); setPesan(null);
    const res = await buatKeychain({ paket, jumlah, catatan });
    setSibuk(false);
    if (!res.ok) return setPesan({ ok: false, teks: res.error });
    setDaftar((d) => [...res.data, ...d]);
    setBatchBaru(res.data.map((k) => k.id));
    setPesan({ ok: true, teks: `${res.data.length} keychain dibuat. Tulis link NFC-nya ke chip satu per satu.` });
  }

  function ganti(k: KeychainAdmin) {
    setDaftar((d) => d.map((x) => (x.id === k.id ? k : x)));
  }

  async function salinSemua() {
    const baris = ["Kode\tPaket\tLink NFC\tLink kartu", ...baru.map((k) => `${k.id}\t${PACKAGES[k.paket].label}\t${k.linkNfc}\t${k.linkKartu}`)];
    await salin(baris.join("\n"));
    setPesan({ ok: true, teks: "Disalin. Tempel ke spreadsheet untuk mencetak kartu petunjuk." });
  }

  return (
    <main className="min-h-dvh bg-rose-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold text-rose-900">Admin LoveBound</h1>
          <span className="text-sm text-neutral-500 hidden sm:inline">{email}</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {lokal && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Link masih memakai <b>{base}</b>. Chip yang dijual harus berisi domain asli, jadi isi
            <code className="mx-1 rounded bg-amber-100 px-1">NEXT_PUBLIC_SITE_URL</code>di <code>.env.local</code> dulu
            (mis. https://domainmu.id), lalu jalankan ulang server.
          </p>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-medium">Buat keychain baru</h2>
          <form onSubmit={buat} className="grid gap-3 sm:grid-cols-[1fr_7rem]">
            <label className="text-sm space-y-1">
              <span className="text-neutral-600">Paket</span>
              <select value={paket} onChange={(e) => setPaket(e.target.value as PackageName)} className="w-full rounded-lg border border-neutral-300 px-3 py-2 bg-white">
                {(Object.keys(PACKAGES) as PackageName[]).map((p) => <option key={p} value={p}>{PACKAGES[p].label}</option>)}
              </select>
            </label>
            <label className="text-sm space-y-1">
              <span className="text-neutral-600">Jumlah</span>
              <input type="number" min={1} max={MAKS_PER_BATCH} value={jumlah}
                onChange={(e) => setJumlah(Number(e.target.value))} className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
            </label>
            <label className="text-sm space-y-1 sm:col-span-2">
              <span className="text-neutral-600">Catatan (opsional)</span>
              <input value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={200}
                placeholder="Nomor pesanan Shopee atau nama pembeli" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
            </label>
            <button disabled={sibuk} className="sm:col-span-2 rounded-xl bg-rose-600 py-3 font-medium text-white disabled:opacity-50">
              {sibuk ? "Membuat…" : `Buat ${jumlah > 1 ? `${jumlah} keychain` : "keychain"}`}
            </button>
          </form>
          {pesan && <p className={`text-sm ${pesan.ok ? "text-green-700" : "text-red-600"}`}>{pesan.teks}</p>}
        </section>

        {baru.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm space-y-3 ring-2 ring-rose-200">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">Baru dibuat</h2>
              {baru.length > 1 && (
                <button onClick={salinSemua} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">Salin semua untuk spreadsheet</button>
              )}
            </div>
            <ul className="space-y-3">
              {baru.map((k) => <Baris key={k.id} k={k} adaWebNfc={adaWebNfc} onUbah={ganti} />)}
            </ul>
          </section>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">Semua keychain</h2>
            <label className="flex items-center gap-2 text-sm text-neutral-600">
              <input type="checkbox" checked={hanyaBelum} onChange={(e) => setHanyaBelum(e.target.checked)} />
              Belum ditulis saja
            </label>
          </div>
          {tampil.length === 0 ? (
            <p className="text-sm text-neutral-500">{hanyaBelum ? "Semua chip sudah ditulis." : "Belum ada keychain."}</p>
          ) : (
            <ul className="space-y-3">
              {tampil.map((k) => <Baris key={k.id} k={k} adaWebNfc={adaWebNfc} onUbah={ganti} />)}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Baris({ k, adaWebNfc, onUbah }: { k: KeychainAdmin; adaWebNfc: boolean; onUbah: (k: KeychainAdmin) => void }) {
  const [status, setStatus] = useState<string | null>(null);
  const [menulis, setMenulis] = useState(false);

  async function salinLink(teks: string, nama: string) {
    await salin(teks);
    setStatus(`${nama} disalin`);
  }

  async function tandai(ditulis: boolean) {
    const res = await tandaiDitulis(k.id, ditulis);
    if (!res.ok) return setStatus(res.error);
    onUbah(res.data);
    setStatus(ditulis ? "Ditandai sudah ditulis" : "Tanda dihapus");
  }

  async function tulisKeChip() {
    const Ndef = (window as unknown as { NDEFReader: NdefCtor }).NDEFReader;
    const batal = new AbortController();
    const waktuHabis = setTimeout(() => batal.abort(), 30_000);
    setMenulis(true);
    setStatus("Tempelkan chip ke bagian belakang HP…");
    try {
      await new Ndef().write({ records: [{ recordType: "url", data: k.linkNfc }] }, { signal: batal.signal });
      setStatus("Berhasil ditulis ke chip");
      await tandai(true);
    } catch (e) {
      setStatus(batal.signal.aborted ? "Waktu habis, coba lagi" : `Gagal menulis: ${(e as Error).message}`);
    } finally {
      clearTimeout(waktuHabis);
      setMenulis(false);
    }
  }

  const tombol = "rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-40";

  return (
    <li className="rounded-xl border border-neutral-200 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-lg font-semibold tracking-wider">{k.id}</span>
        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs text-rose-800">{PACKAGES[k.paket].label}</span>
        <Tanda aktif={!!k.nfc_ditulis_pada} ya="Chip sudah ditulis" tidak="Chip belum ditulis" />
        <Tanda aktif={k.diklaim} ya="Diklaim pembeli" tidak="Belum diklaim" />
        {k.dikirim_pada && <Tanda aktif ya="Sudah diisi" tidak="" />}
      </div>
      {k.catatan && <p className="text-sm text-neutral-600">{k.catatan}</p>}
      <p className="font-mono text-xs text-neutral-500 break-all">{k.linkNfc}</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => salinLink(k.linkNfc, "Link NFC")} className={`${tombol} !border-rose-300 text-rose-800`}>Salin link NFC</button>
        {adaWebNfc && <button onClick={tulisKeChip} disabled={menulis} className={tombol}>Tulis ke chip</button>}
        <button onClick={() => salinLink(k.linkKartu, "Link kartu")} className={tombol}>Salin link kartu</button>
        <button onClick={() => tandai(!k.nfc_ditulis_pada)} className={tombol}>
          {k.nfc_ditulis_pada ? "Batalkan tanda" : "Tandai sudah ditulis"}
        </button>
      </div>
      {status && <p className="text-xs text-neutral-600">{status}</p>}
    </li>
  );
}

function Tanda({ aktif, ya, tidak }: { aktif: boolean; ya: string; tidak: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs ${aktif ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-600"}`}>
      {aktif ? ya : tidak}
    </span>
  );
}

// Clipboard API butuh HTTPS/localhost; cadangan untuk akses lewat IP di jaringan lokal.
async function salin(teks: string) {
  try {
    await navigator.clipboard.writeText(teks);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = teks;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}
