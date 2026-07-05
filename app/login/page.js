"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { signUp, signIn } from "../../lib/db";

const SENSITIVITIES = [
  "Celiac disease", "Non-celiac gluten sensitivity", "Wheat allergy",
  "Gluten ataxia", "Dermatitis herpetiformis", "Avoiding by choice"
];

export default function LoginPage() {
  const [mode, setMode] = useState("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [sensitivity, setSensitivity] = useState(SENSITIVITIES[0]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit() {
    setErr(""); setBusy(true);
    if (!email || !password) { setErr("Email and password are required."); setBusy(false); return; }
    if (mode === "up") {
      if (!username.trim()) { setErr("Pick a username."); setBusy(false); return; }
      if (password.length < 6) { setErr("Password needs at least 6 characters."); setBusy(false); return; }
      const { error } = await signUp(email.trim(), password, username.trim(), sensitivity);
      if (error) { setErr(error); setBusy(false); return; }
    } else {
      const { error } = await signIn(email.trim(), password);
      if (error) { setErr(error); setBusy(false); return; }
    }
    router.push("/"); router.refresh();
  }

  return (
    <div className="wrap">
      <Header />
      <div className="auth-page">
        <div className="modal" style={{ boxShadow: "0 2px 0 var(--shadow)", border: "1px solid var(--rule)" }}>
          <h2>{mode === "up" ? "Create your account" : "Sign in"}</h2>
          <div className="hint">So your reviews are tied to you and other celiacs know your sensitivity.</div>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            {mode === "up" && <div className="sub">At least 6 characters. Stored securely by Supabase.</div>}</div>
          {mode === "up" && <>
            <div className="field"><label>Username</label><input value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. crumbhunter" /></div>
            <div className="field"><label>Your gluten sensitivity</label>
              <select value={sensitivity} onChange={e => setSensitivity(e.target.value)}>
                {SENSITIVITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
          </>}
          {err && <div className="err">{err}</div>}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => { setMode(mode === "up" ? "in" : "up"); setErr(""); }}>
              {mode === "up" ? "I already have an account" : "Create one instead"}
            </button>
            <button className="btn btn-sage" onClick={submit} disabled={busy}>
              {busy ? "…" : (mode === "up" ? "Create account" : "Sign in")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
