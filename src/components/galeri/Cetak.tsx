import type { CSSProperties, ReactNode } from "react";
import s from "./kelas";

// Kemiringan kecil yang tetap untuk tiap foto, supaya tata letaknya
// terlihat seperti ditempel tangan tapi tidak berubah setiap dibuka.
export function kemiringan(i: number) {
  return (((i * 37) % 7) - 3) * 0.6;
}

export function SudutFoto() {
  return (
    <>
      <span className={`${s.sudut} ${s.sudutKiriAtas}`} aria-hidden />
      <span className={`${s.sudut} ${s.sudutKananAtas}`} aria-hidden />
      <span className={`${s.sudut} ${s.sudutKananBawah}`} aria-hidden />
      <span className={`${s.sudut} ${s.sudutKiriBawah}`} aria-hidden />
    </>
  );
}

type Props = {
  miring?: number;
  className?: string;
  children: ReactNode;
};

// Cetakan foto berbingkai putih dengan empat sudut foto.
export default function Cetak({ miring = 0, className = "", children }: Props) {
  return (
    <div className={`${s.cetak} ${className}`} style={{ "--r": `${miring}deg` } as CSSProperties}>
      <SudutFoto />
      <div className={s.bingkaiGambar}>{children}</div>
    </div>
  );
}
