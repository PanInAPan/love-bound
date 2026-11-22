import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/keychain-service";

// Login: cookie sesi (browser) atau header "Authorization: Bearer <access_token Supabase>" (HP/Postman).
export async function getUserId(req: Request): Promise<string> {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const { data, error } = await createAdminClient().auth.getUser(auth.slice(7).trim());
    if (error || !data.user) throw new ApiError(401, "Token tidak valid atau kedaluwarsa");
    return data.user.id;
  }
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) throw new ApiError(401, "Harus login");
  return user.id;
}

export async function readJson<T>(req: Request): Promise<T> {
  try { return (await req.json()) as T; } catch { throw new ApiError(400, "Body harus JSON"); }
}

export function handle<C>(fn: (req: Request, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C) => {
    try {
      const data = await fn(req, ctx);
      return NextResponse.json({ data });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 500;
      if (status === 500) console.error(e);
      return NextResponse.json({ error: (e as Error).message }, { status });
    }
  };
}
