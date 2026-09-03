import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "../../../lib/config";

// Community moderation: content reports and per-user blocks.
// Stored as JSON objects in a private Supabase Storage bucket ("moderation")
// so no schema changes are needed. Requires SUPABASE_SERVICE_ROLE_KEY.
//
//   reports/<timestamp>-<id>.json   one file per report (reviewed by the team)
//   blocks/<userId>.json            { blocked: [userId, ...] }

const BUCKET = "moderation";
const REASONS = ["spam", "harassment", "unsafe-info", "inappropriate", "other"];

function admin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function ensureBucket(db) {
  const { data } = await db.storage.listBuckets();
  if (!(data || []).some(b => b.name === BUCKET)) {
    await db.storage.createBucket(BUCKET, { public: false });
  }
}

async function readJson(db, path, fallback) {
  const { data, error } = await db.storage.from(BUCKET).download(path);
  if (error || !data) return fallback;
  try { return JSON.parse(await data.text()); } catch { return fallback; }
}

async function writeJson(db, path, obj) {
  const body = Buffer.from(JSON.stringify(obj, null, 2));
  const { error } = await db.storage.from(BUCKET).upload(path, body, { contentType: "application/json", upsert: true });
  if (error) throw new Error(error.message);
}

async function userFromRequest(db, request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data?.user || null;
}

const clip = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");

export async function POST(request) {
  const db = admin();
  if (!db) return Response.json({ error: "Moderation isn't configured yet." }, { status: 501 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Bad request." }, { status: 400 }); }
  const action = body?.action;

  try {
    await ensureBucket(db);
    const user = await userFromRequest(db, request);

    if (action === "report") {
      const targetType = body.targetType === "user" ? "user" : body.targetType === "review" ? "review" : null;
      if (!targetType || !body.targetId) return Response.json({ error: "Missing target." }, { status: 400 });
      const reason = REASONS.includes(body.reason) ? body.reason : "other";
      const now = new Date();
      const id = now.toISOString().replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 8);
      await writeJson(db, `reports/${id}.json`, {
        id,
        created_at: now.toISOString(),
        status: "open",
        target_type: targetType,
        target_id: String(body.targetId),
        target_user_id: clip(body.targetUserId, 64) || null,
        target_label: clip(body.targetLabel, 200),
        reason,
        details: clip(body.details, 1000),
        context_url: clip(body.contextUrl, 300),
        reporter_id: user?.id || null,
        reporter_email: user?.email || null,
      });
      return Response.json({ ok: true, id });
    }

    if (!user) return Response.json({ error: "Sign in to block people." }, { status: 401 });
    const path = `blocks/${user.id}.json`;

    if (action === "blocks") {
      const cur = await readJson(db, path, { blocked: [] });
      return Response.json({ blocked: cur.blocked || [] });
    }

    if (action === "block" || action === "unblock") {
      const target = clip(body.userId, 64);
      if (!target) return Response.json({ error: "Missing user." }, { status: 400 });
      if (target === user.id) return Response.json({ error: "You can't block yourself." }, { status: 400 });
      const cur = await readJson(db, path, { blocked: [] });
      const set = new Set(cur.blocked || []);
      if (action === "block") set.add(target); else set.delete(target);
      await writeJson(db, path, { blocked: [...set], updated_at: new Date().toISOString() });
      return Response.json({ ok: true, blocked: [...set] });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}
