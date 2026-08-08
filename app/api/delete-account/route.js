import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../../../lib/config";

// Deletes the signed-in user's account and all their data.
// Requires SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API) set as an
// env var in Vercel — the anon key can't delete auth users.
export async function POST(request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return Response.json(
      { error: "Account deletion isn't configured yet. Email us and we'll delete your account manually." },
      { status: 501 }
    );
  }

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Not signed in." }, { status: 401 });

  const admin = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return Response.json({ error: "Not signed in." }, { status: 401 });
  const uid = userData.user.id;

  await admin.from("reviews").delete().eq("user_id", uid);
  await admin.from("lists").delete().eq("user_id", uid);
  await admin.from("follows").delete().eq("follower_id", uid);
  await admin.from("follows").delete().eq("following_id", uid);

  for (const bucket of ["avatars", "review-photos"]) {
    const { data: files } = await admin.storage.from(bucket).list(uid);
    if (files?.length) {
      await admin.storage.from(bucket).remove(files.map(f => uid + "/" + f.name));
    }
  }

  await admin.from("profiles").delete().eq("id", uid);

  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

  return Response.json({ ok: true });
}
