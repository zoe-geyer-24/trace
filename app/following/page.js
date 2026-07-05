"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { getMyProfile, getFollowing, getAllProfiles, getFeed, follow, unfollow, getReviewCountFor } from "../../lib/db";

export default function FollowingPage() {
  const [me, setMe] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [following, setFollowing] = useState([]);
  const [people, setPeople] = useState([]);
  const [feed, setFeed] = useState([]);
  const router = useRouter();

  async function load() {
    const p = await getMyProfile(); setMe(p); setLoaded(true);
    if (!p) return;
    const f = await getFollowing(p.id); setFollowing(f);
    const all = (await getAllProfiles()).filter(u => u.id !== p.id);
    const withCounts = await Promise.all(all.map(async u => ({ ...u, count: await getReviewCountFor(u.id) })));
    setPeople(withCounts);
    setFeed(await getFeed(f));
  }
  useEffect(() => { load(); }, []);

  async function toggle(uid) {
    if (following.includes(uid)) await unfollow(me.id, uid); else await follow(me.id, uid);
    load();
  }

  if (loaded && !me) return (
    <div className="wrap"><Header />
      <div className="empty"><div className="big">Sign in to follow people.</div>See where the celiacs you trust have been eating.<br /><br />
        <button className="btn btn-sage" onClick={() => router.push("/login")}>Sign in / sign up</button></div>
    </div>
  );

  return (
    <div className="wrap">
      <Header />
      <div className="view">
        <div className="list-head">Recent activity from people you follow</div>
        {feed.length === 0
          ? <div className="empty"><div className="big">Quiet in here.</div>{following.length ? "The people you follow haven't reviewed anywhere yet." : "Follow some people below to fill this feed."}</div>
          : feed.map(r => (
            <div key={r.id} className="feed-item" onClick={() => router.push("/restaurant/" + r.restaurant_id)}>
              <div className="feed-head"><b>{r.profiles?.username}</b> reviewed <span className="place">{r.restaurants?.name}</span></div>
              <div className="feed-scores">
                <span className="feed-mini ov">Overall <b>{r.overall}</b>/10</span>
                <span className="feed-mini gf">GF <b>{r.gf_safety}</b>/10</span>
              </div>
              {r.body && <div style={{ fontSize: 15, lineHeight: 1.55, marginTop: 6 }}>{r.body.slice(0, 180)}{r.body.length > 180 ? "…" : ""}</div>}
              <div style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif", fontSize: 11, color: "#8a7d6b", marginTop: 8 }}>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
            </div>
          ))}

        <div className="list-head">Find people to follow</div>
        {people.length === 0
          ? <div style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif", fontSize: 13, color: "#8a7d6b" }}>No other accounts yet. When friends sign up they'll show here.</div>
          : people.map(u => (
            <div key={u.id} className="person">
              <div><div className="pname">{u.username}</div><div className="psens">{u.sensitivity}</div><div className="pmeta">{u.count} review{u.count !== 1 ? "s" : ""}</div></div>
              <button className={"btn " + (following.includes(u.id) ? "btn-ghost" : "btn-sage")} onClick={() => toggle(u.id)}>{following.includes(u.id) ? "Following" : "Follow"}</button>
            </div>
          ))}
      </div>
    </div>
  );
}
