import { FOURSQUARE_KEY } from "../../../lib/config";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (q.trim().length < 2) return Response.json({ results: [] });

  const url = "https://api.foursquare.com/v3/places/search"
    + "?query=" + encodeURIComponent(q)
    + "&ll=40.7580,-73.9855"
    + "&radius=20000"
    + "&categories=13065"
    + "&limit=8"
    + "&fields=fsq_id,name,location,geocodes";

  try {
    const res = await fetch(url, {
      headers: { "Authorization": FOURSQUARE_KEY, "Accept": "application/json" }
    });
    if (!res.ok) {
      const text = await res.text();
      return Response.json({ results: [], error: "Foursquare " + res.status + ": " + text }, { status: 200 });
    }
    const data = await res.json();
    const results = (data.results || []).map(function (p) {
      return {
        fsq_id: p.fsq_id,
        name: p.name,
        neighborhood: (p.location && p.location.neighborhood && p.location.neighborhood[0]) || (p.location && p.location.locality) || "",
        address: (p.location && p.location.formatted_address) || "",
        lat: p.geocodes && p.geocodes.main ? p.geocodes.main.latitude : null,
        lng: p.geocodes && p.geocodes.main ? p.geocodes.main.longitude : null
      };
    });
    return Response.json({ results: results });
  } catch (e) {
    return Response.json({ results: [], error: String(e) }, { status: 200 });
  }
}