import { useState, useEffect } from "react";
import { stats as statsApi } from "../api";
import { V, ROLE_COLORS, TEAM_COLORS } from "../tokens";
import { RolePill, Spinner, ErrorBox, TerminalCard, StatNumber, NeonText, TeamBadge } from "./UI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function PlayerModal({ player, team, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try { const res = await statsApi.player(player.id); setData(res); }
      catch (e) { setErr(e.error || "Failed to load"); }
      setLoading(false);
    })();
  }, [player.id]);

  const accent = team?.accent || V.cyan;
  const chartData = data?.scores?.map(s => ({
    match: s.match.label.split(" vs ").map(t => t.trim().split(" ").pop()).join("v"),
    pts: s.points,
  })) || [];

  const avg = data?.scores?.length ? Math.round(data.scores.reduce((s, sc) => s + sc.points, 0) / data.scores.length) : 0;
  const best = data?.scores?.length ? Math.max(...data.scores.map(s => s.points)) : 0;
  const total = player.totalPoints ?? (data?.scores?.reduce((s, sc) => s + sc.points, 0) || 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(9,0,20,0.92)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div className="vp-animate-in"
        style={{ background: "rgba(0,0,0,0.94)", border: `2px solid ${accent}`, boxShadow: `0 0 40px ${accent}30`, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        {/* Title bar */}
        <div style={{ background: `${accent}10`, borderBottom: `1px solid ${accent}`, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: V.magenta, boxShadow: V.glowM }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, boxShadow: `0 0 6px ${accent}` }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: V.orange, boxShadow: V.glowO }} />
          </div>
          <span style={{ fontFamily: V.fontMono, fontSize: 10, color: accent, letterSpacing: "0.1em", flex: 1 }}>PLAYER_PROFILE.DAT</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: V.sub, cursor: "pointer", fontFamily: V.fontMono, fontSize: 12 }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <h3 style={{ fontFamily: V.fontHead, fontSize: 18, fontWeight: 900, color: V.text, letterSpacing: "0.02em", marginBottom: 6 }}>{player.name}</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <RolePill role={player.role} />
                <span style={{ fontFamily: V.fontMono, fontSize: 10, color: TEAM_COLORS[player.iplTeam] || V.sub, textShadow: `0 0 4px ${TEAM_COLORS[player.iplTeam] || V.sub}` }}>{player.iplTeam}</span>
                {team && <span style={{ fontFamily: V.fontMono, fontSize: 10, color: accent, textShadow: `0 0 4px ${accent}` }}>{team.manager}</span>}
              </div>
            </div>
          </div>

          {loading && <Spinner label="Loading player data…" />}
          <ErrorBox message={err} />

          {data && !loading && (
            <>
              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
                {[["Total", total, accent], ["Avg / match", avg, V.magenta], ["Best match", best, V.orange]].map(([label, val, color]) => (
                  <div key={label} style={{ background: color + "0a", border: `1px solid ${color}30`, borderTop: `2px solid ${color}`, padding: "10px 12px" }}>
                    <StatNumber value={val} color={color} size={20} />
                    <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, marginTop: 4, letterSpacing: "0.08em" }}>{label.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              {chartData.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, letterSpacing: "0.15em", marginBottom: 8 }}>▶ POINTS_PER_MATCH</div>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -24 }}>
                      <XAxis dataKey="match" tick={{ fontFamily: V.fontMono, fontSize: 8, fill: V.sub }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontFamily: V.fontMono, fontSize: 8, fill: V.sub }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#1a103c", border: `1px solid ${accent}`, fontFamily: V.fontMono, fontSize: 11 }} cursor={{ fill: "rgba(255,0,255,0.06)" }} />
                      <Bar dataKey="pts" radius={0}>
                        {chartData.map((_, i) => <Cell key={i} fill={accent} opacity={0.8} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* History */}
              {data.scores.length > 0 ? (
                <div>
                  <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, letterSpacing: "0.15em", marginBottom: 8 }}>▶ MATCH_HISTORY</div>
                  {[...data.scores].reverse().map((sc, i) => (
                    <div key={i} style={{ background: "rgba(26,16,60,0.6)", border: `1px solid ${V.border}`, borderLeft: `2px solid ${accent}`, padding: "10px 14px", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sc.played ? 6 : 0 }}>
                        <div style={{ fontFamily: V.fontHead, fontSize: 11, color: V.text }}>{sc.match.label}</div>
                        <StatNumber value={sc.points} color={accent} size={16} />
                      </div>
                      {sc.played && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {[sc.runs > 0 && `${sc.runs}r`, sc.balls > 0 && `${sc.balls}b`, sc.fours > 0 && `${sc.fours}×4`, sc.sixes > 0 && `${sc.sixes}×6`, sc.wickets > 0 && `${sc.wickets}w`, sc.overs > 0 && `${sc.overs}ov`, sc.catches > 0 && `${sc.catches}ct`, sc.stumpings > 0 && `${sc.stumpings}st`].filter(Boolean).map((stat, j) => (
                            <span key={j} style={{ fontFamily: V.fontMono, fontSize: 10, padding: "2px 6px", background: V.muted, color: V.sub }}>{stat}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", fontFamily: V.fontMono, fontSize: 12, color: V.sub, padding: "20px 0", letterSpacing: "0.06em" }}>NO_MATCH_DATA</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
