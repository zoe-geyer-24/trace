"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { fmtAvg } from "../../components/ui";
import { getMyProfile, getRestaurants, getMyReviewedPlaces, getRecommendations } from "../../lib/db";

const UNLOCK_AT = 7;

export default function RecommendationsPage() {
  const [me, setMe] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [ratedCount, setRatedCount] = useState(0);
  const [recs, setRecs] = useState(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const p = await getMyProfile(); setMe(p); setLoaded(true);
      if (!p) return;
      const reviewed = await getMyReviewedPlaces(p.id);
      setRatedCount(reviewed.length);
      if (reviewed.length >= UNLOCK_AT) {
        const all = await getRestaurants();
        setRecs(await getRecommendations(p.id, all));
      }
    })();
  }, []);

  if (loaded && !me) return (
    <div className="wrap"><Header />
      <div className="empty"><div className="big">Sign in to get recommendations.</div>They're based on the places you've rated.<br /><br />
        <button className="btn btn-sage" onClick={() => router.push("/login")}>Create account</button></div>
    </div>
  );
  if (!me) return <div className="wrap"><Header /><div className="loading">Loading…</div></div>;

  const locked = ratedCount < UNLOCK_AT;
  const remaining = UNLOCK_AT - ratedCount;

  return (
    <div className="wrap">
      <Header />
      <div className="view">
        <div className="near-hero">
          <div className="near-eyebrow">Picked for your taste</div>
          <h2 className="near-title">Recommended for you</h2>
          <div className="near-sub">Based on the cuisines, neighborhoods, and safety features you rate highly.</div>
        </div>

        {locked ? (
          <div className="rec-lock">
            <div className="rec-lock-ring">
              <span className="rec-lock-num">{ratedCount}</span>
              <span className="rec-lock-of">of {UNLOCK_AT}</span>
            </div>
            <div className="rec-lock-title">Rate {remaining} more place{remaining !== 1 ? "s" : ""} to unlock</div>
            <div className="rec-lock-sub">Recommendations learn from your ratings. Once you've rated {UNLOCK_AT} places, we can start finding spots you'll love.</div>
            <button className="btn btn-sage" style={{ marginTop: 18 }} onClick={() => router.push("/")}>Find places to rate</button>
          </div>
        ) : recs === null ? (
          <div className="loading">Finding your picks…</div>
        ) : recs.items.length === 0 ? (
          <div className="empty"><div className="big">Nothing new to suggest yet.</div>You've rated most of what's in Trace. As more places get added, we'll surface fresh picks.</div>
        ) : (
          <>
            {recs.mode === "personalized" && recs.topCuisine && (
              <div className="list-head" style={{ marginTop: 0 }}>Because you like {recs.topCuisine}</div>
            )}
            <div className="rlist">
              {recs.items.map(r => (
                <div key={r.id} className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
                  <div><h3 className="rcard-name">{r.name}</h3>
                    <div className="rcard-meta">{[r.neighborhood, r.cuisine].filter(Boolean).join(" · ")}</div></div>
                  <div className="rcard-scores">
                    <div className="score-box"><div className="score-label">Overall</div><div className={"score-num overall-num " + (r.scores?.avg_overall == null ? "none" : "")}>{fmtAvg(r.scores?.avg_overall)}</div></div>
                    <div className="score-box"><div className="score-label">GF Safety</div><div className={"score-num gf-num " + (r.scores?.avg_gf == null ? "none" : "")}>{fmtAvg(r.scores?.avg_gf)}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
