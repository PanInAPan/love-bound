"use server";

import { createClient } from "@/lib/supabase/server";
import * as svc from "@/lib/keychain-service";
import type { MediaKind } from "@/lib/packages";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function withUser<T>(fn: (userId: string) => Promise<T>): Promise<Result<T>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Harus login" };
    return { ok: true, data: await fn(user.id) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function claimKeychain(id: string, token: string) {
  return withUser((u) => svc.claim(u, id, token));
}
export async function getMedia(id: string) {
  return withUser((u) => svc.media(u, id));
}
export async function createUpload(id: string, kind: MediaKind, size: number, ext: string) {
  return withUser((u) => svc.createUpload(u, id, kind, size, ext));
}
export async function deleteMedia(id: string, path: string) {
  return withUser(async (u) => { await svc.removeMedia(u, id, path); return true; });
}
export async function saveKeychain(id: string, f: svc.KeychainInput) {
  return withUser((u) => svc.save(u, id, f));
}
