import { FOURSQUARE_KEY } from "../../../lib/config";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  if (q.trim().length < 2) return Response.json({ results: [] });

  const url = "https://places-api.foursquare.com/places/search"
    + "?query=" + encodeURIComponent(q)
    + "&ll=40.7580,-73.9855"
    + "&radius=20000"
    + "&limit=8";

  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": "Bearer" + FOURSQUARE_KEY,
        "X-Places-Api-Version": "2025-06-17",
        "accept": "application/json"
      }
    });
    if (!res.ok) {
      const text = await res.text();
      return Response.json({ results: [], error: "Foursquare " + res.status + ": " + text }, { status: 200 });
    }
    const data = await res.json();
    const results = (data.results || []).map(function (p) {
      return {
        fsq_id: p.fsq_place_id || p.fsq_id,
        name: p.name,
        neighborhood: (p.location && p.location.locality) || "",
        address: (p.location && p.location.address || p.location.formatted_address) || "",
        lat: p.latitude != null ? p.latitude : (p.geocodes && p.geocodes.main ? p.geocodes.main.latitude : null),
        lng: p.longitude != null ? p.longitude : (p.geocodes && p.geocodes.main ? p.geocodes.main.longitude : null)
      };
    });
    return Response.json({ results: results });
  } catch (e) {
    return Response.json({ results: [], error: String(e) }, { status: 200 });
  }
}
