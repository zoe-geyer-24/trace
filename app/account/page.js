"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { fmtAvg } from "../../components/ui";
import {
  getMyProfile, getMyLists, getFollowing, getFollowerCount,
  getRestaurants, uploadAvatar, updateProfile, getMyReviewedPlaces,
  deleteMyAccount
} from "../../lib/db";

const SENSITIVITIES = [
  "Celiac disease", "Non-celiac gluten sensitivity", "Wheat allergy",
  "Gluten ataxia", "Dermatitis herpetiformis", "Avoiding by choice"
];

export default function AccountPage() {
  const [me, setMe] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [reviewed, setReviewed] = useState([]);
  const [wantIds, setWantIds] = useState([]);
  const [followingN, setFollowingN] = useState(0);
  const [followerN, setFollowerN] = useState(0);
  const [rests, setRests] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [beenTab, setBeenTab] = useState("overall");
  const router = useRouter();

  async function load() {
    const p = await getMyProfile(); setMe(p); setLoaded(true);
    if (!p) return;
    setReviewed(await getMyReviewedPlaces(p.id));
    const lists = await getMyLists(p.id);
    setWantIds(lists.want);
    setFollowingN((await getFollowing(p.id)).length);
    setFollowerN(await getFollowerCount(p.id));
    setRests(await getRestaurants());
  }
  useEffect(() => { load(); }, []);

  function shareProfile() {
    const url = window.location.origin + "/u/" + encodeURIComponent(me.username);
    if (navigator.share) {
      navigator.share({ title: "My Trace profile", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setShareMsg("Link copied!");
        setTimeout(() => setShareMsg(""), 2500);
      });
    }
  }

  if (loaded && !me) return (
    <div className="wrap"><Header />
      <div className="empty"><div className="big">You're not signed in.</div>Create an account to rate places and build your lists.<br /><br />
        <button className="btn btn-sage" onClick={() => router.push("/login")}>Create account</button></div>
    </div>
  );
  if (!me) return <div className="wrap"><Header /><div className="loading">Loading…</div></div>;

  const byId = id => rests.find(r => r.id === id);
  const wantPlaces = wantIds.map(byId).filter(Boolean);

  const byOverall = reviewed.slice().sort((a, b) => b.myOverall - a.myOverall);
  const safe = reviewed.filter(r => r.myGf >= 8).sort((a, b) => b.myGf - a.myGf);
  const okay = reviewed.filter(r => r.myGf >= 5 && r.myGf < 8).sort((a, b) => b.myGf - a.myGf);
  const unsafe = reviewed.filter(r => r.myGf < 5).sort((a, b) => b.myGf - a.myGf);

  const PlaceRow = ({ r, rank }) => (
    <div className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {rank != null && <div className="rank-badge">{rank}</div>}
        <div>
          <h3 className="rcard-name" style={{ fontSize: 19 }}>{r.name}</h3>
          <div className="rcard-meta">{[r.neighborhood, r.cuisine].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      <div className="rcard-scores">
        <div className="score-box"><div className="score-label">Your Overall</div><div className="score-num overall-num" style={{ fontSize: 20 }}>{r.myOverall}</div></div>
        <div className="score-box"><div className="score-label">Your GF</div><div className="score-num gf-num" style={{ fontSize: 20 }}>{r.myGf}</div></div>
      </div>
    </div>
  );

  const SafetyGroup = ({ title, cls, items }) => (
    <div style={{ marginBottom: 26 }}>
      <div className={"safety-group-head " + cls}>{title}<span className="safety-group-count">{items.length}</span></div>
      {items.length
        ? <div className="rlist">{items.map(r => <PlaceRow key={r.id} r={r} />)}</div>
        : <div className="list-empty">None yet.</div>}
    </div>
  );

  const WantCard = ({ r }) => (
    <div className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
      <div><h3 className="rcard-name" style={{ fontSize: 19 }}>{r.name}</h3>
        <div className="rcard-meta">{[r.neighborhood, r.cuisine].filter(Boolean).join(" · ")}</div></div>
      <div className="rcard-scores">
        <div className="score-box"><div className="score-label">Overall</div><div className={"score-num overall-num " + (r.scores?.avg_overall == null ? "none" : "")} style={{ fontSize: 20 }}>{fmtAvg(r.scores?.avg_overall)}</div></div>
        <div className="score-box"><div className="score-label">GF Safety</div><div className={"score-num gf-num " + (r.scores?.avg_gf == null ? "none" : "")} style={{ fontSize: 20 }}>{fmtAvg(r.scores?.avg_gf)}</div></div>
      </div>
    </div>
  );

  return (
    <div className="wrap">
      <Header />
      <div className="view">

        <div className="pcard">
          <div className="pcard-top">
            {me.avatar_url
              ? <img className="pavatar" src={me.avatar_url} alt="" />
              : <div className="pavatar pavatar-ph">{me.username.charAt(0).toUpperCase()}</div>}
            <div className="pcard-id">
              <h2 className="pname">{me.username}</h2>
              <span className="psens-pill">{me.sensitivity}</span>
              {me.bio && <div className="pbio">{me.bio}</div>}
            </div>
          </div>
          <div className="pcard-actions">
            <button className="pbtn" onClick={() => setShowEdit(true)}>✎ Edit profile</button>
            <button className="pbtn" onClick={shareProfile}>↗ Share profile</button>
            {shareMsg && <span className="share-msg">{shareMsg}</span>}
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-tile"><div className="stat-num">{reviewed.length}</div><div className="stat-lbl">Rated</div></div>
          <div className="stat-tile"><div className="stat-num">{safe.length}</div><div className="stat-lbl">Felt safe</div></div>
          <div className="stat-tile"><div className="stat-num">{wantPlaces.length}</div><div className="stat-lbl">Want</div></div>
          <div className="stat-tile"><div className="stat-num">{followingN}</div><div className="stat-lbl">Following</div></div>
          <div className="stat-tile"><div className="stat-num">{followerN}</div><div className="stat-lbl">Followers</div></div>
        </div>

        <div className="section-title">Been there</div>
        <div className="map-toggle" style={{ marginBottom: 20 }}>
          <button className={"overall " + (beenTab === "overall" ? "on" : "")} onClick={() => setBeenTab("overall")}>By overall</button>
          <button className={"gf " + (beenTab === "gf" ? "on" : "")} onClick={() => setBeenTab("gf")}>GF safety</button>
        </div>

        {reviewed.length === 0
          ? <div className="list-empty">Review a place and it lands here.</div>
          : beenTab === "overall"
            ? <div className="rlist">{byOverall.map((r, i) => <PlaceRow key={r.id} r={r} rank={i + 1} />)}</div>
            : <div>
                <SafetyGroup title="Felt safe eating here" cls="safe" items={safe} />
                <SafetyGroup title="Felt okay eating here" cls="okay" items={okay} />
                <SafetyGroup title="Felt unsafe eating here" cls="unsafe" items={unsafe} />
              </div>}

        <div className="section-title" style={{ marginTop: 44 }}>Want to go</div>
        {wantPlaces.length
          ? <div className="rlist">{wantPlaces.map(r => <WantCard key={r.id} r={r} />)}</div>
          : <div className="list-empty">Nothing saved yet — hit "Want to go" on a restaurant.</div>}

        <div style={{ marginTop: 60, paddingTop: 20, borderTop: "1px solid rgba(26,23,20,.12)", display: "flex", gap: 18, alignItems: "center" }}>
          <button className="btn-link" onClick={() => router.push("/privacy")}>Privacy policy</button>
          <button className="btn-link" style={{ color: "#a33" }} onClick={() => setShowDelete(true)}>Delete account</button>
        </div>
      </div>

      {showEdit && <EditProfileModal me={me} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); load(); }} />}
      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} onDeleted={() => { router.push("/"); router.refresh(); }} />}
    </div>
  );
}

