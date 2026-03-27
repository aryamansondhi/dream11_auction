import { V } from "../tokens";
import { SectionLabel, Divider, TerminalCard, GradientText, NeonText } from "../components/UI";

const LEAGUE_RULES = [
  { icon: "◈", color: V.cyan,    title: "Squad composition",
    rules: ["15 players per squad — all 15 score every match", "At least one player from each role: Batsman, Bowler, All-Rounder, Wicket-Keeper", "Players from a minimum of 5 different IPL teams", "Set one Captain (2× points) and one Vice-Captain (1.5×)"] },
  { icon: "◇", color: V.magenta, title: "Trade rules",
    rules: ["10 total trades per team across the whole season — C/VC changes count as trades", "Changing both Captain and VC in one action = 2 trades", "Swapped-out player's points up to that match are retained", "New player's points only count once they've played more matches than the player they replaced (match equalization)", "Example: Player A had played 6 matches when swapped → Player B's points only count from their 7th match"] },
  { icon: "△", color: V.orange,  title: "Season & playoffs",
    rules: ["Squads remain constant through the league stage — no redrafts for playoffs", "Scoring is done through CREX", "Points are entered match by match via the admin Control Center"] },
];

const PRIZE_POOL = [
  { pos: "1st", medal: "◈", pts: "₹7,000", color: V.orange },
  { pos: "2nd", medal: "◇", pts: "₹4,000", color: V.cyan   },
  { pos: "3rd", medal: "△", pts: "₹1,000", color: V.magenta},
  { pos: "Entry", medal: "→", pts: "₹2,000", color: V.sub   },
];

const SCORING_SECTIONS = [
  { title: "Batting",      color: V.cyan,    note: null,         rows: [["Run","+1"],["Boundary (4)","+4"],["Six","+6"],["25-run bonus","+4"],["Half-century","+8"],["75-run bonus","+12"],["Century (replaces all)","+16"],["Duck — bat/WK/AR","-2"]] },
  { title: "Strike rate",  color: V.orange,  note: "min 10 balls",rows: [["SR > 170","+6"],["SR 150–170","+4"],["SR 130–150","+2"],["SR 60–70","-2"],["SR 50–59.99","-4"],["SR < 50","-6"]] },
  { title: "Bowling",      color: V.magenta, note: null,         rows: [["Wicket (excl. run out)","+30"],["LBW / Bowled bonus","+8"],["3-wkt bonus","+4"],["4-wkt bonus","+8"],["5-wkt bonus","+12"],["Dot ball","+1"],["Maiden over","+12"]] },
  { title: "Economy rate", color: "#CC44FF", note: "min 2 overs", rows: [["Economy < 5","+6"],["Economy 5–5.99","+4"],["Economy 6–7","+2"],["Economy 10–11","-2"],["Economy 11.01–12","-4"],["Economy > 12","-6"]] },
  { title: "Fielding",     color: V.green,   note: null,         rows: [["Catch","+8"],["3-catch bonus","+4"],["Stumping","+12"],["Run out — direct","+12"],["Run out — indirect","+6"]] },
  { title: "Captain / VC", color: V.orange,  note: null,         rows: [["Captain","2×"],["Vice-Captain","1.5×"],["In playing XI","+4"]] },
];

export default function Rules() {
  return (
    <div className="vp-animate-in">
      {/* Header */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${V.border}` }}>
        <div style={{ fontFamily: V.fontMono, fontSize: 9, letterSpacing: "0.2em", color: V.magenta, textShadow: `0 0 6px ${V.magenta}`, marginBottom: 8 }}>▶ SYSTEM_RULES.TXT</div>
        <h2 style={{ fontFamily: V.fontHead, fontSize: 22, fontWeight: 900, background: V.gradSunset, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 4 }}>
          League Rules
        </h2>
        <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.sub, letterSpacing: "0.04em" }}>IPL 2026 Fantasy Season // CREX Scoring System</div>
      </div>

      {/* League rules */}
      <SectionLabel>League configuration</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
        {LEAGUE_RULES.map(({ icon, color, title, rules }) => (
          <TerminalCard key={title} accentColor={color} style={{ padding: 0 }}>
            <div style={{ padding: "14px 18px" }}>
              <div style={{ fontFamily: V.fontHead, fontSize: 13, fontWeight: 700, color, textShadow: `0 0 8px ${color}`, marginBottom: 10, letterSpacing: "0.04em" }}>
                {icon} {title.toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rules.map((rule, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontFamily: V.fontMono, fontSize: 12, color: V.sub, lineHeight: 1.6, letterSpacing: "0.03em" }}>
                    <span style={{ color, flexShrink: 0 }}>›</span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </TerminalCard>
        ))}
      </div>

      {/* Prize pool */}
      <SectionLabel>Prize pool</SectionLabel>
      <div style={{ background: "rgba(255,153,0,0.05)", border: `1px solid rgba(255,153,0,0.3)`, borderTop: `2px solid ${V.orange}`, boxShadow: `0 0 20px rgba(255,153,0,0.1)`, marginBottom: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: `1px solid rgba(255,153,0,0.15)` }}>
          {PRIZE_POOL.map(({ pos, medal, pts, color }) => (
            <div key={pos} style={{ padding: "16px 20px", borderRight: pos === "1st" || pos === "3rd" ? `1px solid rgba(255,153,0,0.15)` : "none", borderBottom: pos === "1st" || pos === "2nd" ? `1px solid rgba(255,153,0,0.15)` : "none" }}>
              <div style={{ fontFamily: V.fontHead, fontSize: 20, fontWeight: 900, color, textShadow: `0 0 12px ${color}`, marginBottom: 2 }}>{pts}</div>
              <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, letterSpacing: "0.12em" }}>{medal} {pos.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring system */}
      <SectionLabel>CREX scoring reference</SectionLabel>
      {SCORING_SECTIONS.map(({ title, color, note, rows }) => (
        <div key={title} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <div style={{ fontFamily: V.fontHead, fontSize: 12, fontWeight: 700, color, textShadow: `0 0 6px ${color}`, letterSpacing: "0.04em" }}>{title.toUpperCase()}</div>
            {note && <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, letterSpacing: "0.1em" }}>{note}</div>}
          </div>
          <div style={{ border: `1px solid ${V.border}`, borderTop: `2px solid ${color}`, background: "rgba(26,16,60,0.6)", overflow: "hidden" }}>
            {rows.map(([label, pts], i) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: i < rows.length - 1 ? `1px solid ${V.border}` : "none" }}>
                <span style={{ fontFamily: V.fontMono, fontSize: 12, color: V.sub, letterSpacing: "0.04em" }}>{label}</span>
                <span style={{ fontFamily: V.fontHead, fontSize: 13, fontWeight: 700, color: pts.toString().startsWith("+") ? V.green : pts.toString().startsWith("-") ? V.red : V.orange, textShadow: `0 0 6px ${pts.toString().startsWith("+") ? V.green : pts.toString().startsWith("-") ? V.red : V.orange}` }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
