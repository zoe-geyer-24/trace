"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMyProfile, signOut } from "../lib/db";

export default function Header() {
  const [me, setMe] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => { getMyProfile().then(p => { setMe(p); setLoaded(true); }); }, [path]);

  async function handleSignOut() { await signOut(); setMe(null); router.push("/"); router.refresh(); }

  // Inside the iOS app there is no browser back button or swipe-back, so every page
  // that isn't a main tab gets a Back link. Pages with their own Back are skipped.
  const TABS = ["/", "/map", "/recommendations", "/following", "/account"];
  const OWN_BACK = ["/restaurant/", "/near-me"];
  const showBack = !TABS.includes(path) && !OWN_BACK.some(pre => path.startsWith(pre));
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }

  const tab = (href, label) => (
    <Link href={href} className={path === href ? "on" : ""}>{label}</Link>
  );

  return (
    <>
      <header className="masthead">
        <div className="eyebrow">Gluten-free New York, rated by people who can't cheat</div>
        <h1 className="title">Tra<span className="accent">ce</span></h1>
        <div className="subtitle">Because the difference between safe and sorry is measured in traces. Two scores out of ten: how good, and how safe.</div>
      </header>
      <nav className="nav">
        {tab("/", "Browse")}
        {tab("/map", "Map")}
        {tab("/recommendations", "For You")}
        {tab("/following", "Following")}
        {tab("/account", "My account")}
        <span className="who">
          {loaded && (me
            ? <>Signed in as <b>{me.username}</b> · <button className="btn-link" onClick={handleSignOut}>Sign out</button></>
            : <Link className="btn-link" href="/login">Sign in / sign up</Link>)}
        </span>
      </nav>
      {showBack && <div className="back header-back"><button className="btn-link" onClick={goBack}>← Back</button></div>}
    </>
  );
}
