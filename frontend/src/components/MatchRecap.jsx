import { V } from "../tokens";
import { PrimaryBtn, GradientText, TerminalCard, StatNumber } from "./UI";

export default function MatchRecap({ matched, matchLabel, onDismiss }) {
  const sorted = [...(matched || [])].sort((a, b) => b.pts - a.pts);
  const total = sorted.reduce((s, m) => s + m.pts, 0);

  const byTeam = {};
  sorted.forEach(m => {
    if (!byTeam[m.fantasyTeamId]) byTeam[m.fantasyTeamId] = { name: m.fantasyTeam, pts: 0, players: [] };
    byTeam[m.fantasyTeamId].pts += m.pts;
    byTeam[m.fantasyTeamId].players.push(m);
  });
  const teamRanked = Object.values(byTeam).sort((a, b) => b.pts - a.pts);

  return (
    <div className="vp-animate-in" style={{ position: "fixed", inset: 0, background: V.void, zIndex: 400, overflowY: "auto", padding: "24px 20px 60px" }}>
      {/* Top accent */}
      <div style={{ height: 2, background: V.gradAccent, position: "fixed", top: 0, left: 0, right: 0, boxShadow: `0 0 10px ${V.magenta}`, zIndex: 401 }} />

      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 12 }}>
          <div style={{ fontFamily: V.fontMono, fontSize: 9, letterSpacing: "0.2em", color: V.magenta, textShadow: `0 0 6px ${V.magenta}`, marginBottom: 8 }}>▶ MATCH_COMPLETE.LOG</div>
          <h2 style={{ fontFamily: V.fontHead, fontSize: 22, fontWeight: 900, background: V.gradSunset, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 6 }}>
            {matchLabel}
          </h2>
          <div style={{ fontFamily: V.fontMono, fontSize: 12, color: V.sub, letterSpacing: "0.06em" }}>
            {sorted.length} players scored · {total} total pts distributed
          </div>
        </div>

        {/* Team gains */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, letterSpacing: "0.15em", marginBottom: 10 }}>▶ SQUAD_GAINS</div>
          {teamRanked.map((t, i) => (
            <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${V.border}` }}>
              <div style={{ fontFamily: V.fontHead, fontSize: 14, fontWeight: 700, color: i === 0 ? V.orange : V.sub, minWidth: 20, textAlign: "center", textShadow: i === 0 ? `0 0 8px ${V.orange}` : "none" }}>{i + 1}</div>
              <div style={{ fontFamily: V.fontHead, fontSize: 12, color: V.text, flex: 1 }}>{t.name}</div>
              <div style={{ fontFamily: V.fontHead, fontSize: 18, fontWeight: 700, color: V.cyan, textShadow: `0 0 8px ${V.cyan}` }}>+{t.pts}</div>
            </div>
          ))}
        </div>

        {/* Top performers */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, letterSpacing: "0.15em", marginBottom: 10 }}>▶ TOP_PERFORMERS</div>
          {sorted.slice(0, 8).map((m, i) => (
            <TerminalCard key={i} accentColor={i === 0 ? V.orange : V.cyan} style={{ marginBottom: 8, padding: 0 }}>
              <div style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: m.stats ? 6 : 0 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: V.fontHead, fontSize: 12, color: V.text }}>{m.playerName}</div>
                    <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, marginTop: 2 }}>{m.fantasyTeam} · {m.role}</div>
                  </div>
                  <StatNumber value={`+${m.pts}`} color={i === 0 ? V.orange : V.cyan} size={18} />
                </div>
                {m.stats && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {[m.stats.runs > 0 && `${m.stats.runs}r`, m.stats.balls > 0 && `${m.stats.balls}b`, m.stats.fours > 0 && `${m.stats.fours}×4`, m.stats.sixes > 0 && `${m.stats.sixes}×6`, m.stats.wickets > 0 && `${m.stats.wickets}w`, m.stats.overs > 0 && `${m.stats.overs}ov`, m.stats.catches > 0 && `${m.stats.catches}ct`].filter(Boolean).map((stat, j) => (
                      <span key={j} style={{ fontFamily: V.fontMono, fontSize: 9, padding: "2px 6px", background: V.muted, color: V.sub }}>{stat}</span>
                    ))}
                  </div>
                )}
              </div>
            </TerminalCard>
          ))}
        </div>

        <PrimaryBtn onClick={onDismiss}>▶ View updated leaderboard</PrimaryBtn>
      </div>
    </div>
  );
}
