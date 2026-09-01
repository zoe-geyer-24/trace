import Header from "../../components/Header";

export const metadata = { title: "Privacy Policy — Trace" };

const S = { maxWidth: 640, lineHeight: 1.65, fontSize: 15 };
const H = { marginTop: 28, marginBottom: 8 };

export default function PrivacyPage() {
  return (
    <div className="wrap">
      <Header />
      <div className="view" style={S}>
        <h1 style={{ marginBottom: 4 }}>Privacy Policy</h1>
        <p style={{ opacity: 0.7, fontStyle: "italic" }}>Last updated: September 1, 2026</p>

        <p>
          Trace is a community for finding and reviewing gluten-free-friendly restaurants.
          This page explains what information we collect and what we do with it.
        </p>

        <h3 style={H}>What we collect</h3>
        <p>
          When you create an account we store your email address and password
          (passwords are hashed; we never see them). Your profile — username, gluten
          sensitivity, bio, and optional photo — plus the reviews, ratings, photos,
          lists, and follows you create are stored so the app can work. Reviews,
          profiles, and photos you post are visible to other users.
        </p>

        <h3 style={H}>What we don't do</h3>
        <p>
          We don't sell your data, we don't share it with advertisers, and we don't
          use it for tracking across other apps or websites. We don't collect your
          precise location — if you use a "near me" feature, your location is used
          on your device to run the search and isn't stored.
        </p>

        <h3 style={H}>Where it lives</h3>
        <p>
          Data is stored with Supabase, our database and authentication provider.
          Restaurant search results come from Foursquare; your search terms are sent
          to them to find places, without your identity attached.
        </p>

        <h3 style={H}>Deleting your account</h3>
        <p>
          You can delete your account any time from the Account page ("Delete
          account"). This permanently removes your profile, reviews, photos, lists,
          and follows.
        </p>

        <h3 style={H} id="guidelines">Community guidelines</h3>
        <p>
          Trace is built on reviews written by real people, so we hold them to a standard.
          By creating an account you agree not to post content that is abusive, hateful,
          harassing, sexually explicit, spam, or that gives false or dangerous information
          about gluten safety. We have zero tolerance for objectionable content or abusive users.
        </p>
        <p>
          Every review and every profile has a <b>Report</b> link. Reports are reviewed within
          24 hours; content that breaks these guidelines is removed and the account responsible
          is warned or deleted. You can also <b>Block</b> any user to hide their reviews and
          activity from your view; manage blocked users from My account.
        </p>

        <h3 style={H}>Contact</h3>
        <p>
          Questions, reports, or takedown requests: email{" "}
          <a href="mailto:aronalds@gmail.com">aronalds@gmail.com</a>. We respond within 24 hours.
        </p>
      </div>
    </div>
  );
}
