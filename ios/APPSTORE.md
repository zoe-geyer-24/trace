# Trace iOS App — Build & App Store Guide

The `ios/` folder is a native iOS app (built with [Capacitor](https://capacitorjs.com)) that wraps the deployed Trace web app. The native shell loads the live site, so the Foursquare API key and the `/api/*` routes stay server-side, and every web deploy updates the app instantly with no App Store re-review.

## How it's wired

- `capacitor.config.json` (repo root) points the shell at the deployed web app via `server.url`. It currently uses the test deployment `https://trace-one-bay.vercel.app`. **Before submitting, change this to the production deployment URL** and run `npx cap sync ios`.
- `appId` is `com.zoegeyer.trace`. This becomes the bundle ID. You can change it to anything you like **before** the first App Store submission; after the app is published it can never change.
- `ios-shell/` is a tiny offline-fallback page shown only if the device has no connection at launch.
- App icons and splash screens were generated from `assets/logo.png` (the newspaper-style Trace icon on paper `#f7f3e9`). To regenerate: `npx @capacitor/assets generate --ios --iconBackgroundColor '#f7f3e9' --splashBackgroundColor '#f7f3e9'`.
- `Info.plist` already includes a location-permission string (for "near me") and the encryption-exemption flag that skips one export-compliance question per release.

## Build locally

```bash
npm install
npx cap sync ios
npx cap open ios   # opens Xcode
```

Then press Run in Xcode to launch in the simulator. Requires full Xcode (not just Command Line Tools) selected as the active developer directory:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

## Shipping to the App Store (one-time setup)

1. **Enroll in the Apple Developer Program** at https://developer.apple.com/programs/ ($99/year, personal enrollment is fine; needs an Apple ID with two-factor auth). Approval usually takes a day or two.
2. In Xcode, open `ios/App/App.xcodeproj`, select the **App** target → Signing & Capabilities, sign in with your Apple ID, and pick your team. Xcode manages certificates automatically.
3. Create the app record at https://appstoreconnect.apple.com → My Apps → "+" → New App, with the same bundle ID (`com.zoegeyer.trace`).
4. In Xcode: Product → Archive → Distribute App → App Store Connect. This uploads the build.
5. Test through **TestFlight** first (App Store Connect → TestFlight tab) — install on your own phone, invite friends by email.
6. Fill in the listing (screenshots from the simulator are fine, description, keywords, support URL) and submit for review.

## Things Apple will check (do these before submitting)

- **Demo account**: because Trace has sign-in, the review form requires a working demo email + password. Make a throwaway account and put it in the review notes.
- **Account deletion**: Apple requires apps with account creation to offer in-app account deletion. Built — "Delete account" on the Account page, backed by `/api/delete-account`. It needs one env var in Vercel: `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → service_role secret; never commit it). Until it's set, the button shows a friendly "not configured" message.
- **Privacy policy URL**: required for any app with accounts. Built — live at `/privacy`; use that URL in App Store Connect.
- **App Privacy questionnaire** in App Store Connect: declare Email Address + User Content (reviews), linked to identity, not used for tracking.
- **Wrapper-app rule (guideline 4.2)**: Apple sometimes rejects thin website wrappers. Trace is a real interactive app (accounts, reviews, maps, location), which is normally fine. If it's ever rejected on 4.2, the fix is adding a native touch or two (push notifications, native geolocation prompt) — ask Ian.

## Day-to-day after launch

- Web changes (deployed to Vercel) appear in the app immediately — no new build needed.
- A new App Store build is only needed when the native shell changes (icon, splash, permissions, Capacitor plugins, the `server.url`). Bump the version in Xcode (App target → General → Version), Archive, upload, submit.
