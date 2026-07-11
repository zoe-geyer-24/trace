"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import { ScorePair } from "../components/ui";
import { getRestaurants, findOrCreateFromFoursquare } from "../lib/db";

export default function BrowsePage() {
  const [rests, setRests] = useState(null);
  const [search, setSearch] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [fsqResults, setFsqResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [opening, setOpening] = useState(false);
  const [hood, setHood] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [sort, setSort] = useState("gf");
  const debounceRef = useRef(null);
  const router = useRouter();

  useEffect(() => { getRestaurants().then(setRests); }, []);

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
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [search]);

  async function pickPlace(place) {
    setOpening(true);
    const r = await findOrCreateFromFoursquare(place);
    if (r && r.id) { router.push("/restaurant/" + r.id); }
    else { setOpening(false); alert("Sorry — couldn't open that place. " + (r?.error || "")); }
  }

  if (rests === null) return <div className="wrap"><Header /><div className="loading">Tracing the safe spots…</div></div>;

  const hoods = [...new Set(rests.map(r => r.neighborhood).filter(Boolean))].sort();
  const cuisines = [...new Set(rests.map(r => r.cuisine).filter(Boolean))].sort();

  let list = rests.filter(r => {
    if (hood && r.neighborhood !== hood) return false;
    if (cuisine && r.cuisine !== cuisine) return false;
    return true;
  });
  list.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "reviews") return (b.scores?.review_count||0) - (a.scores?.review_count||0);
    const f = sort === "overall" ? "avg_overall" : "avg_gf";
    return (b.scores?.[f] ?? -1) - (a.scores?.[f] ?? -1);
  });

  return (
    <div className="wrap">
      <Header />
      <div className="view">
        <div className="search-row" style={{ position: "relative" }}>
          <input className="search" placeholder="Search any NYC restaurant to review…"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowSuggest(true); }}
            onFocus={() => setShowSuggest(true)}
            onBlur={() => setTimeout(() => setShowSuggest(false), 200)} />
          {showSuggest && search.trim().length >= 2 && (
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

        {opening && <div className="loading">Opening…</div>}

        <div className="filterbar">
          <select value={hood} onChange={e => setHood(e.target.value)}>
            <option value="">All neighborhoods</option>
            {hoods.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
          <select value={cuisine} onChange={e => setCuisine(e.target.value)}>
            <option value="">All cuisines</option>
            {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="gf">Sort: GF safety</option>
            <option value="overall">Sort: Overall</option>
            <option value="reviews">Sort: Most reviewed</option>
            <option value="name">Sort: A–Z</option>
          </select>
          <span className="fcount">{list.length} reviewed place{list.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="list-head" style={{ marginTop: 0 }}>Reviewed by the community</div>
        <div className="rlist">
          {list.length === 0
            ? <div className="empty"><div className="big">No reviews yet.</div>Search a restaurant above to be the first.</div>
            : list.map(r => (
              <div key={r.id} className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
                <div>
                  <h3 className="rcard-name">{r.name}</h3>
                  <div className="rcard-meta">
                    {[r.neighborhood, r.cuisine].filter(Boolean).map((m, i) => (
                      <span key={i}>{i > 0 && <span className="dot">●</span>}{m}</span>
                    ))}
                  </div>
                  {r.scores?.reacted_bad > 0 && <div className="react-line"><span className="bad">{r.scores.reacted_bad} got sick</span></div>}
                </div>
                <ScorePair scores={r.scores} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
