import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { stats as statsApi } from "../api";
import { V, TEAM_COLORS } from "../tokens";
import { SectionLabel, StatNumber, Spinner, ErrorBox, RolePill, GradientText, TerminalCard, NeonText, TeamBadge } from "../components/UI";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const MEDALS = ["◈", "◇", "△"];
const MEDAL_COLORS = [V.orange, V.cyan, V.magenta];

export default function Leaderboard() {
  const { leaderboard, matches, loading, error, fetchLeague, setSelectedTeam } = useStore();
  const navigate = useNavigate();
  const [trends, setTrends] = useState(null);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => { fetchLeague(); }, []);
  useEffect(() => { if (matches.length > 1) statsApi.trends().then(setTrends).catch(() => {}); }, [matches.length]);

  const maxPts = Math.max(...leaderboard.map(t => t.totalPoints), 1);
  const allPlayers = leaderboard.flatMap(t => t.players.map(p => ({ ...p, team: t }))).sort((a, b) => b.totalPoints - a.totalPoints);

  if (loading && !leaderboard.length) return <Spinner label="Connecting to the grid…" />;

  return (
    <div className="vp-animate-in">
      {error && <ErrorBox message={error} />}

      {/* Podium */}
      {leaderboard.length >= 3 && maxPts > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Podium</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((team, vi) => {
              if (!team) return <div key={vi} />;
              const heights = ["52px", "72px", "40px"];
              const pos = [2, 1, 3][vi];
              const accent = team.accent || V.cyan;
              return (
                <div key={team.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
                  onClick={() => { setSelectedTeam(team.id); navigate("/squads"); }}>
                  <div style={{ fontSize: 18, marginBottom: 4, textShadow: `0 0 10px ${MEDAL_COLORS[vi]}`, color: MEDAL_COLORS[vi] }}>{MEDALS[vi]}</div>
                  <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, textAlign: "center", marginBottom: 2, maxWidth: 90, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", letterSpacing: "0.06em" }}>{team.manager}</div>
                  <StatNumber value={team.totalPoints} color={accent} size={pos === 1 ? 24 : 18} />
                  <div style={{ fontFamily: V.fontMono, fontSize: 8, color: V.sub, marginBottom: 6, letterSpacing: "0.12em" }}>PTS</div>
                  <div style={{ width: "100%", height: heights[vi], background: accent + "18", border: `1px solid ${accent}50`, borderTop: `2px solid ${accent}`, boxShadow: `0 0 12px ${accent}30`, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 5 }}>
                    <span style={{ fontFamily: V.fontHead, fontSize: 9, fontWeight: 700, color: accent, textShadow: `0 0 6px ${accent}` }}>#{pos}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Standings table */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <SectionLabel style={{ marginBottom: 0 }}>Season standings</SectionLabel>
        {trends?.series?.length > 1 && (
          <button onClick={() => setShowChart(c => !c)} style={{
            background: "none", border: `1px solid ${showChart ? V.cyan : V.border}`,
            color: showChart ? V.cyan : V.sub, fontFamily: V.fontMono, fontSize: 9,
            padding: "4px 10px", cursor: "pointer", letterSpacing: "0.1em",
            textTransform: "uppercase", transition: "all 0.15s",
            textShadow: showChart ? `0 0 6px ${V.cyan}` : "none",
          }}>
            {showChart ? "▼ Hide chart" : "▶ Show trend"}
          </button>
        )}
      </div>

      {/* Trend chart */}
      {showChart && trends?.series?.length > 1 && (
        <TerminalCard title="POINTS_TREND.DAT" style={{ marginBottom: 16 }}>
          <div style={{ padding: "16px 8px 8px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trends.series} margin={{ top: 0, right: 12, bottom: 0, left: -16 }}>
                <XAxis dataKey="matchLabel" tick={{ fontFamily: V.fontMono, fontSize: 8, fill: V.sub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontFamily: V.fontMono, fontSize: 8, fill: V.sub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1a103c", border: `1px solid ${V.magenta}`, fontFamily: V.fontMono, fontSize: 11 }} labelStyle={{ color: V.sub }} itemStyle={{ color: V.cyan }} />
                {trends.teams.map(t => <Line key={t.id} type="monotone" dataKey={t.id} name={t.manager} stroke={t.accent || V.cyan} strokeWidth={2} dot={false} activeDot={{ r: 3, fill: t.accent || V.cyan }} />)}
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: "4px 12px" }}>
              {trends.teams.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 12, height: 2, background: t.accent || V.cyan, boxShadow: `0 0 4px ${t.accent || V.cyan}` }} />
                  <span style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, letterSpacing: "0.06em" }}>{t.manager}</span>
                </div>
              ))}
            </div>
          </div>
        </TerminalCard>
      )}

      {/* Rankings */}
      <div style={{ border: `1px solid ${V.border}`, background: "rgba(26,16,60,0.6)", marginBottom: 24 }}>
        {leaderboard.map((team, i) => {
          const pct = (team.totalPoints / maxPts) * 100;
          const accent = team.accent || V.cyan;
          return (
            <div key={team.id}
              onClick={() => { setSelectedTeam(team.id); navigate("/squads"); }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < leaderboard.length - 1 ? `1px solid ${V.border}` : "none", cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,255,0.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
              <div style={{ fontFamily: V.fontHead, fontSize: i < 3 ? 16 : 12, fontWeight: 700, color: i < 3 ? MEDAL_COLORS[i] : V.sub, minWidth: 22, textAlign: "center", textShadow: i < 3 ? `0 0 8px ${MEDAL_COLORS[i]}` : "none" }}>{i + 1}</div>
              <div style={{ width: 2, height: 32, background: accent, boxShadow: `0 0 6px ${accent}`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: V.fontHead, fontSize: 12, fontWeight: 700, color: V.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>{team.name}</div>
                <div style={{ height: 2, background: V.muted, marginTop: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(to right, ${V.magenta}, ${accent})`, boxShadow: `0 0 6px ${accent}`, transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <StatNumber value={team.totalPoints} color={accent} size={20} />
                <div style={{ fontFamily: V.fontMono, fontSize: 8, color: V.sub, letterSpacing: "0.15em" }}>PTS</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top performers */}
      {allPlayers.some(p => p.totalPoints > 0) && (
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Top performers</SectionLabel>
          <TerminalCard title="PLAYER_STATS.LOG">
            {allPlayers.filter(p => p.totalPoints > 0).slice(0, 6).map((p, i) => (
              <div key={`${p.team.id}_${p.id}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < 5 ? `1px solid ${V.border}` : "none", transition: "background 0.15s", cursor: "default" }}
                onMouseEnter={e => { const c = p.team.accent || V.cyan; e.currentTarget.style.background = `linear-gradient(to right, ${c}12, transparent)`; e.currentTarget.style.borderLeft = `2px solid ${c}60`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeft = "none"; }}>
                <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, minWidth: 18, textAlign: "right" }}>{i + 1}</div>
                <TeamBadge iplTeam={p.iplTeam} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: V.fontHead, fontSize: 12, color: V.text }}>{p.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 3, alignItems: "center" }}>
                    <RolePill role={p.role} />
                    <NeonText color={V.sub} size={10}>{p.team.manager}</NeonText>
                  </div>
                </div>
                <StatNumber value={p.totalPoints} color={p.team.accent || V.cyan} size={18} />
              </div>
            ))}
          </TerminalCard>
        </div>
      )}

      {/* Match history */}
      {matches.length > 0 && (
        <div>
          <SectionLabel>Match log</SectionLabel>
          {[...matches].map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: V.fontMono, fontSize: 11, color: V.sub, padding: "7px 0", borderBottom: `1px solid ${V.border}`, letterSpacing: "0.04em" }}>
              <span style={{ color: V.magenta }}>▶</span>
              <span style={{ flex: 1 }}>{m.label}</span>
              <span style={{ fontSize: 9, color: V.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{m.source?.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