function DeleteAccountModal({ onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");

  async function handleDelete() {
    setDeleting(true); setErr("");
    const res = await deleteMyAccount();
    setDeleting(false);
    if (res.error) { setErr(res.error); return; }
    onDeleted();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Delete account</h2>
        <div className="hint">
          This permanently deletes your account — your profile, reviews, photos, lists,
          and follows. It can't be undone.
        </div>
        <div className="field">
          <label>Type DELETE to confirm</label>
          <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="DELETE" />
        </div>
        {err && <div className="err">{err}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-sage" style={{ background: "#a33" }}
            onClick={handleDelete} disabled={confirmText !== "DELETE" || deleting}>
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditProfileModal({ me, onClose, onSaved }) {
  const [username, setUsername] = useState(me.username || "");
  const [sensitivity, setSensitivity] = useState(me.sensitivity || SENSITIVITIES[0]);
  const [bio, setBio] = useState(me.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(me.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr("");
    const res = await uploadAvatar(file, me.id);
    setUploading(false);
    if (res.error) { setErr("Photo upload failed: " + res.error); return; }
    setAvatarUrl(res.url);
  }

  async function save() {
    if (!username.trim()) { setErr("Username can't be empty."); return; }
    setSaving(true); setErr("");
    const { error } = await updateProfile(me.id, {
      username: username.trim(),
      sensitivity,
      bio: bio.trim() || null,
      avatar_url: avatarUrl || null
    });
    setSaving(false);
    if (error) { setErr(error.includes("duplicate") ? "That username is taken." : error); return; }
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Edit profile</h2>
        <div className="hint">This is what other celiacs see when they find you.</div>

        <div className="field">
          <label>Profile photo</label>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {avatarUrl
              ? <img className="pavatar" src={avatarUrl} alt="" style={{ width: 64, height: 64 }} />
              : <div className="pavatar pavatar-ph" style={{ width: 64, height: 64, fontSize: 26 }}>{(username || "?").charAt(0).toUpperCase()}</div>}
            <div style={{ flex: 1 }}>
              <input type="file" accept="image/*" onChange={handleFile} />
              {uploading && <div className="sub">Uploading…</div>}
              {avatarUrl && !uploading && <button className="btn-link" style={{ marginTop: 6 }} onClick={() => setAvatarUrl("")}>Remove photo</button>}
            </div>
          </div>
        </div>

        <div className="field"><label>Username</label><input value={username} onChange={e => setUsername(e.target.value)} /></div>

        <div className="field">
          <label>Your gluten sensitivity</label>
          <select value={sensitivity} onChange={e => setSensitivity(e.target.value)}>
            {SENSITIVITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A line about how you eat — how careful you are, what you look for, where you're based." style={{ minHeight: 80 }} />
        </div>

        {err && <div className="err">{err}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-sage" onClick={save} disabled={uploading || saving}>{saving ? "Saving…" : "Save profile"}</button>
        </div>
      </div>
    </div>
  );
}
