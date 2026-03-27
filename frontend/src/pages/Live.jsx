import { useState, useEffect, useRef } from "react";
import { live, fixtures as fixturesApi } from "../api";
import { V, IPL_BRANDS } from "../tokens";
import { SectionLabel, GhostBtn, ErrorBox, Spinner, Divider, TerminalCard, TeamBadge } from "../components/UI";
import MatchBubble from "../components/MatchBubble";

const FILTERS = ["All", "Today", "Upcoming", "Completed"];

const monthName = d => new Date(d).toLocaleString("en", { month: "short" }).toUpperCase();
const dayNum   = d => new Date(d).getDate();

export default function Live() {
  const [fixtures, setFixtures]     = useState([]);
  const [liveData, setLiveData]     = useState({});  // keyed by "HOME|AWAY"
  const [loading, setLoading]       = useState(true);
  const [err, setErr]               = useState("");
  const [filter, setFilter]         = useState("Upcoming");
  const [openMatchNo, setOpenMatchNo] = useState(null);
  const [lastSync, setLastSync]     = useState(null);
  const intervalRef                 = useRef(null);

  // Load static fixtures once
  useEffect(() => {
    (async () => {
      try {
        const res = await fixturesApi.getAll();
        setFixtures(res.fixtures || []);
      } catch (e) {
        setErr(e.error || "Failed to load fixtures");
      }
      setLoading(false);
    })();
  }, []);

  // Poll live scores from CricketData API
  const fetchLive = async (silent = false) => {
    try {
      const res = await live.matches();
      const map = {};
      (res.matches || []).forEach(m => {
        const t1 = m.iplTeam1 || "";
        const t2 = m.iplTeam2 || "";
        if (t1 && t2) {
          map[`${t1}|${t2}`] = m;
          map[`${t2}|${t1}`] = m;
        }
      });
      setLiveData(map);
      setLastSync(new Date());
    } catch {}
  };

  useEffect(() => {
    fetchLive();
    intervalRef.current = setInterval(() => fetchLive(true), 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Merge live data into fixtures
  const enriched = fixtures.map(f => {
    const live = liveData[`${f.home}|${f.away}`] || null;
    return {
      ...f,
      live,
      isLive:       live?.matchStarted && !live?.matchEnded,
      score:        live?.score || [],
      liveStatus:   live?.status || null,
      alreadyScored: f.alreadyScored || live?.alreadyScored,
    };
  });

  const filtered = enriched.filter(f => {
    if (filter === "Today")     return f.isToday;
    if (filter === "Upcoming")  return f.isUpcoming || f.isToday;
    if (filter === "Completed") return f.isPast;
    return true;
  });

  const liveCount = enriched.filter(f => f.isLive).length;
  const openMatch = openMatchNo ? enriched.find(f => f.matchNo === openMatchNo) : null;

  // Group by date
  const grouped = filtered.reduce((acc, f) => {
    const key = f.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  const dateKeys = Object.keys(grouped).sort();

  return (
    <div className="vp-animate-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <SectionLabel style={{ marginBottom: 0 }}>IPL 2026 Fixtures</SectionLabel>
          {lastSync && (
            <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, marginTop: 3, letterSpacing: "0.06em" }}>
              LIVE SYNC @ {lastSync.toLocaleTimeString()} · 30s AUTO-REFRESH
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {liveCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: V.fontMono, fontSize: 9, color: V.green, background: "rgba(0,255,136,0.08)", border: `1px solid rgba(0,255,136,0.3)`, padding: "3px 10px", letterSpacing: "0.1em" }}>
              <span className="vp-pulse" style={{ width: 5, height: 5, background: V.green, display: "inline-block" }} />
              {liveCount} LIVE
            </div>
          )}
          <GhostBtn onClick={() => fetchLive()} style={{ fontSize: 9 }}>↻ SYNC</GhostBtn>
        </div>
      </div>

      <ErrorBox message={err} />

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${V.border}`, paddingBottom: 0 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: V.fontMono, fontSize: 10, letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: filter === f ? V.magenta : V.sub,
            borderBottom: filter === f ? `2px solid ${V.magenta}` : "2px solid transparent",
            padding: "6px 12px", marginBottom: -1,
            textShadow: filter === f ? `0 0 6px ${V.magenta}` : "none",
            transition: "all 0.15s",
          }}>{f}</button>
        ))}
        <div style={{ marginLeft: "auto", fontFamily: V.fontMono, fontSize: 9, color: V.sub, padding: "6px 0", letterSpacing: "0.06em" }}>
          {filtered.length} matches
        </div>
      </div>

      {loading && <Spinner label="Loading fixtures…" />}

      {/* Date groups */}
      {dateKeys.map(date => (
        <div key={date} style={{ marginBottom: 20 }}>
          {/* Date header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ background: V.magenta + "20", border: `1px solid ${V.magenta}40`, padding: "4px 10px", display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: V.fontHead, fontSize: 16, fontWeight: 900, color: V.magenta, textShadow: `0 0 8px ${V.magenta}` }}>{dayNum(date)}</span>
              <span style={{ fontFamily: V.fontMono, fontSize: 9, color: V.magenta, letterSpacing: "0.12em" }}>{monthName(date)}</span>
            </div>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${V.magenta}30, transparent)` }} />
          </div>

          {/* Fixtures in this date */}
          {grouped[date].map(f => {
            const isOpen = openMatchNo === f.matchNo;
            const brand1 = IPL_BRANDS[f.home] || {};
            const brand2 = IPL_BRANDS[f.away] || {};
            const stakeTotal = f.fantasyStake?.reduce((s, x) => s + x.count, 0) || 0;

            return (
              <div key={f.matchNo} style={{ marginBottom: isOpen ? 0 : 8 }}>
                {/* Match row */}
                <div
                  onClick={() => setOpenMatchNo(isOpen ? null : f.matchNo)}
                  style={{
                    background: isOpen ? "rgba(30,16,60,0.95)" : "rgba(26,16,60,0.7)",
                    border: `1px solid ${isOpen ? V.magenta + "60" : V.border}`,
                    borderLeft: `3px solid ${f.isLive ? V.green : f.isPast ? V.sub + "40" : V.magenta + "50"}`,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    opacity: f.isPast && !f.isLive ? 0.65 : 1,
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.borderColor = V.borderHi; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.borderColor = V.border; }}
                >
                  <div style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Match no + time */}
                      <div style={{ minWidth: 38, textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontFamily: V.fontMono, fontSize: 8, color: V.sub, letterSpacing: "0.1em" }}>M{f.matchNo}</div>
                        <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub }}>{f.time}</div>
                      </div>

                      {/* Home team */}
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1 }}>
                        <TeamBadge iplTeam={f.home} size={28} />
                        <div>
                          <div style={{ fontFamily: V.fontHead, fontSize: 12, fontWeight: 900, color: brand1.primary || V.text, textShadow: `0 0 6px ${brand1.primary || V.cyan}40` }}>{f.home}</div>
                          {f.score?.find(s => s.inning?.startsWith(f.home)) && (() => {
                            const sc = f.score.find(s => s.inning?.startsWith(f.home));
                            return <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub }}>{sc.r}/{sc.w} <span style={{ color: "rgba(224,224,224,0.3)" }}>({sc.o})</span></div>;
                          })()}
                        </div>
                      </div>

                      {/* VS + status */}
                      <div style={{ textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontFamily: V.fontHead, fontSize: 9, color: V.sub }}>VS</div>
                        {f.isLive && (
                          <div style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: V.fontMono, fontSize: 8, color: V.green, letterSpacing: "0.08em", marginTop: 2 }}>
                            <span className="vp-pulse" style={{ width: 4, height: 4, background: V.green, display: "inline-block" }} />LIVE
                          </div>
                        )}
                        {f.alreadyScored && !f.isLive && (
                          <div style={{ fontFamily: V.fontMono, fontSize: 8, color: V.green, marginTop: 2 }}>✓</div>
                        )}
                      </div>

                      {/* Away team */}
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, flexDirection: "row-reverse", textAlign: "right" }}>
                        <TeamBadge iplTeam={f.away} size={28} />
                        <div>
                          <div style={{ fontFamily: V.fontHead, fontSize: 12, fontWeight: 900, color: brand2.primary || V.text, textShadow: `0 0 6px ${brand2.primary || V.cyan}40` }}>{f.away}</div>
                          {f.score?.find(s => s.inning?.startsWith(f.away)) && (() => {
                            const sc = f.score.find(s => s.inning?.startsWith(f.away));
                            return <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub }}>{sc.r}/{sc.w} <span style={{ color: "rgba(224,224,224,0.3)" }}>({sc.o})</span></div>;
                          })()}
                        </div>
                      </div>

                      {/* Expand arrow */}
                      <div style={{ fontFamily: V.fontMono, fontSize: 9, color: isOpen ? V.magenta : V.sub, textShadow: isOpen ? `0 0 4px ${V.magenta}` : "none", flexShrink: 0, transition: "all 0.15s" }}>
                        {isOpen ? "▲" : "▼"}
                      </div>
                    </div>

                    {/* Venue + stake row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, paddingLeft: 46 }}>
                      <span style={{ fontFamily: V.fontMono, fontSize: 9, color: "rgba(224,224,224,0.25)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.venue}</span>
                      {stakeTotal > 0 && (
                        <span style={{ fontFamily: V.fontMono, fontSize: 9, color: V.orange, flexShrink: 0 }}>
                          ⚡ {stakeTotal} fantasy players
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Match bubble */}
                {isOpen && (
                  <MatchBubble
                    match={{
                      ...f,
                      iplTeam1: f.home,
                      iplTeam2: f.away,
                      name: f.label,
                      status: f.liveStatus || (f.isPast ? "Match concluded" : `${f.day}, ${f.time} IST`),
                      matchStarted: f.isLive,
                      matchEnded: f.isPast && !f.isLive,
                      score: f.score,
                    }}
                    onClose={() => setOpenMatchNo(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", fontFamily: V.fontMono, color: V.sub, fontSize: 12, letterSpacing: "0.08em" }}>
          NO MATCHES IN THIS FILTER
        </div>
      )}
    </div>
  );
}
