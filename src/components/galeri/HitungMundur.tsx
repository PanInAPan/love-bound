"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import s from "./kelas";

type Props = {
  bukaPada: string; // ISO
  tanggalTeks: string; // sudah diformat di server, mis. "Senin, 22 Desember 2026 pukul 00.00"
};

// Hitung mundur sampai album terbuka. Saat waktunya tiba, halaman dimuat ulang otomatis.
export default function HitungMundur({ bukaPada, tanggalTeks }: Props) {
  const router = useRouter();
  const [sisa, setSisa] = useState<number | null>(null);
  const sudahRefresh = useRef(false);

  useEffect(() => {
    const target = new Date(bukaPada).getTime();
    function detak() {
      const d = target - Date.now();
      setSisa(Math.max(0, d));
      if (d <= 0 && !sudahRefresh.current) {
        sudahRefresh.current = true;
        router.refresh();
      }
    }
    const awal = window.setTimeout(detak, 0);
    const ulang = window.setInterval(detak, 1000);
    return () => {
      window.clearTimeout(awal);
      window.clearInterval(ulang);
    };
  }, [bukaPada, router]);

  const bagian =
    sisa === null
      ? null
      : {
          hari: Math.floor(sisa / 86_400_000),
          jam: Math.floor((sisa / 3_600_000) % 24),
          menit: Math.floor((sisa / 60_000) % 60),
          detik: Math.floor((sisa / 1000) % 60),
        };

  return (
    <>
      <p className={s.tanggalBuka}>Bisa dibuka {tanggalTeks} WIB</p>
      <div className={s.hitungMundur} aria-live="off">
        {(["hari", "jam", "menit", "detik"] as const).map((k) => (
          <div key={k} className={s.kotakWaktu}>
            <span className={s.angkaWaktu}>{bagian ? bagian[k] : "–"}</span>
            <span className={s.satuanWaktu}>{k}</span>
          </div>
        ))}
      </div>
    </>
  );
}
