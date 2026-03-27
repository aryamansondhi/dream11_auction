import React, { useState } from "react";
import { V, ROLE_COLORS, IPL_BRANDS, TEAM_COLORS } from "../tokens";

// ── Primitive helpers ─────────────────────────────────────────────────────────

export const GradientText = ({ children, style }) => (
  <span style={{
    background: V.gradSunset,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    fontFamily: V.fontHead,
    ...style,
  }}>{children}</span>
);

export const NeonText = ({ children, color = V.cyan, size = 13, style }) => (
  <span style={{
    color,
    fontFamily: V.fontMono,
    fontSize: size,
    textShadow: `0 0 8px ${color}`,
    ...style,
  }}>{children}</span>
);

// ── Section label ─────────────────────────────────────────────────────────────
export const SectionLabel = ({ children, style }) => (
  <div style={{
    fontFamily: V.fontMono,
    fontSize: 10,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: V.magenta,
    textShadow: `0 0 6px ${V.magenta}`,
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
    gap: 8,
    ...style,
  }}>
    <span style={{ color: V.magenta }}>▶</span>
    {children}
  </div>
);

// ── Divider ───────────────────────────────────────────────────────────────────
export const Divider = ({ margin = "16px 0" }) => (
  <div style={{
    height: 1,
    background: `linear-gradient(to right, ${V.magenta}60, ${V.cyan}60, transparent)`,
    margin,
  }} />
);

