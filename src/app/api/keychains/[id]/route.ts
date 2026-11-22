import { getUserId, handle, readJson } from "@/lib/api";
import { getOwned, media, save, type KeychainInput } from "@/lib/keychain-service";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/keychains/:id — detail keychain + media (pemilik saja)
export const GET = handle<Ctx>(async (req, { params }) => {
  const userId = await getUserId(req);
  const { id } = await params;
  const keychain = await getOwned(userId, id);
  return { ...keychain, media: await media(userId, id) };
});

// PUT /api/keychains/:id  { judul, untuk, pesan, link_lagu, buka_pada } — simpan (memakai 1 jatah ubah setelah dikirim)
export const PUT = handle<Ctx>(async (req, { params }) => {
  const userId = await getUserId(req);
  const { id } = await params;
  return save(userId, id, await readJson<KeychainInput>(req));
});
