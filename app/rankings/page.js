"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { fmtAvg } from "../../components/ui";
import { getRestaurants } from "../../lib/db";

export default function RankingsPage() {
  const [rests, setRests] = useState(null);
  const [board, setBoard] = useState("safety");
  const router = useRouter();

  useEffect(() => { getRestaurants().then(setRests); }, []);

  if (rests === null) return <div className="wrap"><Header /><div className="loading">Counting the votes…</div></div>;

  const rated = rests.filter(r => r.scores && r.scores.review_count > 0);
  const field = board === "safety" ? "avg_gf" : "avg_overall";
  const ranked = rated.slice().sort((a, b) => (b.scores[field] ?? -1) - (a.scores[field] ?? -1));

  return (
    <div className="wrap">
      <Header />
      <div className="view">
        <div className="map-toggle" style={{ marginBottom: 22 }}>
          <button className={"gf " + (board === "safety" ? "on" : "")} onClick={() => setBoard("safety")}>Safest</button>
          <button className={"overall " + (board === "overall" ? "on" : "")} onClick={() => setBoard("overall")}>Best food</button>
        </div>

        <div className="list-head" style={{ marginTop: 0 }}>
          {board === "safety" ? "Safest for celiacs" : "Best food"} — ranked by {board === "safety" ? "GF safety" : "overall"} score
        </div>

        {ranked.length === 0
          ? <div className="empty"><div className="big">No ranked places yet.</div>Reviews are what build the leaderboard — search a restaurant and be the first.</div>
          : <div className="rlist">
              {ranked.map((r, i) => {
                const s = r.scores;
                const primary = board === "safety" ? s.avg_gf : s.avg_overall;
                const secondary = board === "safety" ? s.avg_overall : s.avg_gf;
                const primaryClass = board === "safety" ? "gf-num" : "overall-num";
                const secondaryClass = board === "safety" ? "overall-num" : "gf-num";
                return (
                  <div key={r.id} className="rcard" onClick={() => router.push("/restaurant/" + r.id)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                      <div className="rank-badge">{i + 1}</div>
                      <div>
                        <h3 className="rcard-name">{r.name}</h3>
                        <div className="rcard-meta">
                          {[r.neighborhood, r.cuisine].filter(Boolean).map((m, idx) => (
                            <span key={idx}>{idx > 0 && <span className="dot">●</span>}{m}</span>
                          ))}
                        </div>
                        {s.reacted_bad > 0 && <div className="react-line"><span className="bad">{s.reacted_bad} got sick</span></div>}
                      </div>
                    </div>
                    <div className="rcard-scores">
                      <div className="score-box">
                        <div className="score-label">{board === "safety" ? "GF Safety" : "Overall"}</div>
                        <div className={"score-num " + primaryClass}>{fmtAvg(primary)}<span className="of">/10</span></div>
                        <div className="rcount">{s.review_count} review{s.review_count !== 1 ? "s" : ""}</div>
                      </div>
                      <div className="score-box">
                        <div className="score-label">{board === "safety" ? "Overall" : "GF Safety"}</div>
                        <div className={"score-num " + secondaryClass}>{fmtAvg(secondary)}<span className="of">/10</span></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>}
      </div>
    </div>
  );
}
