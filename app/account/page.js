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
          <div className="score-box"><div className="score-label">GF Safety</div><div className={"score-num gf-num " + (r.scores?.avg_gf == null ?
