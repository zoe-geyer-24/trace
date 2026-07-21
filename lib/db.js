"use client";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- AUTH ----------
export async function signUp(email, password, username, sensitivity) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  const uid = data.user?.id;
  if (uid) {
    const { error: pErr } = await supabase
      .from("profiles")
      .insert({ id: uid, username, sensitivity });
    if (pErr) return { error: pErr.message };
  }
  return { data };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { data };
}

export async function signOut() { await supabase.auth.signOut(); }

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getMyProfile() {
  const session = await getSession();
  if (!session) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  return data ? { ...data, email: session.user.email } : null;
}

// ---------- RESTAURANTS ----------
export async function getRestaurants() {
  const { data: rests } = await supabase.from("restaurants").select("*");
  const { data: scores } = await supabase.from("restaurant_scores").select("*");
  const map = {};
  (scores || []).forEach(s => { map[s.restaurant_id] = s; });
  return (rests || []).map(r => ({ ...r, scores: map[r.id] || null }));
}

export async function getRestaurant(id) {
  const { data: r } = await supabase.from("restaurants").select("*").eq("id", id).single();
  const { data: s } = await supabase.from("restaurant_scores").select("*").eq("restaurant_id", id).single();
  return r ? { ...r, scores: s || null } : null;
}

export async function addRestaurant(rec, userId) {
  const { data, error } = await supabase
    .from("restaurants")
    .insert({ ...rec, created_by: userId })
    .select()
    .single();
  return { data, error: error?.message };
}

// ---------- REVIEWS ----------
export async function getReviewsForRestaurant(rid) {
  const { data } = await supabase
    .from("reviews")
    .select("*, profiles(username, sensitivity)")
    .eq("restaurant_id", rid)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function getMyReview(rid, userId) {
  const { data } = await supabase
    .from("reviews").select("*").eq("restaurant_id", rid).eq("user_id", userId).maybeSingle();
  return data;
}

export async function upsertReview(rec) {
  const { error } = await supabase
    .from("reviews")
    .upsert(rec, { onConflict: "restaurant_id,user_id" });
  return { error: error?.message };
}

export async function deleteReview(rid, userId) {
  await supabase.from("reviews").delete().eq("restaurant_id", rid).eq("user_id", userId);
}

export async function getMyReviews(userId) {
  const { data } = await supabase
    .from("reviews").select("*, restaurants(name)").eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

// ---------- FOLLOWS ----------
export async function getFollowing(userId) {
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  return (data || []).map(f => f.following_id);
}
export async function getFollowerCount(userId) {
  const { count } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId);
  return count || 0;
}
export async function follow(follower, following) {
  await supabase.from("follows").insert({ follower_id: follower, following_id: following });
}
export async function unfollow(follower, following) {
  await supabase.from("follows").delete().eq("follower_id", follower).eq("following_id", following);
}
export async function getAllProfiles() {
  const { data } = await supabase.from("profiles").select("*");
  return data || [];
}
export async function getFeed(followingIds) {
  if (!followingIds.length) return [];
  const { data } = await supabase
    .from("reviews")
    .select("*, profiles(username), restaurants(name)")
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(40);
  return data || [];
}
export async function getReviewCountFor(userId) {
  const { count } = await supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", userId);
  return count || 0;
}

// ---------- LISTS ----------
export async function getMyLists(userId) {
  const { data } = await supabase.from("lists").select("*").eq("user_id", userId);
  const want = (data || []).filter(l => l.kind === "want").map(l => l.restaurant_id);
  const been = (data || []).filter(l => l.kind === "been").map(l => l.restaurant_id);
  return { want, been };
}
export async function toggleList(userId, rid, kind, currentlyOn) {
  if (currentlyOn) {
    await supabase.from("lists").delete().eq("user_id", userId).eq("restaurant_id", rid).eq("kind", kind);
  } else {
    await supabase.from("lists").insert({ user_id: userId, restaurant_id: rid, kind });
  }
}

// ---------- FOURSQUARE-BACKED RESTAURANTS ----------
export async function findOrCreateFromFoursquare(place) {
  const { data: existing } = await supabase
    .from("restaurants").select("*").eq("fsq_id", place.fsq_id).maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase.from("restaurants").insert({
    name: place.name,
    neighborhood: place.neighborhood || null,
    cuisine: null,
    lat: place.lat,
    lng: place.lng,
    fsq_id: place.fsq_id,
  }).select().single();
  if (error) return { error: error.message };
  return data;
}
// ---------- PHOTO UPLOAD ----------
export async function uploadReviewPhoto(file, userId) {
  const ext = file.name.split(".").pop();
  const path = userId + "/" + Date.now() + "." + ext;
  const { error } = await supabase.storage
    .from("review-photos")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from("review-photos").getPublicUrl(path);
  return { url: data.publicUrl };
}
// ---------- BROWSE CATEGORIES ----------
// Returns restaurants annotated with majority-vote safety flags.
export async function getRestaurantsWithFlags() {
  const rests = await getRestaurants();
  const ids = rests.map(r => r.id);
  if (!ids.length) return [];

  const { data: revs } = await supabase
    .from("reviews")
    .select("restaurant_id, dedicated_kitchen, dedicated_fryer, celiac_aware, created_at")
    .in("restaurant_id", ids);

  const tally = {};
  (revs || []).forEach(v => {
    const t = tally[v.restaurant_id] || (tally[v.restaurant_id] = { n: 0, k: 0, f: 0, c: 0, latest: 0 });
    t.n++;
    if (v.dedicated_kitchen) t.k++;
    if (v.dedicated_fryer) t.f++;
    if (v.celiac_aware) t.c++;
    const ts = new Date(v.created_at).getTime();
    if (ts > t.latest) t.latest = ts;
  });

  return rests.map(r => {
    const t = tally[r.id] || { n: 0, k: 0, f: 0, c: 0, latest: 0 };
    return {
      ...r,
      flags: {
        dedicatedKitchen: t.n > 0 && t.k > t.n / 2,
        dedicatedFryer: t.n > 0 && t.f > t.n / 2,
        celiacAware: t.n > 0 && t.c > t.n / 2,
      },
      lastReviewed: t.latest,
    };
  });
}
// ---------- PROFILE EDITING ----------
export async function uploadAvatar(file, userId) {
  const ext = file.name.split(".").pop();
  const path = userId + "/" + Date.now() + "." + ext;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function updateProfile(userId, fields) {
  const { error } = await supabase.from("profiles").update(fields).eq("id", userId);
  return { error: error?.message };
}

export async function getProfileByUsername(username) {
  const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
  return data;
}

export async function getPublicProfileData(userId) {
  const [listsRes, reviewCount, followerCount] = await Promise.all([
    supabase.from("lists").select("*, restaurants(id, name, neighborhood, cuisine)").eq("user_id", userId),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId)
  ]);
  const all = listsRes.data || [];
  return {
    want: all.filter(l => l.kind === "want").map(l => l.restaurants).filter(Boolean),
    been: all.filter(l => l.kind === "been").map(l => l.restaurants).filter(Boolean),
    reviewCount: reviewCount.count || 0,
    followerCount: followerCount.count || 0
  };
}
