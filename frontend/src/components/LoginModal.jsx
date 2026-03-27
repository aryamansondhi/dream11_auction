import { useState } from "react";
import { useStore } from "../store";
import { V } from "../tokens";
import { Input, PrimaryBtn, GhostBtn, ErrorBox } from "./UI";

export default function LoginModal({ onClose }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useStore(s => s.login);

  const submit = async () => {
    setLoading(true); setErr("");
    try { await login(pw); onClose(); }
    catch (e) { setErr(e.error || "ACCESS DENIED"); }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(9,0,20,0.9)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Terminal window */}
      <div className="vp-animate-in" style={{
        width: 340,
        background: "rgba(0,0,0,0.92)",
        border: `2px solid ${V.cyan}`,
        boxShadow: V.glowCBig,
      }}>
        {/* Title bar */}
        <div style={{ background: "rgba(0,255,255,0.08)", borderBottom: `1px solid ${V.cyan}`, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: V.magenta, boxShadow: V.glowM }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: V.cyan, boxShadow: V.glowC }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: V.orange, boxShadow: V.glowO }} />
          </div>
          <span style={{ fontFamily: V.fontMono, fontSize: 10, color: V.cyan, letterSpacing: "0.1em" }}>ADMIN_AUTH.EXE</span>
        </div>

        <div style={{ padding: "20px 20px 20px" }}>
          <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.cyan, letterSpacing: "0.12em", marginBottom: 4, textShadow: `0 0 6px ${V.cyan}` }}>
            CLEARANCE REQUIRED
          </div>
          <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.sub, marginBottom: 20, letterSpacing: "0.06em" }}>
            Enter admin credentials to access Control Center.
          </div>

          <ErrorBox message={err} />

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.magenta, marginBottom: 6 }}>
              &gt; PASSWORD_
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={pw}
              onChange={e => { setPw(e.target.value); setErr(""); }}
              onKeyDown={e => e.key === "Enter" && submit()}
              autoFocus
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryBtn onClick={submit} disabled={loading} style={{ flex: 1, width: "auto" }}>
              {loading ? "Authenticating…" : "▶ Login"}
            </PrimaryBtn>
            <GhostBtn onClick={onClose}>✕ Cancel</GhostBtn>
          </div>
        </div>
      </div>
    </div>
  );
}
