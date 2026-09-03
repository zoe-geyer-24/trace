"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { REPORT_REASONS, reportContent, blockUser } from "../lib/moderation";

// Report dialog for a review or a user. Works signed in or out.
export function ReportModal({ targetType, targetId, targetUserId, targetLabel, onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!reason) return;
    setBusy(true); setErr("");
    try {
      await reportContent({ targetType, targetId, targetUserId, targetLabel, reason, details });
      setDone(true);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {done ? (
          <>
            <h2>Thanks for the report</h2>
            <div className="hint">
              We review every report within 24 hours. Content that breaks our community
              guidelines is removed and repeat offenders lose their accounts.
            </div>
            <div className="modal-actions"><button className="btn btn-sage" onClick={onClose}>Done</button></div>
          </>
        ) : (
          <>
            <h2>Report {targetType === "user" ? "user" : "review"}</h2>
            <div className="hint">
              {targetLabel ? <>Reporting <b>{targetLabel}</b>. </> : null}
              Tell us what's wrong and we'll take a look.
            </div>
            <div className="field">
              <label>Reason</label>
              <div className="report-reasons">
                {REPORT_REASONS.map(([k, label]) => (
                  <label key={k} className="check">
                    <input type="radio" name="reason" checked={reason === k} onChange={() => setReason(k)} /> {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Details (optional)</label>
              <textarea rows={3} value={details} onChange={e => setDetails(e.target.value)} placeholder="Anything that helps us understand the problem" />
            </div>
            {err && <div className="err">{err}</div>}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-sage" onClick={submit} disabled={!reason || busy}>{busy ? "…" : "Send report"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Confirm-and-block dialog.
export function BlockModal({ userId, username, onClose, onBlocked }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function doBlock() {
    setBusy(true); setErr("");
    try { await blockUser(userId); onBlocked?.(); onClose(); }
    catch (e) { setErr(e.message); setBusy(false); }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Block {username || "this user"}?</h2>
        <div className="hint">
          You won't see their reviews, activity, or profile anywhere in Trace, and you'll stop
          following them. You can unblock from My account at any time.
        </div>
        {err && <div className="err">{err}</div>}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-sage" style={{ background: "#a33" }} onClick={doBlock} disabled={busy}>{busy ? "…" : "Block"}</button>
        </div>
      </div>
    </div>
  );
}

// Small "Report · Block" controls for content authored by someone else.
// `me` is the signed-in profile (or null). `onBlocked` lets the page refresh its list.
export function ModerationLinks({ targetType, targetId, targetUserId, targetLabel, username, me, onBlocked, className }) {
  const [show, setShow] = useState(null); // "report" | "block"
  const router = useRouter();
  if (me && me.id === targetUserId) return null;
  return (
    <>
      <span className={"mod-links " + (className || "")}>
        <button className="mod-link" onClick={e => { e.stopPropagation(); setShow("report"); }}>Report</button>
        <span className="mod-sep">·</span>
        <button className="mod-link" onClick={e => { e.stopPropagation(); me ? setShow("block") : router.push("/login"); }}>Block</button>
      </span>
      {show === "report" && <ReportModal targetType={targetType} targetId={targetId} targetUserId={targetUserId} targetLabel={targetLabel} onClose={() => setShow(null)} />}
      {show === "block" && <BlockModal userId={targetUserId} username={username} onClose={() => setShow(null)} onBlocked={onBlocked} />}
    </>
  );
}
