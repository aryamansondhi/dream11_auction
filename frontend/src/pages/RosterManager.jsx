import { useState, useEffect } from "react";
import { rosters as rostersApi } from "../api";
import { useStore } from "../store";
import { V, IPL_TEAMS } from "../tokens";
import { SectionLabel, PrimaryBtn, GhostBtn, Input, Select, Label, ErrorBox, Divider, RolePill, StatNumber, TradeCounter, TerminalCard } from "../components/UI";

const ROLE_ORDER = ["Batsman", "All-Rounder", "Wicket-Keeper", "Bowler"];

function SetCapVC({ roster, onDone, onBack }) {
  const [capId, setCapId] = useState(roster.captainId || "");
  const [vcId, setVcId] = useState(roster.viceCaptainId || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [countAsTrade, setCountAsTrade] = useState(true);

  const tradesNeeded = (capId !== (roster.captainId || "") ? 1 : 0) + (vcId !== (roster.viceCaptainId || "") ? 1 : 0);
  const eligible = roster.tradesRemaining >= tradesNeeded && tradesNeeded > 0 && capId !== vcId;

  const save = async () => {
    if (!eligible) return;
    setSaving(true); setErr("");
    try {
      await rostersApi.setCapVC(roster.teamId, {
      captainId: capId !== (roster.captainId || "") ? capId : undefined,
      viceCaptainId: vcId !== (roster.viceCaptainId || "") ? vcId : undefined,
      countAsTrade,
    });
      onDone();
    } catch (e) { setErr(e.error || "Failed"); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <GhostBtn onClick={onBack}>← BACK</GhostBtn>
        <div style={{ fontFamily: V.fontHead, fontSize: 12, color: V.orange, textShadow: `0 0 6px ${V.orange}` }}>SET_CAP_VC.EXE</div>
      </div>
      <div style={{ fontFamily: V.fontMono, fontSize: 12, color: V.text, marginBottom: 4 }}>{roster.teamName}</div>
      <div style={{ marginBottom: 16 }}><TradeCounter used={roster.tradesUsed} max={roster.maxTrades} /></div>
      <ErrorBox message={err} />
      {capId === vcId && capId !== "" && <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.red, marginBottom: 12 }}>⚠ Captain and VC must be different players</div>}
      {tradesNeeded > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: "rgba(255,153,0,0.08)", border: `1px solid rgba(255,153,0,0.3)` }}>
          <input type="checkbox" id="countTrade" checked={countAsTrade} onChange={e => setCountAsTrade(e.target.checked)} style={{ accentColor: V.orange, width: 14, height: 14 }} />
          <label htmlFor="countTrade" style={{ fontFamily: V.fontMono, fontSize: 11, color: V.orange, cursor: "pointer", userSelect: "none" }}>
            Count as trade ({tradesNeeded} trade{tradesNeeded > 1 ? "s" : ""}) — uncheck for initial C/VC setup
          </label>
        </div>
      )}

      <div style={{ display: "grid", gap: 14, marginBottom: 20 }}>
        <div><Label>Captain (2× points)</Label>
          <Select value={capId} onChange={e => setCapId(e.target.value)}>
            <option value="">— None —</option>
            {roster.players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role} · {p.iplTeam})</option>)}
          </Select>
        </div>
        <div><Label>Vice-Captain (1.5× points)</Label>
          <Select value={vcId} onChange={e => setVcId(e.target.value)}>
            <option value="">— None —</option>
            {roster.players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role} · {p.iplTeam})</option>)}
          </Select>
        </div>
      </div>
      <PrimaryBtn onClick={save} disabled={!eligible || saving}>
        {saving ? "SAVING…" : tradesNeeded === 0 ? "NO CHANGES" : `▶ CONFIRM${countAsTrade ? ` (${tradesNeeded} TRADE${tradesNeeded > 1 ? "S" : ""})` : " (NO TRADE COST)"}`}
      </PrimaryBtn>
    </div>
  );
}

