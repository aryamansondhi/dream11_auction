import { useState, useEffect } from "react";
import { V } from "../tokens";
import { Input, PrimaryBtn, GhostBtn, SectionLabel, Divider } from "./UI";
import { useStore } from "../store";

export default function SettingsDrawer({ open, onClose }) {
  const [ck, setCk] = useState("");
  const [saved, setSaved] = useState(false);
  const { isAdmin } = useStore();

  useEffect(() => {
    if (open) setCk(localStorage.getItem("cricketdata_key") || "");
  }, [open]);

  const save = () => {
    localStorage.setItem("cricketdata_key", ck);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(9,0,20,0.7)" }} onClick={onClose} />
      <div className="vp-animate-in" style={{
        width: 360,
        background: "rgba(9,0,20,0.98)",
        borderLeft: `2px solid ${V.magenta}`,
        boxShadow: `inset 0 0 40px rgba(255,0,255,0.05)`,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Top accent */}
        <div style={{ height: 2, background: V.gradAccent }} />

        <div style={{ padding: 24, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div style={{ fontFamily: V.fontHead, fontSize: 14, fontWeight: 700, color: V.cyan, textShadow: `0 0 8px ${V.cyan}`, letterSpacing: "0.05em" }}>
              SYS_CONFIG
            </div>
            <GhostBtn onClick={onClose} style={{ padding: "3px 10px" }}>✕</GhostBtn>
          </div>

          <SectionLabel>CricketData API</SectionLabel>
          <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.sub, marginBottom: 10, lineHeight: 1.7, letterSpacing: "0.04em" }}>
            Required for live score tracking. Free key at{" "}
            <a href="https://cricketdata.org" target="_blank" rel="noreferrer" style={{ color: V.cyan, textDecoration: "none", textShadow: `0 0 4px ${V.cyan}` }}>cricketdata.org</a>.
          </div>
          <Input type="password" value={ck} onChange={e => setCk(e.target.value)} placeholder="Paste CricketData key…" style={{ marginBottom: 20 }} />

          <Divider />

          <SectionLabel>Anthropic API</SectionLabel>
          <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.sub, marginBottom: 10, lineHeight: 1.7, letterSpacing: "0.04em" }}>
            Powers the AI scorecard parser. Set in{" "}
            <code style={{ background: "rgba(0,255,255,0.1)", padding: "1px 5px", color: V.cyan, fontSize: 10 }}>backend/.env</code>{" "}
            as <code style={{ background: "rgba(0,255,255,0.1)", padding: "1px 5px", color: V.cyan, fontSize: 10 }}>ANTHROPIC_API_KEY</code>.
          </div>
          <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, padding: "8px 12px", background: "rgba(0,255,255,0.04)", border: `1px solid ${V.border}`, marginBottom: 20, lineHeight: 1.7 }}>
            ✦ Within this app, the key is used server-side. This slot is for external hosting only.
          </div>

          <PrimaryBtn onClick={save}>{saved ? "✓ SAVED" : "▶ Save config"}</PrimaryBtn>

          <Divider margin="24px 0 16px" />

          <div style={{ fontFamily: V.fontMono, fontSize: 10, color: "rgba(224,224,224,0.2)", lineHeight: 1.8, letterSpacing: "0.06em" }}>
            Fantasy IPL 2026 // The Grid<br />
            Backend: Express + PostgreSQL<br />
            AI: Claude (Anthropic)<br />
            Live data: CricketData.org<br />
            Scoring: CREX Points System
          </div>
        </div>
      </div>
    </div>
  );
}
