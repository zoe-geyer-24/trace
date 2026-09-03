"use client";
import { getSession } from "./db";

// Client helpers for reporting content and blocking users.
// Blocked IDs are cached per tab so pages can filter synchronously after the first load.

let cache = { uid: null, ids: null };

async function call(body) {
  const session = await getSession();
  const headers = { "Content-Type": "application/json" };
  if (session) headers.Authorization = "Bearer " + session.access_token;
  const res = await fetch("/api/moderation", { method: "POST", headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export const REPORT_REASONS = [
  ["spam", "Spam or advertising"],
  ["harassment", "Harassment, hate, or bullying"],
  ["unsafe-info", "False or dangerous gluten-safety information"],
  ["inappropriate", "Inappropriate photo or language"],
  ["other", "Something else"],
];

export async function reportContent({ targetType, targetId, targetUserId, targetLabel, reason, details }) {
  return call({
    action: "report", targetType, targetId, targetUserId, targetLabel, reason, details,
    contextUrl: typeof window !== "undefined" ? window.location.href : "",
  });
}

// Returns the list of user IDs the signed-in user has blocked ([] when signed out).
export async function getBlockedIds() {
  const session = await getSession();
  if (!session) { cache = { uid: null, ids: null }; return []; }
  if (cache.uid === session.user.id && cache.ids) return cache.ids;
  try {
    const { blocked } = await call({ action: "blocks" });
    cache = { uid: session.user.id, ids: blocked || [] };
  } catch {
    cache = { uid: session.user.id, ids: [] };
  }
  return cache.ids;
}

export async function blockUser(userId) {
  const { blocked } = await call({ action: "block", userId });
  cache.ids = blocked; return blocked;
}

export async function unblockUser(userId) {
  const { blocked } = await call({ action: "unblock", userId });
  cache.ids = blocked; return blocked;
}

export function filterBlocked(rows, blockedIds, key = "user_id") {
  if (!blockedIds?.length) return rows;
  const set = new Set(blockedIds);
  return rows.filter(r => !set.has(r[key]));
}
