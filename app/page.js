"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { fmtAvg } from "../components/ui";
import {
  getRestaurants, findOrCreateFromFoursquare, getMyProfile,
  getPeople, getFollowing, follow, unfollow
} from "../lib/db";

const RECENT_KEY = { restaurants: "trace_recent_rest", people: "trace_recent_people" };

function loadRecents(mode) {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY[mode]) || "[]"); } catch { return []; }
}
function saveRecent(mode, term) {
  if (!term || !term.trim()) return;
  try {
    const cur = loadRecents(mode).filter(t => t.toLowerCase() !== term.toLowerCase());
    cur.unshift(term.trim());
    localStorage.setItem(RECENT_KEY[mode], JSON.stringify(cur.slice(0, 6)));
  } catch {}
}

export default function BrowsePage() {
  const [mode, setMode] = useState("restaurants");
  const [rests, setRests] = useState([]);
  const [search, setSearch] = useState("");
  const [fsqResults, setFsqResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recents, setRecents] = useState([]);
  const [neighborhood, setNeighborhood] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [sort, setSort] = useState("gf");
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

  async function pickPlace(p) {
    saveRecent("restaurants", search);
    const rec = await findOrCreateFromFoursquare(p);
    if (rec && rec.id) router.push("/restaurant/" + rec.id);
    else if (rec && rec.error) alert("Sorry — couldn't open that place. " + rec.error);
  }

  const rated = rests.filter(r => r.scores && r.scores.review_count > 0);
  const neighborhoods = [...new Set(rated.map(r => r.neighborhood).filter(Boolean))].sort();
  const cuisines = [...new Set(rated.map(r => r.cuisine).filter(Boolean))].sort();

  let filtered = rated.filter(r =>
    (!neighborhood || r.neighborhood === neighborhood) && (!cuisine || r.cuisine === cuisine)
  );
  filtered.sort((a, b) => {
    if (sort === "gf") return (b.scores.avg_gf ?? -1) - (a.scores.avg_gf ?? -1);
    if (sort === "overall") return (b.scores.avg_overall ?? -1) - (a.scores.avg_overall ?? -1);
    if (sort === "reviews") return (b.scores.review_count ?? 0) - (a.scores.review_count ?? 0);
    return a.name.localeCompare(b.name);
  });

  const filteredPeople = people.filter(p =>
    !peopleQuery.trim() || (p.username || "").toLowerCase().includes(peopleQuery.trim().toLowerCase())
  );

  async function doFollow(uid) {
    if (!me) return router.push("/login");
    if (following.includes(uid)) await unfollow(me.id, uid); else await follow(me.id, uid);
    setFollowing(await getFollowing(me.id));
  }

  function switchMode(m) { setMode(m); setSearch(""); setPeopleQuery(""); setFocused(false); setFsqResults([]); }

  const curTerm = mode === "restaurants" ? search : peopleQuery;
  const showRecents = focused && curTerm.trim().length < 2 && recents.length > 0;

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
            <div className="filterbar">
              <select value={neighborhood} onChange={e => setNeighborhood(e.target.value)}>
                <option value="">All neighborhoods</option>
                {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={cuisine} onChange={e => setCuisine(e.target.value)}>
                <option value="">All cuisines</option>
                {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={sort} onChange={e => setSort(e.target.value)}>
                <option value="gf">Sort: GF safety</option>
                <option value="overall">Sort: Overall</option>
                <option value="reviews">Sort: Most reviewed</option>
                <option value="az">Sort: A–Z</option>
              </select>
              <span className="fcount">{filtered.length} reviewed place{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {filtered.length === 0
              ? <div className="empty"><div className="big">No reviewed places yet.</div>Search any NYC restaurant above to be the first to rate it.</div>
              : <div className="rlist">
                  {filtered.map(r => (
                    <div key={r.id} className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
                      <div><h3 className="rcard-name">{r.name}</h3>
                        <div className="rcard-meta">{[r.neighborhood, r.cuisine].filter(Boolean).join(" · ")}</div></div>
                      <div className="rcard-scores">
                        <div className="score-box"><div className="score-label">Overall</div><div className={"score-num overall-num " + (r.scores?.avg_overall == null ? "none" : "")}>{fmtAvg(r.scores?.avg_overall)}</div></div>
                        <div className="score-box"><div className="score-label">GF Safety</div><div className={"score-num gf-num " + (r.scores?.avg_gf == null ? "none" : "")}>{fmtAvg(r.scores?.avg_gf)}</div></div>
                      </div>
                    </div>
                  ))}
                </div>}
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
