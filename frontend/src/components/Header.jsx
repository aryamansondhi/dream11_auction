import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useStore } from "../store";
import { V } from "../tokens";
import { GhostBtn } from "./UI";
import LoginModal from "./LoginModal";

const TABS = [
  { path: "/",        label: "Standings" },
  { path: "/squads",  label: "Squads"    },
  { path: "/live",    label: "Live"      },
  { path: "/control", label: "Control",  adminOnly: true },
  { path: "/rules",   label: "Rules"     },
];

export default function Header({ onSettingsOpen }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAdmin, logout, leaderboard, matches } = useStore();
  const [showLogin, setShowLogin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      <header style={{
        borderBottom: `1px solid ${V.border}`,
        background: "rgba(9,0,20,0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        {/* Top accent bar */}
        <div style={{ height: 2, background: V.gradAccent, boxShadow: `0 0 10px ${V.magenta}` }} />

        <div style={{ padding: "12px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
            {/* Logo area */}
            <div>
              <div style={{
                fontFamily: V.fontMono,
                fontSize: 9,
                letterSpacing: "0.22em",
                color: V.magenta,
                textShadow: `0 0 6px ${V.magenta}`,
                textTransform: "uppercase",
                marginBottom: 3,
              }}>
                ▶ IPL 2026 // FANTASY GRID
              </div>
              <h1 style={{
                fontFamily: V.fontHead,
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: "-0.01em",
                lineHeight: 1,
                background: V.gradSunset,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                THE GRID
              </h1>
              <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, marginTop: 3, letterSpacing: "0.06em" }}>
                {matches.length} matches ◆ {leaderboard.length} squads
              </div>
            </div>

            {/* Right controls */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              {isAdmin && (
                <div style={{ fontFamily: V.fontMono, fontSize: 9, letterSpacing: "0.15em", color: V.orange, background: "rgba(255,153,0,0.1)", border: `1px solid rgba(255,153,0,0.4)`, padding: "3px 10px", textShadow: `0 0 6px ${V.orange}` }}>
                  ADMIN
                </div>
              )}
              {isAdmin
                ? <GhostBtn onClick={logout} style={{ fontSize: 10, padding: "4px 10px" }}>EXIT</GhostBtn>
                : <GhostBtn onClick={() => setShowLogin(true)} style={{ fontSize: 10, padding: "4px 10px" }}>ADMIN</GhostBtn>
              }
              <button onClick={onSettingsOpen} style={{
                background: "transparent", border: `1px solid ${V.border}`,
                color: V.sub, padding: "4px 9px", fontSize: 14, cursor: "pointer",
                fontFamily: V.fontMono, letterSpacing: 0,
                transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = V.cyan; e.currentTarget.style.color = V.cyan; e.currentTarget.style.textShadow = `0 0 6px ${V.cyan}`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = V.border; e.currentTarget.style.color = V.sub; e.currentTarget.style.textShadow = "none"; }}
              >⚙</button>
            </div>
          </div>

          {/* Nav tabs */}
          <nav style={{ display: "flex", overflowX: "auto", gap: 0, marginLeft: -4 }}>
            {TABS.filter(t => !t.adminOnly || isAdmin).map(tab => {
              const active = pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: active ? `2px solid ${V.magenta}` : "2px solid transparent",
                    cursor: "pointer",
                    padding: "8px 16px",
                    fontFamily: V.fontMono,
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: active ? V.magenta : V.sub,
                    textShadow: active ? `0 0 8px ${V.magenta}` : "none",
                    marginBottom: -1,
                    whiteSpace: "nowrap",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.color = V.cyan; e.currentTarget.style.textShadow = `0 0 6px ${V.cyan}`; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.color = V.sub; e.currentTarget.style.textShadow = "none"; }}}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>
    </>
  );
}