// ── Terminal Card ─────────────────────────────────────────────────────────────
export const Card = ({ children, style, onClick, accentColor, terminal = false }) => {
  const accent = accentColor || V.cyan;
  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(26,16,60,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${V.border}`,
        borderTop: `2px solid ${accent}`,
        boxShadow: onClick ? undefined : `inset 0 0 30px rgba(0,0,255,0.05)`,
        position: "relative",
        ...(onClick ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ── Terminal Window ───────────────────────────────────────────────────────────
export const TerminalCard = ({ title, children, style, accentColor }) => {
  const accent = accentColor || V.cyan;
  return (
    <div style={{
      background: "rgba(0,0,0,0.8)",
      border: `2px solid ${accent}`,
      boxShadow: `0 0 20px rgba(0,255,255,0.15)`,
      ...style,
    }}>
      <div style={{
        background: `rgba(0,255,255,0.08)`,
        borderBottom: `1px solid ${accent}`,
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: V.magenta, boxShadow: V.glowM }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: V.cyan, boxShadow: V.glowC }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: V.orange, boxShadow: V.glowO }} />
        </div>
        {title && <span style={{ fontFamily: V.fontMono, fontSize: 11, color: accent, marginLeft: 6, letterSpacing: "0.1em" }}>{title}</span>}
      </div>
      <div>{children}</div>
    </div>
  );
};

// ── Primary button (skewed, un-skews on hover) ────────────────────────────────
export const PrimaryBtn = ({ children, onClick, disabled, style }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        width: "100%",
        padding: "12px 20px",
        background: disabled ? "transparent" : hovered ? V.cyan : "transparent",
        border: `2px solid ${disabled ? V.border : V.cyan}`,
        color: disabled ? V.sub : hovered ? "#000" : V.cyan,
        fontFamily: V.fontMono,
        fontSize: 12,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        transform: hovered && !disabled ? "skewX(0deg)" : "skewX(-4deg)",
        boxShadow: hovered && !disabled ? V.glowC : "none",
        transition: "all 0.15s linear",
        textShadow: hovered && !disabled ? "none" : `0 0 8px ${V.cyan}`,
        ...style,
      }}
    >
      <span style={{ display: "inline-block", transform: hovered ? "skewX(0deg)" : "skewX(4deg)", transition: "transform 0.15s linear" }}>
        {children}
      </span>
    </button>
  );
};

// ── Ghost button ──────────────────────────────────────────────────────────────
export const GhostBtn = ({ children, onClick, style }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,0,255,0.1)" : "transparent",
        border: `1px solid ${hovered ? V.magenta : V.border}`,
        color: hovered ? V.magenta : V.sub,
        fontFamily: V.fontMono,
        fontSize: 11,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "7px 14px",
        cursor: "pointer",
        transition: "all 0.15s linear",
        textShadow: hovered ? `0 0 6px ${V.magenta}` : "none",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

// ── Neon input ────────────────────────────────────────────────────────────────
export const Input = ({ style, ...props }) => (
  <input
    style={{
      background: "rgba(0,0,0,0.6)",
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      borderBottom: `2px solid ${V.magenta}`,
      color: V.cyan,
      fontFamily: V.fontMono,
      fontSize: 13,
      padding: "8px 10px",
      width: "100%",
      outline: "none",
      letterSpacing: "0.05em",
      transition: "border-color 0.15s, box-shadow 0.15s",
      ...style,
    }}
    onFocus={e => { e.target.style.borderBottomColor = V.cyan; e.target.style.boxShadow = `0 4px 15px rgba(0,255,255,0.3)`; }}
    onBlur={e => { e.target.style.borderBottomColor = V.magenta; e.target.style.boxShadow = "none"; }}
    {...props}
  />
);

// ── Neon select ───────────────────────────────────────────────────────────────
export const Select = ({ children, style, ...props }) => (
  <select
    style={{
      background: "rgba(0,0,0,0.6)",
      border: `1px solid ${V.border}`,
      borderBottom: `2px solid ${V.magenta}`,
      color: V.text,
      fontFamily: V.fontMono,
      fontSize: 12,
      padding: "8px 10px",
      width: "100%",
      outline: "none",
      letterSpacing: "0.05em",
      cursor: "pointer",
      ...style,
    }}
    {...props}
  >
    {children}
  </select>
);

// ── Label ─────────────────────────────────────────────────────────────────────
export const Label = ({ children }) => (
  <div style={{
    fontFamily: V.fontMono,
    fontSize: 9,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: V.magenta,
    marginBottom: 6,
    textShadow: `0 0 4px ${V.magenta}`,
  }}>{children}</div>
);

// ── Error box ─────────────────────────────────────────────────────────────────
export const ErrorBox = ({ message }) => !message ? null : (
  <div style={{
    fontFamily: V.fontMono,
    fontSize: 12,
    color: V.red,
    padding: "10px 14px",
    background: "rgba(255,51,102,0.08)",
    border: `1px solid rgba(255,51,102,0.4)`,
    marginBottom: 16,
    letterSpacing: "0.05em",
  }}>
    ⚠ {message}
  </div>
);

// ── Spinner ───────────────────────────────────────────────────────────────────
export const Spinner = ({ label = "Loading…" }) => (
  <div style={{ textAlign: "center", padding: "40px 0", fontFamily: V.fontMono, color: V.cyan, fontSize: 12, letterSpacing: "0.1em" }}>
    <div style={{ fontSize: 24, marginBottom: 10, animation: "vpPulse 1.5s ease-in-out infinite" }}>◈</div>
    {label}
    <span className="vp-blink" style={{ color: V.magenta }}>_</span>
  </div>
);

// ── Stat number ───────────────────────────────────────────────────────────────
export const StatNumber = ({ value, color, size = 22, glow = true }) => (
  <span style={{
    fontSize: size,
    fontWeight: 700,
    fontFamily: V.fontHead,
    color: color || V.text,
    textShadow: glow ? `0 0 10px ${color || V.cyan}` : "none",
    lineHeight: 1,
  }}>{value}</span>
);

// ── Role pill ─────────────────────────────────────────────────────────────────
export const RolePill = ({ role }) => {
  const color = ROLE_COLORS[role] || V.sub;
  const short = role === "Wicket-Keeper" ? "WK" : role === "All-Rounder" ? "AR" : role.slice(0, 3).toUpperCase();
  return (
    <span style={{
      fontFamily: V.fontMono,
      fontSize: 9,
      padding: "2px 7px",
      background: color + "15",
      color,
      border: `1px solid ${color}40`,
      letterSpacing: "0.1em",
      textShadow: `0 0 4px ${color}`,
    }}>{short}</span>
  );
};

// ── Pill ──────────────────────────────────────────────────────────────────────
export const Pill = ({ label, color }) => (
  <span style={{
    fontFamily: V.fontMono,
    fontSize: 9,
    padding: "2px 8px",
    background: (color || V.cyan) + "15",
    color: color || V.cyan,
    border: `1px solid ${(color || V.cyan)}40`,
    letterSpacing: "0.1em",
  }}>{label}</span>
);

// ── Confidence badge ──────────────────────────────────────────────────────────
export const ConfidenceBadge = ({ confidence }) => {
  const pct = Math.round(confidence * 100);
  const color = pct >= 90 ? V.green : pct >= 70 ? V.orange : V.red;
  return (
    <span style={{ fontFamily: V.fontMono, fontSize: 10, padding: "2px 7px", background: color + "15", color, border: `1px solid ${color}40`, letterSpacing: "0.06em" }}>
      {pct}%
    </span>
  );
};

// ── Trade counter ─────────────────────────────────────────────────────────────
export const TradeCounter = ({ used, max, compact = false }) => {
  const remaining = max - used;
  const pct = (used / max) * 100;
  const color = remaining > 5 ? V.green : remaining > 2 ? V.orange : V.red;

  if (compact) return (
    <span style={{ fontFamily: V.fontMono, fontSize: 9, padding: "2px 8px", background: color + "15", color, border: `1px solid ${color}40`, letterSpacing: "0.08em", textShadow: `0 0 4px ${color}`, whiteSpace: "nowrap" }}>
      {remaining}/{max} TRADES
    </span>
  );

  return (
    <div style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${V.border}`, padding: "10px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontFamily: V.fontMono, fontSize: 9, letterSpacing: "0.15em", color: V.sub, textTransform: "uppercase" }}>Trades remaining</span>
        <span style={{ fontFamily: V.fontHead, fontSize: 18, color, textShadow: `0 0 8px ${color}` }}>{remaining}<span style={{ fontSize: 11, fontFamily: V.fontMono, color: V.sub }}>/{max}</span></span>
      </div>
      <div style={{ height: 3, background: V.muted, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(to right, ${V.magenta}, ${color})`, transition: "width 0.8s ease", boxShadow: `0 0 6px ${color}` }} />
      </div>
      {remaining === 0 && <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.red, marginTop: 6, textShadow: `0 0 4px ${V.red}` }}>⚠ TRADE LIMIT REACHED</div>}
    </div>
  );
};

// ── Team Badge ───────────────────────────────────────────────────────────────
// SVG-based IPL team badge — official team colors
export const TeamBadge = ({ iplTeam, size = 28 }) => {
  const brand = IPL_BRANDS[iplTeam] || { primary: "#444", secondary: "#888", text: "#fff", bg: "#111" };
  const [imgErr, setImgErr] = useState(false);

  return (
    <div style={{
      width: size, height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle at 35% 35%, ${brand.primary}, ${brand.bg})`,
      border: `1.5px solid ${brand.secondary}60`,
      boxShadow: `0 0 8px ${brand.primary}50, inset 0 0 6px rgba(0,0,0,0.4)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 2, borderRadius: "50%", border: `1px solid ${brand.secondary}40` }} />
      {!imgErr ? (
        <img
          src={`/logos/${iplTeam}.png`}
          alt={iplTeam}
          onError={() => setImgErr(true)}
          style={{
            width: "78%",
            height: "78%",
            objectFit: "contain",
            position: "relative",
            zIndex: 1,
            filter: "drop-shadow(0 0 3px rgba(0,0,0,0.8))",
          }}
        />
      ) : (
        <span style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: size * 0.28,
          fontWeight: 900,
          color: brand.text || "#fff",
          letterSpacing: "-0.04em",
          lineHeight: 1,
          textShadow: `0 0 6px ${brand.secondary}`,
          position: "relative",
          zIndex: 1,
        }}>{iplTeam}</span>
      )}
    </div>
  );
};

// ── Player Row (reusable with gradient hover) ─────────────────────────────────
export const PlayerRow = ({ player, rightContent, onClick, style, extraCols, children }) => {
  const [hovered, setHovered] = useState(false);
  const teamColor = TEAM_COLORS[player.iplTeam] || "#888";
  

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 14px",
        background: hovered
          ? `linear-gradient(to right, ${teamColor}18, ${teamColor}08, transparent)`
          : "transparent",
        borderLeft: hovered ? `2px solid ${teamColor}80` : "2px solid transparent",
        transition: "all 0.15s ease",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      <TeamBadge iplTeam={player.iplTeam} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {children || (rightContent !== undefined ? rightContent : (
          <>
            <div style={{ fontFamily: V.fontHead, fontSize: 11, color: V.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</div>
            <div style={{ display: "flex", gap: 5, marginTop: 2, alignItems: "center", flexWrap: "wrap" }}>
              <RolePill role={player.role} />
              <span style={{ fontFamily: V.fontMono, fontSize: 9, color: teamColor, textShadow: `0 0 3px ${teamColor}`, letterSpacing: "0.06em" }}>{player.iplTeam}</span>
            </div>
          </>
        ))}
      </div>
      {extraCols}
      {/* children slot */}
    </div>
  );
};