"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { getRestaurants } from "../../lib/db";

export default function MapPage() {
  const [rests, setRests] = useState(null);
  const [mode, setMode] = useState("gf");
  const [nearMsg, setNearMsg] = useState("");
  const [bestNear, setBestNear] = useState(null);
  const [showBest, setShowBest] = useState(false);
  const [findingBest, setFindingBest] = useState(false);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const layerRef = useRef(null);
  const router = useRouter();

  useEffect(() => { getRestaurants().then(setRests); }, []);

  useEffect(() => {
    if (!rests || leafletMap.current || !mapRef.current) return;
    const L = require("leaflet");
    leafletMap.current = L.map(mapRef.current, { scrollWheelZoom: true }).setView([40.745, -73.985], 12.4);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { attribution: "&copy; OpenStreetMap &copy; CARTO", subdomains: "abcd", maxZoom: 19 }).addTo(leafletMap.current);
    layerRef.current = L.layerGroup().addTo(leafletMap.current);
    drawMarkers();
  }, [rests]);

  useEffect(() => { drawMarkers(); }, [mode]);

  function color(v) { if (v == null) return "#c4b9a3"; if (v >= 8) return "#4a6b54"; if (v >= 5) return "#c8732e"; return "#b83227"; }

  function drawMarkers() {
    if (!layerRef.current || !rests) return;
    const L = require("leaflet");
    layerRef.current.clearLayers();
    rests.forEach(r => {
      if (typeof r.lat !== "number" || typeof r.lng !== "number") return;
      const v = mode === "gf" ? r.scores?.avg_gf : r.scores?.avg_overall;
      const val = v == null ? null : Number(v);
      const n = r.scores?.review_count || 0;
      const bad = r.scores?.reacted_bad || 0;
      const m = L.circleMarker([r.lat, r.lng], { radius: 11, fillColor: color(val), color: "#fff", weight: 2, fillOpacity: .92 });
      m.bindPopup(`<div style="font-family:'Helvetica Neue',Arial,sans-serif">
        <b style="font-family:Georgia,serif;font-size:15px">${r.name}</b><br>${r.neighborhood || ""}<br>
        <span style="font-weight:800;color:${color(val)}">${val == null ? "—" : Math.round(val*10)/10}${val != null ? " / 10" : ""}</span> ${mode === "gf" ? "GF Safety" : "Overall"}
        <span style="color:#8a7d6b"> · ${n} review${n !== 1 ? "s" : ""}</span>
        ${bad ? `<br><span style="color:#b83227;font-weight:700">${bad} reported getting sick</span>` : ""}
        <br><a href="/restaurant/${r.id}" style="color:#9c4f1a;font-weight:700">See reviews →</a></div>`);
      layerRef.current.addLayer(m);
    });
  }

  // distance in miles between two lat/lng points
  function distanceMiles(lat1, lng1, lat2, lng2) {
    const toRad = d => d * Math.PI / 180;
    const R = 3958.8;
    const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function findBestNearYou() {
    if (!navigator.geolocation) { setNearMsg("Location isn't available in this browser."); return; }
    setFindingBest(true); setNearMsg("");
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      const L = require("leaflet");
      leafletMap.current.setView([latitude, longitude], 14);
      L.circleMarker([latitude, longitude], { radius: 9, fillColor: "#2b6cb0", color: "#fff", weight: 3, fillOpacity: 1 })
        .bindPopup("You are here").addTo(layerRef.current);

      const candidates = (rests || [])
        .filter(r => typeof r.lat === "number" && typeof r.lng === "number")
        .filter(r => r.scores && r.scores.review_count > 0 && r.scores.avg_gf != null && r.scores.avg_overall != null)
        .map(r => {
          const dist = distanceMiles(latitude, longitude, r.lat, r.lng);
          const combined = (Number(r.scores.avg_gf) * 0.5) + (Number(r.scores.avg_overall) * 0.5);
          return { ...r, _dist: dist, _combined: combined };
        })
        .filter(r => r._dist <= 2)
        .sort((a, b) => b._combined - a._combined)
        .slice(0, 5);

      setBestNear(candidates);
      setShowBest(true);
      setFindingBest(false);
    }, () => { setNearMsg("Couldn't get your location (permission denied?)."); setFindingBest(false); });
  }

  return (
    <div className="wrap">
      <Header />
      <div className="view" style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
          <div className="map-toggle">
            <button className={"gf " + (mode === "gf" ? "on" : "")} onClick={() => setMode("gf")}>GF Safety</button>
            <button className={"overall " + (mode === "overall" ? "on" : "")} onClick={() => setMode("overall")}>Overall</button>
          </div>
          <span style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif", fontSize: 12, color: "#8a7d6b" }}>{nearMsg}</span>
        </div>

        <div style={{ position: "relative" }}>
          <div id="map" ref={mapRef}></div>

          <button className="best-near-btn" onClick={findBestNearYou} disabled={findingBest}>
            {findingBest ? "Finding…" : "★ Best near you"}
          </button>

          {showBest && (
            <div className="best-panel">
              <div className="best-panel-head">
                <span>Best near you</span>
                <button className="best-close" onClick={() => setShowBest(false)}>✕</button>
              </div>
              {(!bestNear || bestNear.length === 0)
                ? <div className="best-empty">No rated places within 2 miles yet. Review some spots nearby and they'll show up here.</div>
                : bestNear.map((r, i) => (
                  <div key={r.id} className="best-item" onClick={() => router.push("/restaurant/" + r.id)}>
                    <div className="best-rank">{i + 1}</div>
                    <div className="best-info">
                      <div className="best-name">{r.name}</div>
                      <div className="best-meta">{r._dist.toFixed(1)} mi away</div>
                    </div>
                    <div className="best-scores">
                      <div><span className="best-lbl">GF</span> <b style={{ color: "var(--sage)" }}>{Math.round(r.scores.avg_gf * 10) / 10}</b></div>
                      <div><span className="best-lbl">Food</span> <b style={{ color: "var(--rye-deep)" }}>{Math.round(r.scores.avg_overall * 10) / 10}</b></div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="map-legend">
          <span><span className="legend-dot" style={{ background: "#4a6b54" }}></span>Safe / great (8–10)</span>
          <span><span className="legend-dot" style={{ background: "#c8732e" }}></span>Mixed (5–7.9)</span>
          <span><span className="legend-dot" style={{ background: "#b83227" }}></span>Risky / poor (0–4.9)</span>
          <span><span className="legend-dot" style={{ background: "#c4b9a3" }}></span>No ratings yet</span>
        </div>
      </div>
    </div>
  );
}
