"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { fmtAvg } from "../components/ui";
import {
  getRestaurants, findOrCreateFromFoursquare, getMyProfile,
  getPeople, getFollowing, follow, unfollow, getFriendsRecs, getGlutenFriendly
} from "../lib/db";

const RECENT_KEY = { restaurants: "trace_recent_rest", people: "trace_recent_people" };
function loadRecents(mode) { try { return JSON.parse(localStorage.getItem(RECENT_KEY[mode]) || "[]"); } catch { return []; } }
function saveRecent(mode, term) {
  if (!term || !term.trim()) return;
  try {
    const cur = loadRecents(mode).filter(t => t.toLowerCase() !== term.toLowerCase());
    cur.unshift(term.trim());
    localStorage.setItem(RECENT_KEY[mode], JSON.stringify(cur.slice(0, 6)));
  } catch {}
}

const CATS = [
  { key: "trending", label: "Trending" },
  { key: "featured", label: "Featured lists" },
  { key: "friends", label: "Friends' recs" },
  { key: "gf", label: "Gluten friendly" },
];

export default function BrowsePage() {
  const [mode, setMode] = useState("restaurants");
  const [rests, setRests] = useState([]);
  const [search, setSearch] = useState("");
  const [fsqResults, setFsqResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recents, setRecents] = useState([]);
  const [cat, setCat] = useState(null);
  const [friendsRecs, setFriendsRecs] = useState(null);
  const [gfPlaces, setGfPlaces] = useState(null);
  const [me, setMe] = useState(null);
  const [people, setPeople] = useState([]);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [following, setFollowing] = useState([]);
  const debounceRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    getRestaurants().then(setRests);
    getMyProfile().then(async p => { setMe(p); if (p) setFollowing(await getFollowing(p.id)); });
    getPeople().then(setPeople);
  }, []);

  useEffect(() => { setRecents(loadRecents(mode)); }, [mode]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.trim().length < 2) { setFsqResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/search?q=" + encodeURIComponent(search));
        const data = await res.json();
        setFsqResults(data.results || []);
      } catch { setFsqResults([]); }
      setSearching(false);
    }, 300);
  }, [search]);

  async function pickCat(key) {
    if (cat === key) { setCat(null); return; }
    setCat(key);
    if (key === "friends" && friendsRecs === null && me) {
      setFriendsRecs(await getFriendsRecs(me.id));
    }
    if (key === "gf" && gfPlaces === null) {
      setGfPlaces(await getGlutenFriendly());
    }
  }

  async function pickPlace(p) {
    saveRecent("restaurants", search);
    const rec = await findOrCreateFromFoursquare(p);
    if (rec && rec.id) router.push("/restaurant/" + rec.id);
    else if (rec && rec.error) alert("Sorry — couldn't open that place. " + rec.error);
  }

  const rated = rests.filter(r => r.scores && r.scores.review_count > 0);
  const gfTop = rated.slice().sort((a, b) => (b.scores.avg_gf ?? -1) - (a.scores.avg_gf ?? -1));

  const filteredPeople = people.filter(p =>
    !peopleQuery.trim() || (p.username || "").toLowerCase().includes(peopleQuery.trim().toLowerCase())
  );

  async function doFollow(uid) {
    if (!me) return router.push("/login");
    if (following.includes(uid)) await unfollow(me.id, uid); else await follow(me.id, uid);
    setFollowing(await getFollowing(me.id));
  }

  function switchMode(m) { setMode(m); setSearch(""); setPeopleQuery(""); setFocused(false); setFsqResults([]); setCat(null); }
  const curTerm = mode === "restaurants" ? search : peopleQuery;
  const showRecents = focused && curTerm.trim().length < 2 && recents.length > 0;

  const RestCard = ({ r }) => (
    <div className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
      <div><h3 className="rcard-name">{r.name}</h3>
        <div className="rcard-meta">{[r.neighborhood, r.cuisine].filter(Boolean).join(" · ")}</div></div>
      <div className="rcard-scores">
        <div className="score-box"><div className="score-label">Overall</div><div className={"score-num overall-num " + (r.scores?.avg_overall == null ? "none" : "")}>{fmtAvg(r.scores?.avg_overall)}</div></div>
        <div className="score-box"><div className="score-label">GF Safety</div><div className={"score-num gf-num " + (r.scores?.avg_gf == null ? "none" : "")}>{fmtAvg(r.scores?.avg_gf)}</div></div>
      </div>
    </div>
  );

  function renderCategory() {
    if (cat === "gf") {
      if (gfPlaces === null) return <div className="loading">Loading…</div>;
      return gfPlaces.length
        ? <div className="rlist">{gfPlaces.map(r => (
            <div key={r.id} className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
              <div style={{ flex: 1 }}>
                <h3 className="rcard-name">{r.name}</h3>
                <div className="rcard-meta">{[r.neighborhood, r.cuisine].filter(Boolean).join(" \u00b7 ")}</div>
                {r.features.length > 0 && <div className="gf-features">{r.features.map((f, i) => <span key={i} className="gf-feat">{f}</span>)}</div>}
              </div>
              <div className="rcard-scores">
                <div className="score-box"><div className="score-label">GF Safety</div><div className="score-num gf-num">{fmtAvg(r.scores?.avg_gf)}</div></div>
              </div>
            </div>
          ))}</div>
        : <div className="list-empty">No places rated 8+ for GF safety yet. Keep reviewing!</div>;
    }
    if (cat === "friends") {
      if (!me) return <div className="list-empty">Sign in to see what people you follow recommend.</div>;
      if (friendsRecs === null) return <div className="loading">Loading…</div>;
      return friendsRecs.length
        ? <div className="rlist">{friendsRecs.map(r => (
            <div key={r.id} className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
              <div><h3 className="rcard-name">{r.name}</h3>
                <div className="rcard-meta">{[r.neighborhood, r.cuisine].filter(Boolean).join(" · ")}</div>
                <div className="react-line" style={{ color: "var(--rye-deep)" }}>Liked by {r.by.slice(0, 3).join(", ")}{r.by.length > 3 ? ` +${r.by.length - 3}` : ""}</div></div>
              <div className="rcard-scores">
                <div className="score-box"><div className="score-label">GF Safety</div><div className="score-num gf-num">{r.bestGf}</div></div>
              </div>
            </div>
          ))}</div>
        : <div className="list-empty">Follow some people who review places, and their top picks show up here.</div>;
    }
    // trending / featured => coming soon
    return (
      <div className="empty" style={{ padding: "40px 20px" }}>
        <div className="big">{cat === "trending" ? "Trending is coming soon." : "Featured lists are coming soon."}</div>
        {cat === "trending" ? "Once more people are reviewing, you'll see what's hot right now." : "Curated guides from the community are on the way."}
      </div>
    );
  }

  return (
    <div className="wrap">
      <Header />
      <div className="view">

        <div className="map-toggle" style={{ marginBottom: 16 }}>
          <button className={"gf " + (mode === "restaurants" ? "on" : "")} onClick={() => switchMode("restaurants")}>Restaurants</button>
          <button className={"overall " + (mode === "people" ? "on" : "")} onClick={() => switchMode("people")}>People</button>
        </div>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <input className="search" style={{ width: "100%" }}
            value={curTerm}
            onChange={e => mode === "restaurants" ? setSearch(e.target.value) : setPeopleQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={mode === "restaurants" ? "Search any NYC restaurant to review…" : "Search people by username…"} />

          {showRecents && (
            <div className="suggest-box">
              <div className="suggest-item" style={{ color: "#8a7d6b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Recent searches</div>
              {recents.map((t, i) => (
                <div key={i} className="suggest-item" onMouseDown={() => mode === "restaurants" ? setSearch(t) : setPeopleQuery(t)}>
                  <div className="suggest-name" style={{ fontSize: 15 }}>↩ {t}</div>
                </div>
              ))}
            </div>
          )}

          {mode === "restaurants" && search.trim().length >= 2 && (
            <div className="suggest-box">
              {searching && <div className="suggest-item" style={{ color: "#8a7d6b" }}>Searching…</div>}
              {!searching && fsqResults.length === 0 && <div className="suggest-item" style={{ color: "#8a7d6b" }}>No matches found.</div>}
              {fsqResults.map(p => (
                <div key={p.fsq_id} className="suggest-item" onMouseDown={() => pickPlace(p)}>
                  <div className="suggest-name">{p.name}</div>
                  <div className="suggest-meta">{p.address || p.neighborhood}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {mode === "restaurants" ? (
          <>
            <div className="cat-row">
              {CATS.map(c => (
                <button key={c.key} className={"cat-btn " + (cat === c.key ? "on" : "")} onClick={() => pickCat(c.key)}>{c.label}</button>
              ))}
            </div>

            {cat ? renderCategory() : (
              rated.length === 0
                ? <div className="empty"><div className="big">No reviewed places yet.</div>Search any NYC restaurant above to be the first to rate it.</div>
                : <div className="rlist">{rated.slice().sort((a, b) => (b.scores.avg_gf ?? -1) - (a.scores.avg_gf ?? -1)).map(r => <RestCard key={r.id} r={r} />)}</div>
            )}
          </>
        ) : (
          filteredPeople.length === 0
            ? <div className="empty"><div className="big">No one found.</div>Try a different name.</div>
            : <div className="rlist">
                {filteredPeople.map(p => {
                  const isMe = me && me.id === p.id;
                  const amFollowing = following.includes(p.id);
                  return (
                    <div key={p.id} className="person">
                      <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => router.push("/u/" + encodeURIComponent(p.username))}>
                        {p.avatar_url
                          ? <img className="pavatar" src={p.avatar_url} alt="" style={{ width: 48, height: 48 }} />
                          : <div className="pavatar pavatar-ph" style={{ width: 48, height: 48, fontSize: 20 }}>{(p.username || "?").charAt(0).toUpperCase()}</div>}
                        <div>
                          <div className="pname">{p.username}</div>
                          <div className="psens">{p.sensitivity}</div>
                          <div className="pmeta">{p.reviewCount} place{p.reviewCount !== 1 ? "s" : ""} rated</div>
                        </div>
                      </div>
                      {!isMe && (
                        <button className={"follow-mini " + (amFollowing ? "on" : "")} onClick={() => doFollow(p.id)}>
                          {amFollowing ? "Following" : "Follow"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
        )}
      </div>
    </div>
  );
}
