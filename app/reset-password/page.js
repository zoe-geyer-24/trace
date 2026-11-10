"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { supabase, updatePassword } from "../../lib/db";

// Users land here from the "reset your password" email link.
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function save() {
    setErr("");
    if (password.length < 6) { setErr("Password needs at least 6 characters."); return; }
    if (password !== confirm) { setErr("The two passwords don't match."); return; }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) { setErr(error); return; }
    setDone(true);
    setTimeout(() => { router.push("/"); router.refresh(); }, 1500);
  }

  return (
    <div className="wrap">
      <Header />
      <div className="auth-page">
        <div className="modal" style={{ boxShadow: "0 2px 0 var(--shadow)", border: "1px solid var(--rule)" }}>
          <h2>Set a new password</h2>
          {done
            ? <div className="hint">Password updated. Taking you back to Trace…</div>
            : !ready
              ? <div className="hint">Checking your reset link… If nothing happens, request a new link from the sign-in page.</div>
              : <>
                  <div className="field"><label>New password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></div>
                  <div className="field"><label>Confirm new password</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
                  {err && <div className="err">{err}</div>}
                  <div className="modal-actions">
                    <button className="btn btn-sage" onClick={save} disabled={busy}>{busy ? "…" : "Save new password"}</button>
                  </div>
                </>}
        </div>
      </div>
    </div>
  );
}
