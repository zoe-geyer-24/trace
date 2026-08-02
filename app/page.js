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

const SENS = ["All", "Celiac disease", "Non-celiac gluten sensitivity", "Wheat allergy", "Gluten ataxia", "Dermatitis herpetiformis", "Avoiding by choice"];

export default function BrowsePage() {
  const [rests, setRests] = useState([]);
  const [me, setMe] = useState(null);
  const [people, setPeople] = useState([]);
  const [following, setFollowing] = useState([]);
  const [cat, setCat] = useState(null);
  const [friendsRecs, setFriendsRecs] = useState(null);
  const [gfPlaces, setGfPlaces] = useState(null);

  // search-mode state
  const [searchOpen, setSearchOpen] = useState(false);
  const [smode, setSmode] = useState("restaurants");
  const [term, setTerm] = useState("");
  const [fsqResults, setFsqResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [recents, setRecents] = useState([]);
  const [sensFilter, setSensFilter] = useState("All");
  const debounceRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    getRestaurants().then(setRests);
    getMyProfile().then(async p => { setMe(p); if (p) setFollowing(await getFollowing(p.id)); });
    getPeople().then(setPeople);
  }, []);

  useEffect(() => { setRecents(loadRecents(smode)); setTerm(""); setFsqResults([]); }, [smode]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (smode !== "restaurants" || term.trim().length < 2) { setFsqResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/search?q=" + encodeURIComponent(term));
        const data = await res.json();
        setFsqResults(data.results || []);
      } catch { setFsqResults([]); }
      setSearching(false);
    }, 300);
  }, [term, smode]);

  async function pickCat(key) {
    if (cat === key) { setCat(null); return; }
    setCat(key);
    if (key === "friends" && friendsRecs === null && me) setFriendsRecs(await getFriendsRecs(me.id));
    if (key === "gf" && gfPlaces === null) setGfPlaces(await getGlutenFriendly());
  }

  async function pickPlace(p) {
    saveRecent("restaurants", term);
    const rec = await findOrCreateFromFoursquare(p);
    if (rec && rec.id) router.push("/restaurant/" + rec.id);
    else if (rec && rec.error) alert("Sorry — couldn't open that place. " + rec.error);
  }

  async function doFollow(uid) {
    if (!me) return router.push("/login");
    if (following.includes(uid)) await unfollow(me.id, uid); else await follow(me.id, uid);
    setFollowing(await getFollowing(me.id));
  }

  function openSearch() { setSearchOpen(true); setSmode("restaurants"); setTerm(""); setFsqResults([]); }
  function closeSearch() { setSearchOpen(false); setTerm(""); setFsqResults([]); }

  const rated = rests.filter(r => r.scores && r.scores.review_count > 0);
  const ratedSorted = rated.slice().sort((a, b) => (b.scores.avg_gf ?? -1) - (a.scores.avg_gf ?? -1));
  const gfTopFallback = ratedSorted;

  const matchSens = p => sensFilter === "All" || p.sensitivity === sensFilter;
  const peopleMatches = people.filter(p =>
    matchSens(p) && term.trim().length >= 1 && (p.username || "").toLowerCase().includes(term.trim().toLowerCase())
  );
  const suggestedPeople = people.filter(p => (!me || p.id !== me.id) && matchSens(p)).slice(0, 8);

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

  const PersonRow = ({ p }) => {
    const isMe = me && me.id === p.id;
    const amFollowing = following.includes(p.id);
    return (
      <div className="person">
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
        {!isMe && <button className={"follow-mini " + (amFollowing ? "on" : "")} onClick={() => doFollow(p.id)}>{amFollowing ? "Following" : "Follow"}</button>}
      </div>
    );
  };

  function renderCategory() {
    if (cat === "gf") {
      if (gfPlaces === null) return <div className="loading">Loading…</div>;
      return gfPlaces.length
        ? <div className="rlist">{gfPlaces.map(r => (
            <div key={r.id} className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
              <div style={{ flex: 1 }}>
                <h3 className="rcard-name">{r.name}</h3>
                <div className="rcard-meta">{[r.neighborhood, r.cuisine].filter(Boolean).join(" · ")}</div>
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
    return (
      <div className="empty" style={{ padding: "40px 20px" }}>
        <div className="big">{cat === "trending" ? "Trending is coming soon." : "Featured lists are coming soon."}</div>
        {cat === "trending" ? "Once more people are reviewing, you'll see what's hot right now." : "Curated guides from the community are on the way."}
      </div>
    );
  }

  // ---- SEARCH TAKEOVER ----
  if (searchOpen) {
    return (
      <div className="wrap">
        <Header />
        <div className="view">
          <div className="search-head">
            <input autoFocus className="search" style={{ flex: 1 }} value={term} onChange={e => setTerm(e.target.value)}
              placeholder={smode === "restaurants" ? "Search NYC restaurants…" : "Search people…"} />
            <button className="btn-link" onClick={closeSearch}>Cancel</button>
          </div>

          <div className="map-toggle" style={{ marginBottom: 20 }}>
            <button className={"gf " + (smode === "restaurants" ? "on" : "")} onClick={() => setSmode("restaurants")}>Restaurants</button>
            <button className={"overall " + (smode === "people" ? "on" : "")} onClick={() => setSmode("people")}>People</button>
          </div>

          {smode === "people" && (
            <div className="sens-chips">
              {SENS.map(s => (
                <button key={s} className={"sens-chip " + (sensFilter === s ? "on" : "")} onClick={() => setSensFilter(s)}>{s === "Non-celiac gluten sensitivity" ? "NCGS" : s}</button>
              ))}
            </div>
          )}

          {term.trim().length < 2 ? (
            <>
              {recents.length > 0 && <>
                <div className="list-head" style={{ marginTop: 0 }}>Recent searches</div>
                <div className="rlist" style={{ marginBottom: 24 }}>
                  {recents.map((t, i) => (
                    <div key={i} className="rcard" style={{ padding: "14px 20px" }} onClick={() => setTerm(t)}>
                      <div className="rcard-name" style={{ fontSize: 16 }}>↩ {t}</div>
                    </div>
                  ))}
                </div>
              </>}
              <div className="list-head" style={{ marginTop: recents.length ? 0 : 0 }}>Suggested people to follow</div>
              {suggestedPeople.length
                ? <div className="rlist">{suggestedPeople.map(p => <PersonRow key={p.id} p={p} />)}</div>
                : <div className="list-empty">No one to suggest yet.</div>}
            </>
          ) : smode === "restaurants" ? (
            <>
              {searching && <div className="loading">Searching…</div>}
              {!searching && fsqResults.length === 0 && <div className="list-empty">No matches found.</div>}
              <div className="rlist">
                {fsqResults.map(p => (
                  <div key={p.fsq_id} className="rcard" onClick={() => pickPlace(p)}>
                    <div><h3 className="rcard-name">{p.name}</h3>
                      <div className="rcard-meta">{p.address || p.neighborhood}</div></div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            peopleMatches.length
              ? <div className="rlist">{peopleMatches.map(p => <PersonRow key={p.id} p={p} />)}</div>
              : <div className="list-empty">No people match “{term}”.</div>
          )}
        </div>
      </div>
    );
  }

  // ---- MAIN BROWSE ----
  return (
    <div className="wrap">
      <Header />
      <div className="view">
        <div className="search-trigger" onClick={openSearch}>
          <span className="search-trigger-icon">⚲</span>
          Search restaurants or people…
        </div>

        <div className="cat-row">
          {CATS.map(c => (
            <button key={c.key} className={"cat-btn " + (cat === c.key ? "on" : "")} onClick={() => pickCat(c.key)}>{c.label}</button>
          ))}
        </div>

        {cat ? renderCategory() : (
          rated.length === 0
            ? <div className="empty"><div className="big">No reviewed places yet.</div>Tap search to find any NYC restaurant and be the first to rate it.</div>
            : <div className="rlist">{ratedSorted.map(r => <RestCard key={r.id} r={r} />)}</div>
        )}
      </div>
    </div>
  );
}
