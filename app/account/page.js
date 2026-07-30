"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { fmtAvg } from "../../components/ui";
import {
  getMyProfile, getMyReviews, getMyLists, getFollowing, getFollowerCount,
  getRestaurants, uploadAvatar, updateProfile
} from "../../lib/db";

const SENSITIVITIES = [
  "Celiac disease", "Non-celiac gluten sensitivity", "Wheat allergy",
  "Gluten ataxia", "Dermatitis herpetiformis", "Avoiding by choice"
];

export default function AccountPage() {
  const [me, setMe] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);
  const [lists, setLists] = useState({ want: [], been: [] });
  const [followingN, setFollowingN] = useState(0);
  const [followerN, setFollowerN] = useState(0);
  const [rests, setRests] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const router = useRouter();

  async function load() {
    const p = await getMyProfile(); setMe(p); setLoaded(true);
    if (!p) return;
    setReviewCount((await getMyReviews(p.id)).length);
    setLists(await getMyLists(p.id));
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

  const ListCard = ({ id }) => {
    const r = byId(id); if (!r) return null;
    return (
      <div className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
        <div><h3 className="rcard-name" style={{ fontSize: 19 }}>{r.name}</h3>
          <div className="rcard-meta">{[r.neighborhood, r.cuisine].filter(Boolean).join(" · ")}</div></div>
        <div className="rcard-scores">
          <div className="score-box"><div className="score-label">Overall</div><div className={"score-num overall-num " + (r.scores?.avg_overall == null ? "none" : "")} style={{ fontSize: 20 }}>{fmtAvg(r.scores?.avg_overall)}</div></div>
          <div className="score-box"><div className="score-label">GF Safety</div><div className={"score-num gf-num " + (r.scores?.avg_gf == null ? "none" : "")} style={{ fontSize: 20 }}>{fmtAvg(r.scores?.avg_gf)}</div></div>
        </div>
      </div>
    );
  };

  return (
    <div className="wrap">
      <Header />
      <div className="view">

        <div className="profile-card">
          <div className="profile-top">
            <div className="avatar-wrap">
              {me.avatar_url
                ? <img className="avatar" src={me.avatar_url} alt="" />
                : <div className="avatar avatar-placeholder">{me.username.charAt(0).toUpperCase()}</div>}
            </div>
            <div className="profile-id">
              <h2 className="acct-name">{me.username}</h2>
              <div className="acct-sens">{me.sensitivity}</div>
              {me.bio && <div className="profile-bio">{me.bio}</div>}
            </div>
          </div>

          <div className="profile-actions">
            <button className="btn btn-ghost" onClick={() => setShowEdit(true)}>Edit profile</button>
            <button className="btn btn-ghost" onClick={shareProfile}>Share profile</button>
            {shareMsg && <span className="share-msg">{shareMsg}</span>}
          </div>

          <div className="acct-stats">
            <div className="stat"><div className="num">{reviewCount}</div><div className="lbl">Places rated</div></div>
            <div className="stat"><div className="num">{lists.been.length}</div><div className="lbl">Been there</div></div>
            <div className="stat"><div className="num">{lists.want.length}</div><div className="lbl">Want to go</div></div>
            <div className="stat"><div className="num">{followingN}</div><div className="lbl">Following</div></div>
            <div className="stat"><div className="num">{followerN}</div><div className="lbl">Followers</div></div>
          </div>
        </div>

        <div className="section-title">My lists</div>

        <div className="list-block">
          <div className="list-block-head">
            <span className="list-block-name">Want to go</span>
            <span className="list-block-count">{lists.want.length}</span>
          </div>
          {lists.want.length
            ? <div className="rlist">{lists.want.map(id => <ListCard key={id} id={id} />)}</div>
            : <div className="list-empty">Nothing saved yet — hit "Want to go" on a restaurant.</div>}
        </div>

        <div className="list-block">
          <div className="list-block-head">
            <span className="list-block-name">Been there</span>
            <span className="list-block-count">{lists.been.length}</span>
          </div>
          {lists.been.length
            ? <div className="rlist">{lists.been.map(id => <ListCard key={id} id={id} />)}</div>
            : <div className="list-empty">Mark places you've visited from their page.</div>}
        </div>
      </div>

      {showEdit && <EditProfileModal me={me} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); load(); }} />}
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
              ? <img className="avatar" src={avatarUrl} alt="" style={{ width: 64, height: 64 }} />
              : <div className="avatar avatar-placeholder" style={{ width: 64, height: 64, fontSize: 26 }}>{(username || "?").charAt(0).toUpperCase()}</div>}
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
