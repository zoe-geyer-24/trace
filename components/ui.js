export function fmtAvg(n) {
  if (n === null || n === undefined) return "—";
  return (Math.round(Number(n) * 10) / 10).toString();
}

export function ScorePair({ scores, size }) {
  const o = scores?.avg_overall ?? null;
  const g = scores?.avg_gf ?? null;
  const n = scores?.review_count ?? 0;
  return (
    <div className="rcard-scores">
      <div className="score-box">
        <div className="score-label">Overall</div>
        <div className={"score-num overall-num " + (o === null ? "none" : "")} style={size ? { fontSize: size } : {}}>
          {fmtAvg(o)}{o !== null && <span className="of">/10</span>}
        </div>
        <div className="rcount">{n} review{n !== 1 ? "s" : ""}</div>
      </div>
      <div className="score-box">
        <div className="score-label">GF Safety</div>
        <div className={"score-num gf-num " + (g === null ? "none" : "")} style={size ? { fontSize: size } : {}}>
          {fmtAvg(g)}{g !== null && <span className="of">/10</span>}
        </div>
        <div className="rcount">{n ? "averaged" : "no ratings"}</div>
      </div>
    </div>
  );
}
