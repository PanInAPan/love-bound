import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-rose-50 px-6 text-center">
      <h1 className="text-3xl font-semibold text-rose-900">LoveBound</h1>
      <p className="mt-3 max-w-md text-neutral-600">Tempelkan keychain ke HP untuk membuka kenangan. Punya keychain baru? Isi foto, voice note, dan pesanmu di sini.</p>
      <Link href="/dashboard" className="mt-8 rounded-xl bg-rose-600 px-6 py-3 font-medium text-white">Isi keychain saya</Link>
    </main>
  );
}
