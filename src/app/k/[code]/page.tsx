import { notFound } from "next/navigation";
import { publicView } from "@/lib/keychain-service";
import Slideshow from "./Slideshow";

export const dynamic = "force-dynamic";

// Halaman publik yang dibuka dari chip NFC — tidak perlu login.
export default async function KeychainPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const view = await publicView(code);
  if (!view) notFound();
  return <Slideshow data={view} />;
}
