import { getUserId, handle, readJson } from "@/lib/api";
import { ApiError, createUpload, media, removeMedia } from "@/lib/keychain-service";
import type { MediaKind } from "@/lib/packages";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/keychains/:id/media — daftar file (URL berlaku 1 jam)
export const GET = handle<Ctx>(async (req, { params }) => {
  const userId = await getUserId(req);
  return media(userId, (await params).id);
});

// POST /api/keychains/:id/media  { kind: "photo"|"voice"|"video", size: <byte>, ext: "jpg" }
// → { path, token, signedUrl }. Lalu upload file: PUT ke signedUrl dengan body = isi file.
export const POST = handle<Ctx>(async (req, { params }) => {
  const userId = await getUserId(req);
  const { kind, size, ext } = await readJson<{ kind?: MediaKind; size?: number; ext?: string }>(req);
  if (!kind || !size || !ext) throw new ApiError(400, "kind, size, dan ext wajib diisi");
  return createUpload(userId, (await params).id, kind, Number(size), ext);
});

// DELETE /api/keychains/:id/media?path=<path>
export const DELETE = handle<Ctx>(async (req, { params }) => {
  const userId = await getUserId(req);
  const path = new URL(req.url).searchParams.get("path") ?? "";
  await removeMedia(userId, (await params).id, path);
  return { deleted: path };
});
