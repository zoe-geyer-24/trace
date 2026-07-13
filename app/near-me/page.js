"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { getRestaurants } from "../../lib/db";

export default function NearMePage() {
  const [status, setStatus] = useState("locating"); // locating | ready | denied | error
  const [best, setBest] = useState([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const rests = await getRestaurants();
      if (!navigator.geolocation) { setStatus("error"); return; }
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude } = pos.coords;
        const dist = (la, ln) => {
          const toRad = d => d * Math.PI / 180, R = 3958.8;
          const dLat = toRad(la - latitude), dLng = toRad(ln - longitude);
          const a = Math.sin(dLat/2)**2 + Math.cos(toRad(latitude)) * Math.cos(toRad(la)) * Math.sin(dLng/2)**2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        };
        const items = rests
          .filter(r => typeof r.lat === "number" && typeof r.lng === "number")
          .filter(r => r.scores && r.scores.review_count > 0 && r.scores.avg_gf != null && r.scores.avg_overall != null)
          .map(r => ({
            ...r,
            _dist: dist(r.lat, r.lng),
            _combined: (Number(r.scores.avg_gf) * 0.5) + (Number(r.scores.avg_overall) * 0.5)
          }))
          .filter(r => r._dist <= 2)
          .sort((a, b) => b._combined - a._combined)
          .slice(0, 5);
        setBest(items);
        setStatus("ready");
      }, () => setStatus("denied"));
    })();
  }, []);

  return (
    <div className="wrap">
      <Header />
      <div className="view">
        <div className="back"><button className="btn-link" onClick={() => router.push("/map")}>← Back to map</button></div>

        <div className="near-hero">
          <div className="near-eyebrow">Within two miles of you</div>
          <h2 className="near-title">The best places near you</h2>
          <div className="near-sub">Ranked on food and celiac safety, weighted equally.</div>
        </div>

        {status === "locating" && <div className="loading">Finding you…</div>}
        {status === "denied" && <div className="empty"><div className="big">Location blocked.</div>Trace needs your location to find nearby places. Allow it in your browser settings and reload.</div>}
        {status === "error" && <div className="empty"><div className="big">Location unavailable.</div>Your browser doesn't support location.</div>}

        {status === "ready" && (
          best.length === 0
            ? <div className="empty"><div className="big">Nothing rated near you yet.</div>No reviewed places within 2 miles. Search a restaurant nearby and be the first to rate it.</div>
            : <div className="near-list">
                {best.map((r, i) => (
                  <div key={r.id} className="near-card" onClick={() => router.push("/restaurant/" + r.id)}>
                    <div className="near-rank">{i + 1}</div>
                    <div className="near-body">
                      <h3 className="near-name">{r.name}</h3>
                      <div className="near-meta">
                        {[r.neighborhood, r.cuisine].filter(Boolean).join(" · ")}
                        {(r.neighborhood || r.cuisine) && " · "}
                        <span className="near-dist">{r._dist.toFixed(1)} mi away</span>
                      </div>
                      {r.scores.reacted_bad > 0 && <div className="react-line"><span className="bad">{r.scores.reacted_bad} got sick</span></div>}
                    </div>
                    <div className="near-scores">
                      <div className="score-box">
                        <div className="score-label">GF Safety</div>
                        <div className="score-num gf-num">{Math.round(r.scores.avg_gf * 10) / 10}<span className="of">/10</span></div>
                      </div>
                      <div className="score-box">
                        <div className="score-label">Overall</div>
                        <div className="score-num overall-num">{Math.round(r.scores.avg_overall * 10) / 10}<span className="of">/10</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        )}
      </div>
    </div>
  );
}
