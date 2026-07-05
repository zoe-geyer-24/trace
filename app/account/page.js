"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { fmtAvg } from "../../components/ui";
import { getMyProfile, getMyReviews, getMyLists, getFollowing, getFollowerCount, getRestaurants } from "../../lib/db";

export default function AccountPage() {
  const [me, setMe] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [myReviews, setMyReviews] = useState([]);
  const [lists, setLists] = useState({ want: [], been: [] });
  const [followingN, setFollowingN] = useState(0);
  const [followerN, setFollowerN] = useState(0);
  const [rests, setRests] = useState([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const p = await getMyProfile(); setMe(p); setLoaded(true);
      if (!p) return;
      setMyReviews(await getMyReviews(p.id));
      setLists(await getMyLists(p.id));
      setFollowingN((await getFollowing(p.id)).length);
      setFollowerN(await getFollowerCount(p.id));
      setRests(await getRestaurants());
    })();
  }, []);

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
        <div className="acct-card">
          <h2 className="acct-name">{me.username}</h2>
          <div className="acct-sens">{me.sensitivity}</div>
          <div className="acct-stats">
            <div className="stat"><div className="num">{myReviews.length}</div><div className="lbl">Places rated</div></div>
            <div className="stat"><div className="num">{lists.want.length}</div><div className="lbl">Want to go</div></div>
            <div className="stat"><div className="num">{lists.been.length}</div><div className="lbl">Been there</div></div>
            <div className="stat"><div className="num">{followingN}</div><div className="lbl">Following</div></div>
            <div className="stat"><div className="num">{followerN}</div><div className="lbl">Followers</div></div>
          </div>
        </div>

        <div className="list-head">Want to go</div>
        {lists.want.length ? <div className="rlist">{lists.want.map(id => <ListCard key={id} id={id} />)}</div>
          : <div style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif", fontSize: 13, color: "#8a7d6b" }}>Nothing saved yet — hit "Want to go" on a restaurant.</div>}

        <div className="list-head">Been there</div>
        {lists.been.length ? <div className="rlist">{lists.been.map(id => <ListCard key={id} id={id} />)}</div>
          : <div style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif", fontSize: 13, color: "#8a7d6b" }}>Mark places you've visited from their page.</div>}

        <div className="list-head">My reviews</div>
        {myReviews.length ? myReviews.map(r => (
          <div key={r.id} className="review" style={{ marginBottom: 14, cursor: "pointer" }} onClick={() => router.push("/restaurant/" + r.restaurant_id)}>
            <div className="review-top">
              <div className="reviewer"><div className="name">{r.restaurants?.name}</div></div>
              <div className="review-scores">
                <div className="score-box"><div className="score-label">Overall</div><div className="score-num overall-num">{r.overall}<span className="of">/10</span></div></div>
                <div className="score-box"><div className="score-label">GF Safety</div><div className="score-num gf-num">{r.gf_safety}<span className="of">/10</span></div></div>
              </div>
            </div>
            {r.body && <div className="review-body">{r.body}</div>}
          </div>
        )) : <div style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif", fontSize: 13, color: "#8a7d6b" }}>You haven't rated anywhere yet.</div>}
      </div>
    </div>
  );
}
