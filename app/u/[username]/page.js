"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "../../../components/Header";
import { getProfileByUsername, getPublicProfileData, getMyProfile, getFollowing, follow, unfollow } from "../../../lib/db";

export default function PublicProfilePage() {
  const { username } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = not found
  const [data, setData] = useState({ want: [], been: [], reviewCount: 0, followerCount: 0 });
  const [me, setMe] = useState(null);
  const [following, setFollowing] = useState([]);

  async function load() {
    const p = await getProfileByUsername(decodeURIComponent(username));
    setProfile(p || null);
    if (!p) return;
    setData(await getPublicProfileData(p.id));
    const mine = await getMyProfile();
    setMe(mine);
    if (mine) setFollowing(await getFollowing(mine.id));
  }
  useEffect(() => { load(); }, [username]);

  if (profile === undefined) return <div className="wrap"><Header /><div className="loading">Loading…</div></div>;
  if (profile === null) return (
    <div className="wrap"><Header />
      <div className="empty"><div className="big">No one here.</div>That profile doesn't exist.<br /><br />
        <button className="btn btn-sage" onClick={() => router.push("/")}>Back to Trace</button></div>
    </div>
  );

  const isMe = me && me.id === profile.id;
  const amFollowing = following.includes(profile.id);

  async function toggleFollow() {
    if (!me) return router.push("/login");
    if (amFollowing) await unfollow(me.id, profile.id); else await follow(me.id, profile.id);
    setFollowing(await getFollowing(me.id));
    setData(await getPublicProfileData(profile.id));
  }

  const PlaceCard = ({ r }) => (
    <div className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
      <div><h3 className="rcard-name" style={{ fontSize: 19 }}>{r.name}</h3>
        <div className="rcard-meta">{[r.neighborhood, r.cuisine].filter(Boolean).join(" · ")}</div></div>
    </div>
  );

  return (
    <div className="wrap">
      <Header />
      <div className="view">
        <div className="profile-card">
          <div className="profile-top">
            <div className="avatar-wrap">
              {profile.avatar_url
                ? <img className="avatar" src={profile.avatar_url} alt="" />
                : <div className="avatar avatar-placeholder">{profile.username.charAt(0).toUpperCase()}</div>}
            </div>
            <div className="profile-id">
              <h2 className="acct-name">{profile.username}</h2>
              <div className="acct-sens">{profile.sensitivity}</div>
              {profile.bio && <div className="profile-bio">{profile.bio}</div>}
            </div>
          </div>

          {!isMe && (
            <div className="profile-actions">
              <button className={"btn " + (amFollowing ? "btn-ghost" : "btn-sage")} onClick={toggleFollow}>
                {amFollowing ? "Following" : "Follow"}
              </button>
            </div>
          )}

          <div className="acct-stats">
            <div className="stat"><div className="num">{data.reviewCount}</div><div className="lbl">Places rated</div></div>
            <div className="stat"><div className="num">{data.been.length}</div><div className="lbl">Been there</div></div>
            <div className="stat"><div className="num">{data.want.length}</div><div className="lbl">Want to go</div></div>
            <div className="stat"><div className="num">{data.followerCount}</div><div className="lbl">Followers</div></div>
          </div>
        </div>

        <div className="section-title">{profile.username}'s lists</div>

        <div className="list-block">
          <div className="list-block-head">
            <span className="list-block-name">Want to go</span>
            <span className="list-block-count">{data.want.length}</span>
          </div>
          {data.want.length
            ? <div className="rlist">{data.want.map(r => <PlaceCard key={r.id} r={r} />)}</div>
            : <div className="list-empty">Nothing here yet.</div>}
        </div>

        <div className="list-block">
          <div className="list-block-head">
            <span className="list-block-name">Been there</span>
            <span className="list-block-count">{data.been.length}</span>
          </div>
          {data.been.length
            ? <div className="rlist">{data.been.map(r => <PlaceCard key={r.id} r={r} />)}</div>
            : <div className="list-empty">Nothing here yet.</div>}
        </div>
      </div>
    </div>
  );
}
