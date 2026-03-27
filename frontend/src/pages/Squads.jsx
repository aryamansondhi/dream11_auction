import { useEffect, useState } from "react";
import { useStore } from "../store";
import { rosters as rostersApi } from "../api";
import { V, ROLE_COLORS, TEAM_COLORS } from "../tokens";
import { SectionLabel, StatNumber, RolePill, TerminalCard, NeonText, TradeCounter, GradientText, TeamBadge, PlayerRow } from "../components/UI";
import PlayerModal from "../components/PlayerModal";

export default function Squads() {
  const { leaderboard, fetchLeague, selectedTeamId, setSelectedTeam } = useStore();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [rosterMap, setRosterMap] = useState({});

  useEffect(() => {
    if (!leaderboard.length) fetchLeague();
    rostersApi.getAll().then(res => {
      const map = {};
      res.rosters.forEach(r => { map[r.teamId] = r; });
      setRosterMap(map);
    }).catch(() => {});
  }, []);

  const ranked = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
  const selId = selectedTeamId || (ranked[0]?.id);
  const team = ranked.find(t => t.id === selId);
  const roster = rosterMap[selId];

  const maxP = team ? Math.max(...team.players.map(p => p.totalPoints), 1) : 1;
  const rank = ranked.findIndex(t => t.id === selId) + 1;

  const enriched = team?.players.map(p => ({
    ...p,
    isCaptain: roster?.captainId === p.id,
    isViceCaptain: roster?.viceCaptainId === p.id,
  })) || [];

  const roleGroups = ["Batsman", "Bowler", "All-Rounder", "Wicket-Keeper"].map(role => ({
    role,
    count: enriched.filter(p => p.role === role).length,
    pts: enriched.filter(p => p.role === role).reduce((s, p) => s + p.totalPoints, 0),
  }));

  return (
    <div className="vp-animate-in">
      {selectedPlayer && <PlayerModal player={selectedPlayer} team={team} onClose={() => setSelectedPlayer(null)} />}

      {/* Team selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
        {ranked.map(t => {
          const active = selId === t.id;
          const accent = t.accent || V.cyan;
          return (
            <button key={t.id} onClick={() => setSelectedTeam(t.id)} style={{
              fontFamily: V.fontMono, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
              padding: "5px 14px", cursor: "pointer",
              background: active ? accent + "20" : "transparent",
              color: active ? accent : V.sub,
              border: `1px solid ${active ? accent : V.border}`,
              textShadow: active ? `0 0 6px ${accent}` : "none",
              boxShadow: active ? `0 0 8px ${accent}30` : "none",
              transition: "all 0.15s",
            }}>{t.manager}</button>
          );
        })}
      </div>

      {team && (
        <div>
          {/* Team header */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: V.fontMono, fontSize: 9, letterSpacing: "0.18em", color: team.accent || V.cyan, textShadow: `0 0 6px ${team.accent || V.cyan}`, marginBottom: 4 }}>
                  ▶ SQUAD_{rank.toString().padStart(2,"0")}
                </div>
                <h2 style={{ fontFamily: V.fontHead, fontSize: 18, fontWeight: 900, color: V.text, letterSpacing: "0.02em", marginBottom: 3 }}>{team.name}</h2>
                <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.sub }}>{team.manager}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <StatNumber value={team.totalPoints} color={team.accent || V.cyan} size={28} />
                <div style={{ fontFamily: V.fontMono, fontSize: 8, color: V.sub, letterSpacing: "0.15em", marginTop: 2 }}>TOTAL PTS</div>
              </div>
            </div>

            {/* C/VC row */}
            {(roster?.captainId || roster?.viceCaptainId) && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                {[
                  { id: roster?.captainId, label: "★ C", color: V.orange, mult: "2×" },
                  { id: roster?.viceCaptainId, label: "★ VC", color: "#CC44FF", mult: "1.5×" },
                ].map(({ id, label, color, mult }) => {
                  if (!id) return null;
                  const p = enriched.find(p => p.id === id);
                  if (!p) return null;
                  return (
                    <div key={id} style={{ flex: 1, background: color + "0e", border: `1px solid ${color}35`, borderTop: `2px solid ${color}`, padding: "7px 10px", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: V.fontMono, fontSize: 9, color, background: color + "20", padding: "2px 6px", textShadow: `0 0 4px ${color}`, letterSpacing: "0.08em" }}>{label}</span>
                      <div>
                        <div style={{ fontFamily: V.fontHead, fontSize: 11, color: V.text }}>{p.name}</div>
                        <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub }}>{mult} points</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Trade counter */}
            {roster && <TradeCounter used={roster.tradesUsed} max={roster.maxTrades} />}
          </div>

          {/* Role breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 14 }}>
            {roleGroups.map(({ role, count, pts }) => {
              const color = ROLE_COLORS[role];
              const short = role === "Wicket-Keeper" ? "WK" : role === "All-Rounder" ? "AR" : role.slice(0,3).toUpperCase();
              return (
                <div key={role} style={{ background: color + "0a", border: `1px solid ${color}30`, borderTop: `2px solid ${color}`, padding: "8px 10px" }}>
                  <div style={{ fontFamily: V.fontMono, fontSize: 8, letterSpacing: "0.12em", color, textShadow: `0 0 4px ${color}`, marginBottom: 4 }}>{short}</div>
                  <div style={{ fontFamily: V.fontHead, fontSize: 16, fontWeight: 700, color: V.text, lineHeight: 1 }}>{pts}</div>
                  <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, marginTop: 2 }}>{count}p</div>
                </div>
              );
            })}
          </div>

          {/* Player list */}
          <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, marginBottom: 8, letterSpacing: "0.08em" }}>
            › TAP PLAYER FOR MATCH HISTORY
          </div>
          <TerminalCard title="SQUAD_ROSTER.DAT" accentColor={team.accent || V.cyan}>
            {enriched.map((p, i) => (
              <PlayerRow
                key={p.id}
                player={p}
                onClick={() => setSelectedPlayer(p)}
                style={{ borderBottom: i < enriched.length - 1 ? `1px solid ${V.border}` : "none" }}
                extraCols={
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                      {p.isCaptain && <span style={{ fontFamily: V.fontMono, fontSize: 8, color: V.orange, background: V.orange + "20", padding: "1px 4px" }}>C</span>}
                      {p.isViceCaptain && <span style={{ fontFamily: V.fontMono, fontSize: 8, color: "#CC44FF", background: "#CC44FF20", padding: "1px 4px" }}>VC</span>}
                    </div>
                    <StatNumber value={p.totalPoints} color={p.totalPoints > 0 ? (team.accent || V.cyan) : V.muted} size={16} glow={p.totalPoints > 0} />
                  </div>
                }
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: V.fontHead, fontSize: 11, color: p.totalPoints > 0 ? V.text : V.sub }}>{p.name}</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 2, alignItems: "center" }}>
                    <RolePill role={p.role} />
                    {p.matchHistory?.length > 0 && <span style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub }}>{p.matchHistory.length}m</span>}
                  </div>
                  {p.totalPoints > 0 && (
                    <div style={{ height: 2, background: V.muted, marginTop: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(p.totalPoints / maxP) * 100}%`, background: `linear-gradient(to right, ${V.magenta}80, ${team.accent || V.cyan})`, transition: "width 1s ease" }} />
                    </div>
                  )}
                </div>
              </PlayerRow>
            ))}
          </TerminalCard>
        </div>
      )}
    </div>
  );
}
