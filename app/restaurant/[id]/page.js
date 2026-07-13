"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../../components/Header";
import { fmtAvg } from "../../../components/ui";
import {
  getRestaurant, getReviewsForRestaurant, getMyProfile,
  upsertReview, deleteReview, getMyLists, toggleList, getFollowing, follow, unfollow,
  uploadReviewPhoto
} from "../../../lib/db";

export default function RestaurantPage() {
  const { id } = useParams();
  const router = useRouter();
  const [rest, setRest] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [me, setMe] = useState(null);
  const [lists, setLists] = useState({ want: [], been: [] });
  const [following, setFollowing] = useState([]);
  const [showReview, setShowReview] = useState(false);

  async function load() {
    const r = await getRestaurant(id);
    setRest(r);
    setReviews(await getReviewsForRestaurant(id));
    const p = await getMyProfile(); setMe(p);
    if (p) { setLists(await getMyLists(p.id)); setFollowing(await getFollowing(p.id)); }
  }
  useEffect(() => { load(); }, [id]);

  if (!rest) return <div className="wrap"><Header /><div className="loading">Loading…</div></div>;

  const s = rest.scores || {};
  const n = s.review_count || 0;
  const ok = s.reacted_ok || 0, bad = s.reacted_bad || 0;
  const onWant = lists.want.includes(rest.id);
  const onBeen = lists.been.includes(rest.id);
  const myReview = me && reviews.find(r => r.user_id === me.id);

  const confidence = n === 0 ? "" : n < 3
    ? `based on only ${n} review${n !== 1 ? "s" : ""} — take with a grain of salt`
    : `averaged over ${n} reviews`;

  async function doToggleList(kind, on) { if (!me) return router.push("/login"); await toggleList(me.id, rest.id, kind, on); setLists(await getMyLists(me.id)); }
  async function doFollow(uid) {
    if (!me) return router.push("/login");
    if (following.includes(uid)) { await unfollow(me.id, uid); } else { await follow(me.id, uid); }
    setFollowing(await getFollowing(me.id));
  }

  return (
    <div className="wrap">
      <Header />
      <div className="view">
        <div className="back"><button className="btn-link" onClick={() => router.push("/")}>← Back</button></div>
        <div className="detail-head">
          <h2 className="detail-name">{rest.name}</h2>
          <div className="detail-meta">
            {[rest.neighborhood, rest.cuisine].filter(Boolean).map((m, i) => (
              <span key={i}>{i > 0 && <span className="dot">●</span>}{m}</span>))}
          </div>
          <div className="detail-scores">
            <div className="detail-score score-box"><div className="score-label">Overall</div>
              <div className={"score-num overall-num " + (s.avg_overall == null ? "none" : "")}>{fmtAvg(s.avg_overall)}{s.avg_overall != null && <span className="of">/10</span>}</div></div>
            <div className="detail-score score-box"><div className="score-label">GF Safety</div>
              <div className={"score-num gf-num " + (s.avg_gf == null ? "none" : "")}>{fmtAvg(s.avg_gf)}{s.avg_gf != null && <span className="of">/10</span>}</div></div>
            <div className="detail-score score-box"><div className="score-label">Reviews</div><div className="score-num" style={{ color: "var(--ink)" }}>{n}</div></div>
          </div>
          {(ok || bad) ? <div style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif", fontSize: 13, marginTop: 14 }}>
            {ok ? <span style={{ color: "var(--sage)", fontWeight: 700 }}>{ok} ate safely</span> : null}
            {ok && bad ? " · " : null}
            {bad ? <span style={{ color: "var(--alarm)", fontWeight: 700 }}>{bad} got glutened</span> : null}
          </div> : null}
          {confidence && <div style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif", fontSize: 12, color: "#8a7d6b", marginTop: 6 }}>{confidence}</div>}
          <div className="detail-actions">
            <button className="btn btn-sage" onClick={() => me ? setShowReview(true) : router.push("/login")}>{myReview ? "Edit my review" : "+ Rate this place"}</button>
            <button className="btn btn-ghost" onClick={() => doToggleList("want", onWant)}>{onWant ? "✓ On want-to-go" : "Want to go"}</button>
            <button className="btn btn-ghost" onClick={() => doToggleList("been", onBeen)}>{onBeen ? "✓ Been there" : "Mark been there"}</button>
          </div>
        </div>

        <div className="reviews-head">What celiacs are saying</div>
        {reviews.length === 0
          ? <div className="empty"><div className="big">No reviews yet.</div>Be the first to rate it.</div>
          : reviews.map(r => <ReviewCard key={r.id} r={r} me={me} following={following} onFollow={doFollow}
              onDelete={async () => { await deleteReview(rest.id, me.id); load(); }} />)}
      </div>

      {showReview && <ReviewModal rest={rest} me={me} existing={myReview}
        onClose={() => setShowReview(false)}
        onSaved={() => { setShowReview(false); load(); }} />}
    </div>
  );
}

function ReviewCard({ r, me, following, onFollow, onDelete }) {
  const tags = [];
  if (r.reaction === "ok") tags.push(["good", "✓ Ate safely, no reaction"]);
  if (r.reaction === "bad") tags.push(["bad", "⚠ Got glutened here"]);
  if (r.dedicated_kitchen) tags.push(["good", "✓ Dedicated GF kitchen"]);
  if (r.dedicated_fryer) tags.push(["good", "✓ Dedicated fryer"]);
  if (r.shared_fryer) tags.push(["bad", "⚠ Shared fryer"]);
  if (r.gf_menu) tags.push(["neutral", "GF menu"]);
  if (r.celiac_aware) tags.push(["good", "Celiac-aware staff"]);
  if (r.staff_unsure) tags.push(["bad", "⚠ Staff unsure — didn't feel safe"]);
  const prof = r.profiles || {};
  const mine = me && me.id === r.user_id;
  const amFollowing = following.includes(r.user_id);

  return (
    <div className="review">
      <div className="review-top">
        <div className="reviewer">
          <div className="name">{prof.username || "user"}
            {!mine && me && <button className={"follow-mini " + (amFollowing ? "on" : "")} onClick={() => onFollow(r.user_id)}>{amFollowing ? "Following" : "Follow"}</button>}
          </div>
          {prof.sensitivity && <div className="sens">{prof.sensitivity}</div>}
        </div>
        <div className="review-scores">
          <div className="score-box"><div className="score-label">Overall</div><div className="score-num overall-num">{r.overall}<span className="of">/10</span></div></div>
          <div className="score-box"><div className="score-label">GF Safety</div><div className="score-num gf-num">{r.gf_safety}<span className="of">/10</span></div></div>
        </div>
      </div>
      {tags.length > 0 && <div className="safety-tags">{tags.map((t, i) => <span key={i} className={"tag " + t[0]}>{t[1]}</span>)}</div>}
      {r.ordered && <div className="ordered"><span className="lbl">Ordered</span>{r.ordered}</div>}
      {r.body && <div className="review-body">{r.body}</div>}
      {r.photo_url && <img className="rev-photo" src={r.photo_url} alt="" onError={e => e.target.style.display = "none"} />}
      <div className="review-foot">
        <span>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        {mine && <button className="del" onClick={onDelete}>Delete mine</button>}
      </div>
    </div>
  );
}

function ReviewModal({ rest, me, existing, onClose, onSaved }) {
  const [overall, setOverall] = useState(existing?.overall ?? 8);
  const [gf, setGf] = useState(existing?.gf_safety ?? 8);
  const [reaction, setReaction] = useState(existing?.reaction ?? "");
  const [ordered, setOrdered] = useState(existing?.ordered ?? "");
  const [photoUrl, setPhotoUrl] = useState(existing?.photo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [body, setBody] = useState(existing?.body ?? "");
  const [flags, setFlags] = useState({
    dedicated_kitchen: existing?.dedicated_kitchen ?? false,
    dedicated_fryer: existing?.dedicated_fryer ?? false,
    shared_fryer: existing?.shared_fryer ?? false,
    gf_menu: existing?.gf_menu ?? false,
    celiac_aware: existing?.celiac_aware ?? false,
    staff_unsure: existing?.staff_unsure ?? false,
  });
  const [err, setErr] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr("");
    const res = await uploadReviewPhoto(file, me.id);
    setUploading(false);
    if (res.error) { setErr("Photo upload failed: " + res.error); return; }
    setPhotoUrl(res.url);
  }

  async function save() {
    const rec = {
      restaurant_id: rest.id, user_id: me.id,
      overall: parseInt(overall), gf_safety: parseInt(gf),
      reaction: reaction || null, ordered: ordered.trim(), photo_url: photoUrl || null, body: body.trim(),
      ...flags
    };
    const { error } = await upsertReview(rec);
    if (error) { setErr(error); return; }
    onSaved();
  }
  const setReact = v => setReaction(reaction === v ? "" : v);
  const toggle = k => setFlags({ ...flags, [k]: !flags[k] });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{existing ? "Edit your review" : "Rate this place"}</h2>
        <div className="hint">Be specific about cross-contamination — that's what other celiacs are here for.</div>
        <div className="row">
          <div className="field"><label>Overall (0–10)</label>
            <select value={overall} onChange={e => setOverall(e.target.value)}>{[...Array(11)].map((_, i) => <option key={i} value={10 - i}>{10 - i}</option>)}</select></div>
          <div className="field"><label>GF safety (0–10)</label>
            <select value={gf} onChange={e => setGf(e.target.value)}>{[...Array(11)].map((_, i) => <option key={i} value={10 - i}>{10 - i}</option>)}</select></div>
        </div>
        <div className="field">
          <label>Did you get sick?</label>
          <div className="reaction-pick">
            <button type="button" className={reaction === "ok" ? "on-ok" : ""} onClick={() => setReact("ok")}>No reaction — I was fine</button>
            <button type="button" className={reaction === "bad" ? "on-bad" : ""} onClick={() => setReact("bad")}>I got glutened</button>
          </div>
          <div className="sub">Optional, but the most useful thing you can tell another celiac.</div>
        </div>
        <div className="field"><label>What I ordered</label><input value={ordered} onChange={e => setOrdered(e.target.value)} placeholder="e.g. Cacio e pepe + the fritto misto" /></div>
        <div className="field">
          <label>Photo (optional)</label>
          <input type="file" accept="image/*" onChange={handleFile} />
          {uploading && <div className="sub">Uploading…</div>}
          {photoUrl && !uploading && (
            <div style={{ marginTop: 10 }}>
              <img src={photoUrl} alt="" style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 3, border: "1px solid var(--rule)", display: "block" }} />
              <button className="btn-link" style={{ marginTop: 6 }} onClick={() => setPhotoUrl("")}>Remove photo</button>
            </div>
          )}
        </div>
        <div className="field">
          <label>Safety facts (optional)</label>
          <div className="checks">
            <label className="check"><input type="checkbox" checked={flags.dedicated_kitchen} onChange={() => toggle("dedicated_kitchen")} /> 100% dedicated gluten-free kitchen</label>
            <label className="check"><input type="checkbox" checked={flags.dedicated_fryer} onChange={() => toggle("dedicated_fryer")} /> Dedicated fryer (no shared oil)</label>
            <label className="check"><input type="checkbox" checked={flags.shared_fryer} onChange={() => toggle("shared_fryer")} /> Shared fryer — fried items not safe</label>
            <label className="check"><input type="checkbox" checked={flags.gf_menu} onChange={() => toggle("gf_menu")} /> Marked GF menu</label>
            <label className="check"><input type="checkbox" checked={flags.celiac_aware} onChange={() => toggle("celiac_aware")} /> Staff knew their stuff about celiac</label>
            <label className="check"><input type="checkbox" checked={flags.staff_unsure} onChange={() => toggle("staff_unsure")} /> Staff were unsure about celiac — didn't feel safe eating there</label>
          </div>
        </div>
        <div className="field"><label>Your review</label><textarea value={body} onChange={e => setBody(e.target.value)} placeholder="How careful were they? Did you react? Would you go back?" /></div>
        {err && <div className="err">{err}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-sage" onClick={save} disabled={uploading}>Post review</button>
        </div>
      </div>
    </div>
  );
}