function SwapPlayer({ roster, allPlayers, onDone, onBack }) {
  const [playerOutId, setPlayerOutId] = useState("");
  const [playerInId, setPlayerInId] = useState("");
  const [matchesPlayedByOut, setMatchesPlayedByOut] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [countAsTrade, setCountAsTrade] = useState(true);
  const [err, setErr] = useState("");

  const playerOut = roster.players.find(p => p.id === playerOutId);
  const myIds = new Set(roster.players.map(p => p.id));
  const eligible = allPlayers.filter(p => !myIds.has(p.id) && (playerOut ? p.role === playerOut.role : true));

  const save = async () => {
    if (!playerOutId || !playerInId) { setErr("Select both players."); return; }
    setSaving(true); setErr("");
    try { const res = await rostersApi.swap(roster.teamId, { playerOutId, playerInId, matchesPlayedByOut, notes, countAsTrade }); onDone(res.message, res.equalizationNote); }
    catch (e) { setErr(e.error || "Swap failed"); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <GhostBtn onClick={onBack}>← BACK</GhostBtn>
        <div style={{ fontFamily: V.fontHead, fontSize: 12, color: V.cyan, textShadow: `0 0 6px ${V.cyan}` }}>PLAYER_SWAP.EXE</div>
      </div>
      <div style={{ fontFamily: V.fontMono, fontSize: 12, color: V.text, marginBottom: 4 }}>{roster.teamName}</div>
      <div style={{ marginBottom: 16 }}><TradeCounter used={roster.tradesUsed} max={roster.maxTrades} /></div>
      {roster.tradesRemaining <= 0 && <div style={{ fontFamily: V.fontMono, fontSize: 12, color: V.red, padding: "8px 12px", background: V.red + "10", border: `1px solid ${V.red}40`, marginBottom: 12 }}>⚠ TRADE LIMIT REACHED</div>}
      <ErrorBox message={err} />

      <div style={{ display: "grid", gap: 14 }}>
        <div><Label>Player out (from {roster.teamName})</Label>
          <Select value={playerOutId} onChange={e => { setPlayerOutId(e.target.value); setPlayerInId(""); }}>
            <option value="">Select player to remove…</option>
            {ROLE_ORDER.map(role => { const g = roster.players.filter(p => p.role === role); if (!g.length) return null; return <optgroup key={role} label={role}>{g.map(p => <option key={p.id} value={p.id}>{p.name} · {p.iplTeam}{p.isCaptain ? " ★C" : p.isViceCaptain ? " ★VC" : ""}</option>)}</optgroup>; })}
          </Select>
        </div>
        {playerOut && (
          <div><Label>Player in — {playerOut.role} only</Label>
            <Select value={playerInId} onChange={e => setPlayerInId(e.target.value)}>
              <option value="">Select incoming player…</option>
              {IPL_TEAMS.map(t => { const g = eligible.filter(p => p.iplTeam === t); if (!g.length) return null; return <optgroup key={t} label={t}>{g.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>; })}
            </Select>
          </div>
        )}
        <div>
          <Label>Matches played by {playerOut?.name || "outgoing"} this season</Label>
          <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, marginBottom: 6 }}>Incoming player's points count from match {(matchesPlayedByOut || 0) + 1} onwards</div>
          <Input type="number" min="0" value={matchesPlayedByOut} onChange={e => setMatchesPlayedByOut(parseInt(e.target.value) || 0)} style={{ width: 72 }} />
        </div>
        <div><Label>Notes (optional)</Label><Input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. injury replacement" /></div>
      </div>

      {playerOut && playerInId && (
        <div style={{ background: "rgba(0,255,255,0.04)", border: `1px solid ${V.border}`, padding: "10px 14px", margin: "16px 0", fontFamily: V.fontMono, fontSize: 11, color: V.sub, lineHeight: 1.7 }}>
          <span style={{ color: V.text }}>{playerOut.name}</span>'s points retained. <span style={{ color: V.cyan }}>{allPlayers.find(p=>p.id===playerInId)?.name}</span> scores from match {(matchesPlayedByOut||0)+1}. <span style={{ color: V.orange }}>{roster.tradesRemaining - 1} trades remaining after.</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: "rgba(255,153,0,0.08)", border: `1px solid rgba(255,153,0,0.3)` }}>
        <input type="checkbox" id="countSwapTrade" checked={countAsTrade} onChange={e => setCountAsTrade(e.target.checked)} style={{ accentColor: V.orange, width: 14, height: 14 }} />
        <label htmlFor="countSwapTrade" style={{ fontFamily: V.fontMono, fontSize: 11, color: V.orange, cursor: "pointer", userSelect: "none" }}>
          Count as trade — uncheck for admin corrections
        </label>
      </div>
      <PrimaryBtn onClick={save} disabled={!playerOutId || !playerInId || (countAsTrade && roster.tradesRemaining <= 0) || saving}>
        {saving ? "PROCESSING…" : "▶ CONFIRM SWAP — 1 TRADE"}
      </PrimaryBtn>
    </div>
  );
}

function RosterCard({ roster, allPlayers, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");

  const onDone = async (msg, eq) => { await onRefresh(); setMode(null); setSuccessMsg([msg, eq].filter(Boolean).join(" ")); setTimeout(() => setSuccessMsg(""), 5000); };
  const captain = roster.players.find(p => p.isCaptain);
  const vc = roster.players.find(p => p.isViceCaptain);
  const accent = roster.accent || V.cyan;

  if (mode === "capvc") return <SetCapVC roster={roster} onDone={onDone} onBack={() => setMode(null)} />;
  if (mode === "swap") return <SwapPlayer roster={roster} allPlayers={allPlayers} onDone={onDone} onBack={() => setMode(null)} />;

  return (
    <div style={{ background: "rgba(26,16,60,0.6)", border: `1px solid ${V.border}`, borderLeft: `2px solid ${accent}`, marginBottom: 10, overflow: "hidden" }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 2, height: 28, background: accent, boxShadow: `0 0 4px ${accent}`, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: V.fontHead, fontSize: 12, color: V.text }}>{roster.teamName}</div>
          <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, marginTop: 2 }}>
            {captain ? `C: ${captain.name}` : "No captain"} · {vc ? `VC: ${vc.name}` : "No VC"}
          </div>
        </div>
        <TradeCounter used={roster.tradesUsed} max={roster.maxTrades} compact />
        <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, marginLeft: 8 }}>{expanded ? "▲" : "▼"}</div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${V.border}` }}>
          {successMsg && <div style={{ padding: "8px 16px", background: V.green + "10", borderBottom: `1px solid ${V.green}30`, fontFamily: V.fontMono, fontSize: 11, color: V.green, letterSpacing: "0.04em" }}>✓ {successMsg}</div>}

          <div style={{ padding: "10px 16px", display: "flex", gap: 8, borderBottom: `1px solid ${V.border}` }}>
            <button onClick={() => setMode("capvc")} style={{ flex: 1, background: V.orange + "15", border: `1px solid ${V.orange}40`, color: V.orange, fontFamily: V.fontMono, fontSize: 9, padding: "7px 10px", cursor: "pointer", letterSpacing: "0.1em" }}>★ SET C / VC</button>
            <button onClick={() => setMode("swap")} disabled={roster.tradesRemaining <= 0} style={{ flex: 1, background: V.cyan + "12", border: `1px solid ${V.cyan}35`, color: roster.tradesRemaining <= 0 ? V.sub : V.cyan, fontFamily: V.fontMono, fontSize: 9, padding: "7px 10px", cursor: roster.tradesRemaining <= 0 ? "not-allowed" : "pointer", letterSpacing: "0.1em", opacity: roster.tradesRemaining <= 0 ? 0.4 : 1 }}>↔ SWAP</button>
          </div>

          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${V.border}` }}>
            <TradeCounter used={roster.tradesUsed} max={roster.maxTrades} />
          </div>

          {roster.players.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: `1px solid ${V.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: V.fontHead, fontSize: 11, color: V.text, display: "flex", alignItems: "center", gap: 6 }}>
                  {p.name}
                  {p.isCaptain && <span style={{ fontFamily: V.fontMono, fontSize: 8, color: V.orange, background: V.orange + "20", padding: "1px 5px" }}>★ C</span>}
                  {p.isViceCaptain && <span style={{ fontFamily: V.fontMono, fontSize: 8, color: "#CC44FF", background: "#CC44FF20", padding: "1px 5px" }}>★ VC</span>}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 3 }}><RolePill role={p.role} /><span style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub }}>{p.iplTeam}</span></div>
              </div>
            </div>
          ))}

          {roster.recentTrades?.length > 0 && (
            <div style={{ padding: "10px 16px" }}>
              <div style={{ fontFamily: V.fontMono, fontSize: 8, color: V.sub, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>RECENT TRADES</div>
              {roster.recentTrades.map((t, i) => (
                <div key={i} style={{ fontFamily: V.fontMono, fontSize: 10, color: "rgba(224,224,224,0.25)", padding: "2px 0" }}>
                  {t.tradeType === "swap" ? "↔" : "★"} {t.tradeType} · {new Date(t.createdAt).toLocaleDateString()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RosterManager({ onBack }) {
  const { leaderboard } = useStore();
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const allPlayers = leaderboard.flatMap(t => t.players);
  const load = async () => { setLoading(true); try { const res = await rostersApi.getAll(); setRosterData(res.rosters); } catch (e) { setErr(e.error || "Failed to load"); } setLoading(false); };
  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ padding: "40px 0", textAlign: "center", fontFamily: V.fontMono, color: V.sub, letterSpacing: "0.1em" }}>LOADING_ROSTERS…</div>;

  const totalUsed = rosterData?.reduce((s, r) => s + r.tradesUsed, 0) || 0;
  const totalRemaining = rosterData?.reduce((s, r) => s + r.tradesRemaining, 0) || 0;
  const noCaptain = rosterData?.filter(r => !r.captainId).length || 0;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <GhostBtn onClick={onBack}>← BACK</GhostBtn>
        <div style={{ fontFamily: V.fontHead, fontSize: 13, fontWeight: 700, color: V.green, textShadow: `0 0 6px ${V.green}` }}>ROSTER_MANAGER.EXE</div>
        <GhostBtn onClick={load} style={{ marginLeft: "auto", fontSize: 9 }}>↻ SYNC</GhostBtn>
      </div>

      <ErrorBox message={err} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[["Trades used", totalUsed, V.magenta], ["Trades left", totalRemaining, V.green], ["No C/VC", noCaptain, noCaptain > 0 ? V.orange : V.sub]].map(([label, val, color]) => (
          <div key={label} style={{ background: color + "0a", border: `1px solid ${color}30`, borderTop: `2px solid ${color}`, padding: "10px 12px" }}>
            <div style={{ fontFamily: V.fontHead, fontSize: 18, fontWeight: 700, color, textShadow: `0 0 6px ${color}`, lineHeight: 1 }}>{val}</div>
            <div style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub, marginTop: 4, letterSpacing: "0.08em" }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {noCaptain > 0 && (
        <div style={{ background: V.orange + "10", border: `1px solid ${V.orange}40`, padding: "10px 14px", marginBottom: 16, fontFamily: V.fontMono, fontSize: 11, color: V.orange }}>
          ⚠ {noCaptain} squad{noCaptain > 1 ? "s have" : " has"} no captain. Set C/VC before next match.
        </div>
      )}

      {rosterData?.map(r => <RosterCard key={r.teamId} roster={r} allPlayers={allPlayers} onRefresh={load} />)}
    </div>
  );
}
