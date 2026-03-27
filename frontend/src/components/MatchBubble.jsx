import { useState, useEffect } from "react";
import { stats as statsApi, score } from "../api";
import { useStore } from "../store";
import { V, IPL_BRANDS, ROLE_COLORS } from "../tokens";
import { TeamBadge, RolePill, StatNumber, GhostBtn, PrimaryBtn, Input, Label, ErrorBox, SectionLabel } from "./UI";

// ── Confidence pill for match status ─────────────────────────────────────────
const StatusBadge = ({ status, isLive, alreadyScored }) => {
  if (alreadyScored) return <span style={{ fontFamily: V.fontMono, fontSize: 9, padding: "2px 8px", background: V.green + "15", color: V.green, border: `1px solid ${V.green}40`, letterSpacing: "0.1em" }}>✓ SCORED</span>;
  if (isLive) return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: V.fontMono, fontSize: 9, padding: "3px 10px", background: V.green + "12", color: V.green, border: `1px solid ${V.green}35`, letterSpacing: "0.1em" }}>
      <span style={{ width: 5, height: 5, background: V.green, boxShadow: `0 0 4px ${V.green}`, animation: "vpPulse 1.2s infinite" }} />
      LIVE
    </span>
  );
  return null;
};

// ── Single player card inside bubble ─────────────────────────────────────────
const BubblePlayerCard = ({ player, isAdmin, editingPoints, onPointsChange, iplTeam }) => {
  const brand = IPL_BRANDS[iplTeam] || IPL_BRANDS[player.iplTeam] || {};
  const [hovered, setHovered] = useState(false);
  const teamColor = brand.primary || "#444";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 10px",
        background: hovered ? `linear-gradient(135deg, ${teamColor}18, ${teamColor}08, transparent)` : "rgba(0,0,0,0.3)",
        borderBottom: `1px solid ${V.border}`,
        borderLeft: hovered ? `2px solid ${teamColor}70` : "2px solid transparent",
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <TeamBadge iplTeam={player.iplTeam} size={24} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span style={{ fontFamily: V.fontHead, fontSize: 11, color: V.text, fontWeight: 700 }}>{player.name}</span>
            {player.isCaptain && <span style={{ fontFamily: V.fontMono, fontSize: 8, color: V.orange, background: V.orange + "20", padding: "1px 4px" }}>C</span>}
            {player.isViceCaptain && <span style={{ fontFamily: V.fontMono, fontSize: 8, color: "#CC44FF", background: "#CC44FF20", padding: "1px 4px" }}>VC</span>}
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 2, alignItems: "center" }}>
            <RolePill role={player.role} />
            <span style={{ fontFamily: V.fontMono, fontSize: 9, color: "rgba(224,224,224,0.4)" }}>
              {player.fantasyTeam?.manager || "—"}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {isAdmin ? (
            <Input
              type="number"
              step="0.5"
              placeholder="pts"
              value={editingPoints ?? ""}
              onChange={e => onPointsChange(player.id, e.target.value === "" ? "" : parseFloat(e.target.value))}
              style={{ width: 60, textAlign: "center", fontSize: 11, padding: "4px 6px", background: "rgba(0,0,0,0.5)" }}
            />
          ) : (
            <div style={{ textAlign: "right" }}>
              <StatNumber value={player.totalPoints} color={player.totalPoints > 0 ? (brand.primary || V.cyan) : V.sub} size={15} glow={player.totalPoints > 0} />
              {player.matchCount > 0 && <div style={{ fontFamily: V.fontMono, fontSize: 8, color: V.sub }}>{player.matchCount}m</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Team column header ────────────────────────────────────────────────────────
const TeamHeader = ({ iplTeam, score }) => {
  const brand = IPL_BRANDS[iplTeam] || {};
  return (
    <div style={{
      padding: "10px 12px",
      background: `linear-gradient(135deg, ${brand.primary || "#333"}30, transparent)`,
      borderBottom: `1px solid ${brand.primary || V.border}50`,
      borderTop: `2px solid ${brand.primary || V.border}`,
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}>
      <TeamBadge iplTeam={iplTeam} size={32} />
      <div>
        <div style={{ fontFamily: V.fontHead, fontSize: 12, fontWeight: 900, color: brand.primary || V.text, textShadow: `0 0 8px ${brand.primary || V.cyan}50`, letterSpacing: "0.02em" }}>{iplTeam}</div>
        <div style={{ fontFamily: V.fontMono, fontSize: 9, color: "rgba(224,224,224,0.4)", letterSpacing: "0.06em" }}>
          {brand.name || iplTeam}
        </div>
        {score && (
          <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.text, marginTop: 2 }}>
            <span style={{ color: brand.primary || V.text, textShadow: `0 0 4px ${brand.primary || V.cyan}` }}>{score.r}/{score.w}</span>
            <span style={{ color: V.sub }}> ({score.o} ov)</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main MatchBubble ──────────────────────────────────────────────────────────
export default function MatchBubble({ match, onClose }) {
  const { isAdmin } = useStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveOk, setSaveOk] = useState("");

  // Admin editing state: { playerId: points }
  const [editPoints, setEditPoints] = useState({});

  // Match date for CREX save
  const [matchDate, setMatchDate] = useState("");
  const [matchLabel, setMatchLabel] = useState("");

  const t1 = match.iplTeam1;
  const t2 = match.iplTeam2;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await statsApi.matchPlayers(t1, t2);
        setData(res);
        setMatchLabel(match.name?.split(",")[0] || `${t1} vs ${t2}`);
      } catch (e) {
        setErr(e.error || "Failed to load players");
      }
      setLoading(false);
    })();
  }, [t1, t2]);

  const handleSave = async () => {
    const playerPoints = Object.entries(editPoints)
      .filter(([, v]) => v !== "" && !isNaN(v))
      .map(([playerId, pts]) => ({ playerId, points: parseFloat(pts) }));

    if (!playerPoints.length) { setSaveErr("Enter at least one player's points."); return; }
    setSaving(true); setSaveErr(""); setSaveOk("");
    try {
      await score.crex({
        label: matchLabel,
        iplTeam1: t1,
        iplTeam2: t2,
        matchDate,
        playerPoints,
      });
      setSaveOk(`Saved! ${playerPoints.length} players scored.`);
      setEditPoints({});
      // Reload player data
      const res = await statsApi.matchPlayers(t1, t2);
      setData(res);
    } catch (e) {
      setSaveErr(e.error || "Save failed");
    }
    setSaving(false);
  };

  const brand1 = IPL_BRANDS[t1] || {};
  const brand2 = IPL_BRANDS[t2] || {};

  // Get score for each team
  const getScore = (team) => match.score?.find(s => s.inning?.toLowerCase().includes(team.toLowerCase()));

  const players1 = data?.players?.[t1] || [];
  const players2 = data?.players?.[t2] || [];
  const allPlayers = [...players1, ...players2];
  const editedCount = Object.values(editPoints).filter(v => v !== "" && !isNaN(v)).length;

  return (
    <div className="vp-animate-in" style={{
      background: "rgba(5,0,15,0.97)",
      border: `1px solid ${V.border}`,
      borderTop: `2px solid transparent`,
      backgroundImage: `linear-gradient(rgba(5,0,15,0.97), rgba(5,0,15,0.97)), ${V.gradAccent}`,
      backgroundOrigin: "border-box",
      backgroundClip: "padding-box, border-box",
      marginBottom: 16,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Gradient top border simulation */}
      <div style={{ height: 2, background: V.gradAccent, boxShadow: `0 0 8px ${V.magenta}` }} />

      {/* ── Header ── */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${V.border}`, position: "relative" }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 10, right: 12,
            background: "rgba(255,0,255,0.1)", border: `1px solid ${V.magenta}40`,
            color: V.magenta, width: 28, height: 28, cursor: "pointer",
            fontFamily: V.fontMono, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = V.magenta + "25"; e.currentTarget.style.boxShadow = V.glowM; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,0,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
        >✕</button>

        {/* Match identity */}
        <div style={{ fontFamily: V.fontMono, fontSize: 9, letterSpacing: "0.18em", color: V.magenta, textShadow: `0 0 4px ${V.magenta}`, marginBottom: 6 }}>
          ▶ MATCH_DETAIL.DAT
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, paddingRight: 36 }}>
          {/* Team 1 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <TeamBadge iplTeam={t1} size={36} />
            <div>
              <div style={{ fontFamily: V.fontHead, fontSize: 14, fontWeight: 900, color: brand1.primary || V.text, textShadow: `0 0 10px ${brand1.primary || V.cyan}50` }}>{t1}</div>
              <div style={{ fontFamily: V.fontMono, fontSize: 9, color: "rgba(224,224,224,0.35)" }}>{brand1.name}</div>
            </div>
          </div>

          {/* VS */}
          <div style={{ fontFamily: V.fontHead, fontSize: 11, color: V.sub, letterSpacing: "0.1em", flexShrink: 0 }}>VS</div>

          {/* Team 2 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, flexDirection: "row-reverse", textAlign: "right" }}>
            <TeamBadge iplTeam={t2} size={36} />
            <div>
              <div style={{ fontFamily: V.fontHead, fontSize: 14, fontWeight: 900, color: brand2.primary || V.text, textShadow: `0 0 10px ${brand2.primary || V.cyan}50` }}>{t2}</div>
              <div style={{ fontFamily: V.fontMono, fontSize: 9, color: "rgba(224,224,224,0.35)" }}>{brand2.name}</div>
            </div>
          </div>
        </div>

        {/* Scores row */}
        {match.score?.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            {match.score.map((s, i) => (
              <div key={i} style={{ fontFamily: V.fontMono, fontSize: 12, color: V.sub }}>
                <span style={{ color: V.cyan, fontSize: 10 }}>{s.inning?.split(" Inning")[0]}: </span>
                <span style={{ color: V.text, fontWeight: 600 }}>{s.r}/{s.w}</span>
                <span style={{ color: V.sub }}> ({s.o} ov)</span>
              </div>
            ))}
          </div>
        )}

        {/* Status + fantasy count */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusBadge status={match.status} isLive={match.matchStarted && !match.matchEnded} alreadyScored={match.alreadyScored} />
          <span style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, letterSpacing: "0.04em" }}>{match.status || "Upcoming"}</span>
          {!loading && <span style={{ fontFamily: V.fontMono, fontSize: 9, color: V.orange, marginLeft: "auto" }}>{allPlayers.length} fantasy players in this fixture</span>}
        </div>
      </div>

      {/* ── Admin entry bar ── */}
      {isAdmin && !loading && (
        <div style={{
          padding: "10px 14px",
          background: "rgba(204,68,255,0.06)",
          borderBottom: `1px solid rgba(204,68,255,0.25)`,
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Match label</Label>
            <input
              type="text"
              value={matchLabel}
              onChange={e => setMatchLabel(e.target.value)}
              style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${V.border}`, borderBottom: `2px solid #CC44FF`, color: V.text, fontFamily: V.fontMono, fontSize: 11, padding: "6px 8px", width: "100%", outline: "none" }}
            />
          </div>
          <div style={{ minWidth: 120 }}>
            <Label>Date</Label>
            <input
              type="date"
              value={matchDate}
              onChange={e => setMatchDate(e.target.value)}
              style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${V.border}`, borderBottom: "2px solid #CC44FF", color: V.text, fontFamily: V.fontMono, fontSize: 11, padding: "6px 8px", outline: "none" }}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving || editedCount === 0}
            style={{
              background: editedCount > 0 ? "#CC44FF20" : "transparent",
              border: `1px solid ${editedCount > 0 ? "#CC44FF80" : V.border}`,
              color: editedCount > 0 ? "#CC44FF" : V.sub,
              fontFamily: V.fontMono,
              fontSize: 10,
              padding: "8px 14px",
              cursor: editedCount > 0 ? "pointer" : "not-allowed",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {saving ? "SAVING…" : `▶ SAVE ${editedCount > 0 ? `(${editedCount} players)` : "CHANGES"}`}
          </button>
        </div>
      )}

      {saveOk && <div style={{ padding: "8px 14px", background: V.green + "10", fontFamily: V.fontMono, fontSize: 11, color: V.green, letterSpacing: "0.04em" }}>✓ {saveOk}</div>}
      {saveErr && <div style={{ padding: "8px 14px", background: V.red + "10", fontFamily: V.fontMono, fontSize: 11, color: V.red }}>⚠ {saveErr}</div>}

      {/* ── Player columns ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: "28px 0", fontFamily: V.fontMono, fontSize: 12, color: V.sub, letterSpacing: "0.1em" }}>
          <span style={{ animation: "vpPulse 1.5s infinite", display: "inline-block" }}>◈</span> Loading players…
        </div>
      )}

      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {/* Team 1 column */}
          <div style={{ borderRight: `1px solid ${V.border}` }}>
            <TeamHeader iplTeam={t1} score={getScore(t1)} />
            {players1.length === 0 ? (
              <div style={{ padding: "16px 12px", fontFamily: V.fontMono, fontSize: 10, color: V.sub, textAlign: "center", letterSpacing: "0.06em" }}>No auctioned players</div>
            ) : (
              players1.map((player, i) => (
                <BubblePlayerCard
                  key={player.id}
                  player={player}
                  iplTeam={t1}
                  isAdmin={isAdmin}
                  editingPoints={editPoints[player.id]}
                  onPointsChange={(id, val) => setEditPoints(p => ({ ...p, [id]: val }))}
                />
              ))
            )}
          </div>

          {/* Team 2 column */}
          <div>
            <TeamHeader iplTeam={t2} score={getScore(t2)} />
            {players2.length === 0 ? (
              <div style={{ padding: "16px 12px", fontFamily: V.fontMono, fontSize: 10, color: V.sub, textAlign: "center", letterSpacing: "0.06em" }}>No auctioned players</div>
            ) : (
              players2.map((player, i) => (
                <BubblePlayerCard
                  key={player.id}
                  player={player}
                  iplTeam={t2}
                  isAdmin={isAdmin}
                  editingPoints={editPoints[player.id]}
                  onPointsChange={(id, val) => setEditPoints(p => ({ ...p, [id]: val }))}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      {!loading && allPlayers.length > 0 && (
        <div style={{
          padding: "8px 14px",
          borderTop: `1px solid ${V.border}`,
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}>
          <span style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, letterSpacing: "0.08em" }}>
            {allPlayers.length} PLAYERS · {allPlayers.filter(p => p.totalPoints > 0).length} SCORED
          </span>
          {isAdmin && (
            <span style={{ fontFamily: V.fontMono, fontSize: 9, color: "rgba(204,68,255,0.6)", letterSpacing: "0.08em" }}>
              ADMIN: ENTER POINTS TO SCORE THIS MATCH
            </span>
          )}
        </div>
      )}
    </div>
  );
}
