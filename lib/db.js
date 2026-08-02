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
let dPrice = place.price != null ? place.price : null;
  let dCuisine = null;
  try {
    const dres = await fetch("/api/details?id=" + encodeURIComponent(place.fsq_id));
    const dd = await dres.json();
    if (dd && !dd.error) {
      if (dd.price != null) dPrice = dd.price;
      if (dd.cuisine) dCuisine = dd.cuisine;
    }
  } catch {}

  const { data, error } = await supabase.from("restaurants").insert({
    name: place.name,
    neighborhood: place.neighborhood || null,
    cuisine: dCuisine,
    lat: place.lat,
    lng: place.lng,
    fsq_id: place.fsq_id,
    price: dPrice,
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
// ---------- RECOMMENDATION ALGORITHM ----------
export async function getRecommendations(userId, allRests) {
  const { data: myReviews } = await supabase
    .from("reviews")
    .select("*, restaurants(cuisine, neighborhood)")
    .eq("user_id", userId);

  const reviews = myReviews || [];
  const reviewedIds = new Set(reviews.map(r => r.restaurant_id));
  const liked = reviews.filter(r => r.overall >= 7 || r.gf_safety >= 7);

  if (liked.length < 2) {
    const pool = allRests
      .filter(r => r.scores && r.scores.review_count > 0 && !reviewedIds.has(r.id))
      .sort((a, b) => (b.scores.avg_gf ?? -1) - (a.scores.avg_gf ?? -1));
    return { mode: "popular", items: pool.slice(0, 5) };
  }

  const cuisineScore = {}, neighborhoodScore = {};
  let dedKitchen = 0, dedFryer = 0, celiacAware = 0, gfMenu = 0, n = 0;
  liked.forEach(r => {
    const weight = ((r.overall || 0) + (r.gf_safety || 0)) / 2;
    const cuisine = r.restaurants?.cuisine, hood = r.restaurants?.neighborhood;
    if (cuisine) cuisineScore[cuisine] = (cuisineScore[cuisine] || 0) + weight;
    if (hood) neighborhoodScore[hood] = (neighborhoodScore[hood] || 0) + weight;
    if (r.dedicated_kitchen) dedKitchen++;
    if (r.dedicated_fryer) dedFryer++;
    if (r.celiac_aware) celiacAware++;
    if (r.gf_menu) gfMenu++;
    n++;
  });
  const valueKitchen = dedKitchen / n, valueFryer = dedFryer / n, valueCeliac = celiacAware / n, valueMenu = gfMenu / n;
  const maxCuisine = Math.max(1, ...Object.values(cuisineScore));
  const maxHood = Math.max(1, ...Object.values(neighborhoodScore));

  const candidates = allRests.filter(r => !reviewedIds.has(r.id));
  const scored = [];
  for (const r of candidates) {
    let score = 0;
    if (r.cuisine && cuisineScore[r.cuisine]) score += 40 * (cuisineScore[r.cuisine] / maxCuisine);
    if (r.neighborhood && neighborhoodScore[r.neighborhood]) score += 15 * (neighborhoodScore[r.neighborhood] / maxHood);
    if (r.scores && r.scores.avg_gf != null) score += 30 * (r.scores.avg_gf / 10);
    if (r.scores && r.scores.review_count) score += Math.min(5, r.scores.review_count);
    if (r.scores && r.scores.reacted_bad) score -= 8 * r.scores.reacted_bad;
    scored.push({ ...r, _score: score });
  }

  const candIds = scored.map(r => r.id);
  if (candIds.length) {
    const { data: allRev } = await supabase
      .from("reviews")
      .select("restaurant_id, dedicated_kitchen, dedicated_fryer, celiac_aware, gf_menu")
      .in("restaurant_id", candIds);
    const flags = {};
    (allRev || []).forEach(v => {
      const f = flags[v.restaurant_id] || (flags[v.restaurant_id] = {});
      if (v.dedicated_kitchen) f.k = true;
      if (v.dedicated_fryer) f.fr = true;
      if (v.celiac_aware) f.c = true;
      if (v.gf_menu) f.m = true;
    });
    scored.forEach(r => {
      const f = flags[r.id] || {};
      if (f.k) r._score += 10 * valueKitchen;
      if (f.fr) r._score += 10 * valueFryer;
      if (f.c) r._score += 6 * valueCeliac;
      if (f.m) r._score += 4 * valueMenu;
    });
  }

  const items = scored.filter(r => r._score > 0).sort((a, b) => b._score - a._score).slice(0, 5);
  const topCuisine = Object.entries(cuisineScore).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return { mode: "personalized", items, topCuisine };
}
// ---------- OVERALL COMPARISON-RANKING ENGINE ----------
// Overall scores come from your personal ranking, banded by sentiment:
// Liked it -> 7.0-10, It was fine -> 4.0-6.9, Disliked it -> 0-3.9.
// Within each band, higher in your order = higher score.

const BANDS = { liked: [7.0, 10.0], fine: [4.0, 6.9], disliked: [0.0, 3.9] };

// Fetch your reviewed places in ranked order (best first).
export async function getMyRankedList(userId) {
  const { data } = await supabase
    .from("reviews")
    .select("restaurant_id, overall, gf_safety, rank_position, sentiment, restaurants(id, name, neighborhood, cuisine)")
    .eq("user_id", userId);
  return (data || [])
    .filter(r => r.restaurants)
    .map(r => ({
      restaurant_id: r.restaurant_id,
      id: r.restaurants.id,
      name: r.restaurants.name,
      neighborhood: r.restaurants.neighborhood,
      cuisine: r.restaurants.cuisine,
      overall: r.overall,
      gf_safety: r.gf_safety,
      sentiment: r.sentiment,
      rank_position: r.rank_position
    }))
    .sort((a, b) => (a.rank_position ?? 999) - (b.rank_position ?? 999));
}

// Compute a 0-10 score for a place given its 0-based index within its
// sentiment group and that group's size.
export function bandScore(sentiment, indexInGroup, groupSize) {
  const [lo, hi] = BANDS[sentiment] || BANDS.fine;
  if (groupSize <= 1) return Math.round(hi * 10) / 10;
  const s = hi - (indexInGroup * (hi - lo)) / (groupSize - 1);
  return Math.round(s * 10) / 10;
}

// Save a full ordering. `ordered` is an array of { restaurant_id, sentiment }
// sorted best-first across all groups. We compute each place's score from its
// position WITHIN its sentiment band, and store rank_position as global order.
export async function saveRanking(userId, ordered) {
  const groupSizes = { liked: 0, fine: 0, disliked: 0 };
  ordered.forEach(o => { groupSizes[o.sentiment] = (groupSizes[o.sentiment] || 0) + 1; });
  const groupIndex = { liked: 0, fine: 0, disliked: 0 };

  const updates = ordered.map((o, globalPos) => {
    const idx = groupIndex[o.sentiment]++;
    const score = bandScore(o.sentiment, idx, groupSizes[o.sentiment]);
    return supabase
      .from("reviews")
      .update({ rank_position: globalPos + 1, overall: score })
      .eq("user_id", userId)
      .eq("restaurant_id", o.restaurant_id);
  });
  await Promise.all(updates);
  return { ok: true };
}
// ---------- MY REVIEWED PLACES (for account "Been there") ----------
export async function getMyReviewedPlaces(userId) {
  const { data } = await supabase
    .from("reviews")
    .select("overall, gf_safety, sentiment, restaurant_id, restaurants(id, name, neighborhood, cuisine)")
    .eq("user_id", userId);
  return (data || [])
    .filter(r => r.restaurants)
    .map(r => ({
      id: r.restaurants.id,
      name: r.restaurants.name,
      neighborhood: r.restaurants.neighborhood,
      cuisine: r.restaurants.cuisine,
      myOverall: r.overall,
      myGf: r.gf_safety,
      sentiment: r.sentiment
    }));
}
// ---------- BROWSE PEOPLE ----------
export async function getPeople() {
  const { data: profiles } = await supabase.from("profiles").select("id, username, sensitivity, avatar_url, bio");
  const { data: reviews } = await supabase.from("reviews").select("user_id");
  const counts = {};
  (reviews || []).forEach(r => { counts[r.user_id] = (counts[r.user_id] || 0) + 1; });
  return (profiles || [])
    .map(p => ({ ...p, reviewCount: counts[p.id] || 0 }))
    .sort((a, b) => b.reviewCount - a.reviewCount);
}
// ---------- FRIENDS' RECS (places people you follow rated highly) ----------
export async function getFriendsRecs(userId) {
  const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  const ids = (follows || []).map(f => f.following_id);
  if (!ids.length) return [];
  const { data: revs } = await supabase
    .from("reviews")
    .select("restaurant_id, overall, gf_safety, profiles(username), restaurants(id, name, neighborhood, cuisine)")
    .in("user_id", ids)
    .or("overall.gte.7,gf_safety.gte.7");
  const seen = {};
  (revs || []).forEach(r => {
    if (!r.restaurants) return;
    const rid = r.restaurants.id;
    if (!seen[rid]) {
      seen[rid] = {
        id: rid, name: r.restaurants.name, neighborhood: r.restaurants.neighborhood,
        cuisine: r.restaurants.cuisine, by: [], bestOverall: r.overall, bestGf: r.gf_safety
      };
    }
    const who = r.profiles?.username;
    if (who && !seen[rid].by.includes(who)) seen[rid].by.push(who);
    seen[rid].bestOverall = Math.max(seen[rid].bestOverall, r.overall || 0);
    seen[rid].bestGf = Math.max(seen[rid].bestGf, r.gf_safety || 0);
  });
  return Object.values(seen).sort((a, b) => b.bestGf - a.bestGf);
}
// ---------- GLUTEN-FRIENDLY (avg GF safety >= 8, with safety flags) ----------
export async function getGlutenFriendly() {
  const rests = await getRestaurants();
  const qualifying = rests.filter(r => r.scores && r.scores.review_count > 0 && (r.scores.avg_gf ?? 0) >= 8);
  const ids = qualifying.map(r => r.id);
  if (!ids.length) return [];
  const { data: revs } = await supabase
    .from("reviews")
    .select("restaurant_id, dedicated_kitchen, dedicated_fryer, celiac_aware, gf_menu")
    .in("restaurant_id", ids);
  const tally = {};
  (revs || []).forEach(v => {
    const t = tally[v.restaurant_id] || (tally[v.restaurant_id] = { n: 0, k: 0, f: 0, c: 0, m: 0 });
    t.n++;
    if (v.dedicated_kitchen) t.k++;
    if (v.dedicated_fryer) t.f++;
    if (v.celiac_aware) t.c++;
    if (v.gf_menu) t.m++;
  });
  return qualifying
    .map(r => {
      const t = tally[r.id] || { n: 0, k: 0, f: 0, c: 0, m: 0 };
      const features = [];
      if (t.n > 0 && t.k > t.n / 2) features.push("Dedicated GF kitchen");
      if (t.n > 0 && t.f > t.n / 2) features.push("Dedicated fryer");
      if (t.n > 0 && t.m > t.n / 2) features.push("GF menu");
      if (t.n > 0 && t.c > t.n / 2) features.push("Celiac-aware staff");
      return { ...r, features };
    })
    .sort((a, b) => (b.scores.avg_gf ?? 0) - (a.scores.avg_gf ?? 0));
}
