import { cookies } from "next/headers";
import { z } from "zod";
import { db, check } from "@/lib/db";
import {
  requireOrigin,
  readBody,
  limit,
  errorResponse,
  HttpError,
} from "@/lib/security";
export async function POST(request: Request) {
  try {
    requireOrigin(request);
    const { email, password } = z
      .object({
        email: z.string().email().max(254),
        password: z.string().min(8).max(256),
      })
      .parse(await readBody(request));
    await limit("login-email:" + email.toLowerCase(), 5, 900);
    await limit(
      "login-ip:" + (request.headers.get("x-vercel-forwarded-for") || "local"),
      15,
      900,
    );
    const client = db();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) throw new HttpError(401, "Sign-in failed");
    // signInWithPassword attaches the user's JWT to its client. Use a fresh
    // server client for the allowlist, which is intentionally private to users.
    const allowed = await db()
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    check(allowed.error);
    if (!allowed.data)
      throw new HttpError(403, "Administrator access required");
    (await cookies()).set("nm_admin", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: Math.min(data.session.expires_in, 3600),
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    requireOrigin(request);
    (await cookies()).delete("nm_admin");
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
