# Trace — the real app

This is the real, database-backed version of Trace, built with Next.js + Supabase.

## Getting it running in StackBlitz (no install needed)

1. Go to **stackblitz.com** and sign in (free — you can use a GitHub or Google login).
2. Click **"Create" → "Project from a folder"**, or just drag this whole `trace-app` folder into a new blank project. (Alternatively: upload this zip to a free GitHub repo, then open it in StackBlitz by visiting `stackblitz.com/github/YOUR-USERNAME/YOUR-REPO`.)
3. Open the file **`lib/config.js`**.
4. Paste your two Supabase values where it says to:
   - `SUPABASE_URL` — your Project URL
   - `SUPABASE_ANON_KEY` — your anon public key
   (both from Supabase → Settings → API)
5. StackBlitz installs everything and starts the app automatically. The preview pane on the right is your live Trace site, talking to your real database.

## What works

- Browse, search, filter, and sort restaurants
- Each restaurant's own page with averaged scores, reactions, and all reviews
- Sign up / sign in (real, secure auth via Supabase)
- Post / edit / delete your own review (with the "did you get sick" reaction, safety flags, photo link)
- Map with GF/Overall toggle and "near me"
- Follow people and see their activity feed
- Your account page: stats, want-to-go and been-there lists, your reviews

## Going live (later)

When you're ready for a public web address:
1. Push this folder to a free GitHub repo.
2. Connect it to **Vercel** (vercel.com) — it auto-detects Next.js and deploys in minutes.
3. Add a custom domain in Vercel's settings.

## Note on photos

Reviews currently take a pasted image URL. To allow real photo *uploads*, set up a Supabase Storage bucket called `review-photos` and we can wire the upload in — see the build document for details.
