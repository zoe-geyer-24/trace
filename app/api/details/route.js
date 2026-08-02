import { FOURSQUARE_KEY } from "../../../lib/config";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fsqId = searchParams.get("id") || "";
  if (!fsqId) return Response.json({ error: "no id" }, { status: 200 });

  const url = "https://places-api.foursquare.com/places/" + encodeURIComponent(fsqId)
    + "?fields=" + encodeURIComponent("fsq_place_id,name,price,categories,location");

  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": "Bearer " + FOURSQUARE_KEY,
        "X-Places-Api-Version": "2025-06-17",
        "accept": "application/json"
      }
    });
    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: "Foursquare " + res.status + ": " + text }, { status: 200 });
    }
    const p = await res.json();
    const cat = (p.categories && p.categories.length)
      ? (p.categories.find(c => /restaurant|food|cuisine/i.test(c.name || "")) || p.categories[0]).name
      : null;
    return Response.json({
      price: p.price != null ? p.price : null,
      cuisine: cat,
      raw: p
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 200 });
  }
}
