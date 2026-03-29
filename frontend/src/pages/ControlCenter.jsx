import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { V, IPL_TEAMS, STAT_FIELDS } from "../tokens";
import { SectionLabel, PrimaryBtn, GhostBtn, Input, Select, Label, ErrorBox, Spinner, ConfidenceBadge, StatNumber, RolePill, TerminalCard, NeonText } from "../components/UI";
import MatchRecap from "../components/MatchRecap";
import RosterManager from "./RosterManager";
import { live, score, rosters as rostersApi } from "../api";

// ── Review panel ──────────────────────────────────────────────────────────────
function ReviewPanel({ matched, skipped, warnings, onConfirm, onBack, confirming }) {
  const total = matched.reduce((s, m) => s + m.pts, 0);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <GhostBtn onClick={onBack}>← BACK</GhostBtn>
        <div style={{ fontFamily: V.fontHead, fontSize: 13, fontWeight: 700, color: V.cyan, textShadow: `0 0 6px ${V.cyan}` }}>REVIEW_STATS.DAT</div>
        <div style={{ marginLeft: "auto", fontFamily: V.fontMono, fontSize: 10, color: V.sub }}>{matched.length} players · {total} pts</div>
      </div>

      {warnings.length > 0 && (
        <div style={{ background: "rgba(255,153,0,0.08)", border: `1px solid rgba(255,153,0,0.4)`, padding: "10px 14px", marginBottom: 16 }}>
          <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.orange, marginBottom: 6, letterSpacing: "0.08em" }}>⚠ {warnings.length} WARNING{warnings.length > 1 ? "S" : ""} — REVIEW BEFORE SAVING</div>
          {warnings.map((w, i) => <div key={i} style={{ fontFamily: V.fontMono, fontSize: 11, color: V.orange, marginBottom: 2 }}>› {w.player}: {w.issues?.join(", ")}</div>)}
        </div>
      )}

      {matched.length === 0 && <div style={{ textAlign: "center", padding: "32px 0", fontFamily: V.fontMono, color: V.sub, letterSpacing: "0.06em" }}>NO_REGISTERED_PLAYERS_FOUND</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {matched.map((m, i) => (
          <div key={i} style={{ background: "rgba(26,16,60,0.7)", border: `1px solid ${m.confidence >= 0.9 ? V.border : V.orange + "60"}`, borderLeft: `2px solid ${m.confidence >= 0.9 ? V.cyan : V.orange}`, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: V.fontHead, fontSize: 12, color: V.text }}>{m.playerName}</div>
                <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, marginTop: 1 }}>
                  {m.fantasyTeam} · {m.role} · {m.iplTeam}
                  {m.nameUsed !== m.playerName && <span style={{ color: V.orange }}> › matched "{m.nameUsed}"</span>}
                </div>
              </div>
              <ConfidenceBadge confidence={m.confidence} />
              <StatNumber value={m.pts} size={18} color={V.cyan} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {Object.entries(m.stats).filter(([k, v]) => k !== "played" && +v > 0).map(([k, v]) => (
                <span key={k} style={{ fontFamily: V.fontMono, fontSize: 9, padding: "2px 6px", background: V.muted, color: V.sub }}>{k}:{v}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {skipped.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, marginBottom: 6 }}>{skipped.length} players skipped — not in any squad</div>
          {skipped.map((s, i) => <div key={i} style={{ fontFamily: V.fontMono, fontSize: 10, color: "rgba(224,224,224,0.3)", padding: "2px 0" }}>› {s.incomingName}: {s.reason}</div>)}
        </div>
      )}

      {matched.length > 0 && <PrimaryBtn onClick={onConfirm} disabled={confirming}>{confirming ? "WRITING TO DATABASE…" : `▶ CONFIRM — SAVE ${matched.length} PLAYERS`}</PrimaryBtn>}
    </div>
  );
}

// ── Auto-score ────────────────────────────────────────────────────────────────
function AutoScore({ onBack, onDone }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("select");
  const [preview, setPreview] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState("");

  const loadMatches = async () => {
    setLoading(true); setErr("");
    try { const r = await live.matches(); setMatches(r.matches || []); }
    catch (e) { setErr(e.error || "Signal lost. Check CricketData key."); }
    setLoading(false);
  };
  useState(() => { loadMatches(); }, []);

  const runPreview = async (m) => {
    setStep("fetching"); setErr("");
    try { setStep("parsing"); const r = await score.autoPreview({ matchId: m.id, matchName: m.name }); setPreview({ ...r, matchApiObj: m }); setStep("review"); }
    catch (e) { setErr(e.error || "Parse failed"); setStep("select"); }
  };

  const confirm = async () => {
    setConfirming(true);
    try { await score.autoConfirm({ matchId: preview.matchId, matchName: preview.matchName, iplTeam1: preview.matchApiObj.iplTeam1, iplTeam2: preview.matchApiObj.iplTeam2, claudeRaw: preview.claudeRaw, scorecard: preview.scorecard }); onDone(preview.matched, preview.matchName || "Match"); }
    catch (e) { setErr(e.error || "Save failed"); }
    setConfirming(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <GhostBtn onClick={onBack}>← BACK</GhostBtn>
        <div style={{ fontFamily: V.fontHead, fontSize: 13, fontWeight: 700, color: V.cyan, textShadow: `0 0 6px ${V.cyan}` }}>SCORECARD_PARSER.EXE</div>
      </div>
      <ErrorBox message={err} />

      {step === "select" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <GhostBtn onClick={loadMatches} style={{ fontSize: 9 }}>{loading ? "SCANNING…" : "↻ SCAN MATCHES"}</GhostBtn>
          </div>
          {loading && !matches.length && <Spinner label="Scanning CricketData…" />}
          {!matches.length && !loading && <div style={{ textAlign: "center", padding: "24px", fontFamily: V.fontMono, color: V.sub, letterSpacing: "0.08em" }}>NO_MATCHES_DETECTED</div>}
          {matches.map((m, i) => {
            const stakeCount = m.fantasyStake?.reduce((s, x) => s + x.count, 0) || 0;
            return (
              <div key={m.id || i} style={{ background: "rgba(26,16,60,0.7)", border: `1px solid ${V.border}`, borderLeft: `2px solid ${V.cyan}`, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ fontFamily: V.fontHead, fontSize: 12, color: V.text, marginBottom: 4 }}>{m.name?.split(",")[0] || "Match"}</div>
                <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.sub, marginBottom: stakeCount ? 10 : 14, letterSpacing: "0.03em" }}>
                  {m.status || "—"}{stakeCount > 0 && <span style={{ color: V.orange, marginLeft: 6 }}>// {stakeCount} fantasy players</span>}
                </div>
                {m.alreadyScored ? <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.green, letterSpacing: "0.1em" }}>✓ ALREADY_SCORED</div>
                  : <PrimaryBtn onClick={() => runPreview(m)} style={{ width: "auto", padding: "7px 16px", fontSize: 10 }}>▶ PARSE SCORECARD</PrimaryBtn>}
              </div>
            );
          })}
        </div>
      )}

      {(step === "fetching" || step === "parsing") && (
        <div style={{ textAlign: "center", padding: "52px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 16, animation: "vpPulse 1.5s infinite", color: step === "fetching" ? V.cyan : V.magenta }}>
            {step === "fetching" ? "◈" : "◇"}
          </div>
          <div style={{ fontFamily: V.fontHead, fontSize: 14, color: V.text, marginBottom: 6 }}>{step === "fetching" ? "FETCHING SCORECARD…" : "CLAUDE PARSING DATA…"}</div>
          <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, letterSpacing: "0.06em" }}>
            {step === "fetching" ? "Pulling data from CricketData API" : "Extracting player stats from match data"}
          </div>
        </div>
      )}

      {step === "review" && preview && <ReviewPanel matched={preview.matched} skipped={preview.skipped} warnings={preview.warnings} onConfirm={confirm} onBack={() => setStep("select")} confirming={confirming} />}
    </div>
  );
}

// ── Screenshot ────────────────────────────────────────────────────────────────
function Screenshot({ onBack, onDone }) {
  const [img, setImg] = useState(null);
  const [meta, setMeta] = useState({ t1: "", t2: "", date: "" });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [err, setSsErr] = useState("");
  const fileRef = useRef();

  const handleFile = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setImg({ data: ev.target.result.split(",")[1], type: f.type, url: ev.target.result }); r.readAsDataURL(f); };
  const runPreview = async () => { if (!img) return; setLoading(true); setSsErr(""); setPreview(null); try { const r = await score.ssPreview({ imageBase64: img.data, mediaType: img.type }); setPreview(r); } catch (e) { setSsErr(e.error || "Parse failed"); } setLoading(false); };
  const confirm = async () => { setConfirming(true); const label = meta.t1 && meta.t2 ? `${meta.t1} vs ${meta.t2}${meta.date ? " · " + meta.date : ""}` : undefined; try { await score.ssConfirm({ claudeRaw: preview.claudeRaw, iplTeam1: meta.t1, iplTeam2: meta.t2, matchDate: meta.date, label }); onDone(preview.matched, label || "Screenshot match"); } catch (e) { setSsErr(e.error || "Save failed"); } setConfirming(false); };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <GhostBtn onClick={onBack}>← BACK</GhostBtn>
        <div style={{ fontFamily: V.fontHead, fontSize: 13, fontWeight: 700, color: V.magenta, textShadow: `0 0 6px ${V.magenta}` }}>IMAGE_IMPORT.EXE</div>
      </div>
      <ErrorBox message={err} />

      {!preview && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div><Label>Team 1</Label><Select value={meta.t1} onChange={e => setMeta(m => ({ ...m, t1: e.target.value }))}><option value="">Select…</option>{IPL_TEAMS.map(t => <option key={t}>{t}</option>)}</Select></div>
            <div><Label>Team 2</Label><Select value={meta.t2} onChange={e => setMeta(m => ({ ...m, t2: e.target.value }))}><option value="">Select…</option>{IPL_TEAMS.filter(t => t !== meta.t1).map(t => <option key={t}>{t}</option>)}</Select></div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Label>Date (optional)</Label>
            <Input type="date" value={meta.date} onChange={e => setMeta(m => ({ ...m, date: e.target.value }))} style={{ width: "auto" }} />
          </div>
          <div onClick={() => fileRef.current.click()} style={{ border: `1px dashed ${img ? V.magenta : V.border}`, padding: "28px 20px", textAlign: "center", cursor: "pointer", marginBottom: 12, background: img ? "rgba(255,0,255,0.05)" : "transparent", transition: "all 0.2s" }}>
            <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} style={{ display: "none" }} />
            {img ? <img src={img.url} alt="" style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain" }} />
              : <div>
                  <div style={{ fontSize: 28, marginBottom: 8, color: V.magenta, textShadow: V.glowM }}>◈</div>
                  <div style={{ fontFamily: V.fontMono, fontSize: 12, color: V.sub, letterSpacing: "0.06em" }}>CLICK TO UPLOAD SCORECARD</div>
                  <div style={{ fontFamily: V.fontMono, fontSize: 10, color: "rgba(224,224,224,0.2)", marginTop: 4 }}>PNG · JPG from Cricbuzz, ESPN, anywhere</div>
                </div>}
          </div>
          {img && <GhostBtn onClick={() => { setImg(null); setSsErr(""); }} style={{ marginBottom: 14, fontSize: 9 }}>✕ REMOVE</GhostBtn>}
          {loading ? <div style={{ textAlign: "center", padding: "20px 0" }}><div style={{ fontFamily: V.fontHead, fontSize: 13, color: V.magenta, animation: "vpPulse 1.5s infinite" }}>CLAUDE READING IMAGE…</div></div>
            : <PrimaryBtn onClick={runPreview} disabled={!img}>▶ SEND TO CLAUDE</PrimaryBtn>}
        </div>
      )}
      {preview && <ReviewPanel matched={preview.matched} skipped={preview.skipped} warnings={preview.warnings} onConfirm={confirm} onBack={() => setPreview(null)} confirming={confirming} />}
    </div>
  );
}

// ── CREX entry ────────────────────────────────────────────────────────────────
function CrexEntry({ onBack, onDone }) {
  const { leaderboard } = useStore();
  const [step, setStep] = useState(1);
  const [meta, setMeta] = useState({ t1: "", t2: "", date: "", label: "" });
  const [points, setPoints] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const setP = (playerId, val) => setPoints(s => ({ ...s, [playerId]: val }));
  const entered = Object.values(points).filter(v => v !== "" && !isNaN(v)).length;

  const submit = async () => {
    setSaving(true); setErr("");
    const playerPoints = Object.entries(points).filter(([, v]) => v !== "" && !isNaN(v)).map(([playerId, pts]) => ({ playerId, points: parseFloat(pts) }));
    if (!playerPoints.length) { setErr("Enter points for at least one player."); setSaving(false); return; }
    try {
      const label = meta.label || `${meta.t1} vs ${meta.t2}${meta.date ? " · " + meta.date : ""}`;
      await score.crex({ label, iplTeam1: meta.t1, iplTeam2: meta.t2, matchDate: meta.date, playerPoints });
      onDone(null, label);
    } catch (e) { setErr(e.error || "Save failed"); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <GhostBtn onClick={() => step === 1 ? onBack() : setStep(1)}>← BACK</GhostBtn>
        <div style={{ fontFamily: V.fontHead, fontSize: 13, fontWeight: 700, color: "#CC44FF", textShadow: "0 0 6px #CC44FF" }}>CREX_ENTRY.EXE</div>
      </div>

      <div style={{ background: "rgba(204,68,255,0.06)", border: "1px solid rgba(204,68,255,0.3)", borderLeft: "2px solid #CC44FF", padding: "10px 14px", marginBottom: 20 }}>
        <div style={{ fontFamily: V.fontMono, fontSize: 11, color: "#CC44FF", lineHeight: 1.7, letterSpacing: "0.04em" }}>
          Enter each player's final CREX points directly. C/VC multipliers (2× / 1.5×) are applied automatically.
        </div>
      </div>

      <ErrorBox message={err} />

      {step === 1 && (
        <div style={{ display: "grid", gap: 14 }}>
          <div><Label>Date</Label><Input type="date" value={meta.date} onChange={e => setMeta(m => ({ ...m, date: e.target.value }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>IPL Team 1</Label><Select value={meta.t1} onChange={e => setMeta(m => ({ ...m, t1: e.target.value }))}><option value="">Select…</option>{IPL_TEAMS.map(t => <option key={t}>{t}</option>)}</Select></div>
            <div><Label>IPL Team 2</Label><Select value={meta.t2} onChange={e => setMeta(m => ({ ...m, t2: e.target.value }))}><option value="">Select…</option>{IPL_TEAMS.filter(t => t !== meta.t1).map(t => <option key={t}>{t}</option>)}</Select></div>
          </div>
          <div><Label>Match label (optional)</Label><Input type="text" value={meta.label} onChange={e => setMeta(m => ({ ...m, label: e.target.value }))} placeholder={`${meta.t1 || "A"} vs ${meta.t2 || "B"}`} /></div>
          <PrimaryBtn onClick={() => meta.t1 && meta.t2 && setStep(2)} disabled={!meta.t1 || !meta.t2}>▶ NEXT — ENTER PLAYER POINTS</PrimaryBtn>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, marginBottom: 4, letterSpacing: "0.06em" }}>{meta.t1} vs {meta.t2} · {entered} players entered</div>
          <div style={{ fontFamily: V.fontMono, fontSize: 10, color: "rgba(224,224,224,0.25)", marginBottom: 16, letterSpacing: "0.04em" }}>Leave blank to skip a player</div>

          {leaderboard.map(team => {
            const eligible = team.players.filter(p => p.iplTeam === meta.t1 || p.iplTeam === meta.t2);
            if (!eligible.length) return null;
            const teamTotal = eligible.reduce((s, p) => s + (parseFloat(points[p.id]) || 0), 0);

            return (
              <div key={team.id} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "7px 12px", background: (team.accent || V.cyan) + "0e", border: `1px solid ${(team.accent || V.cyan)}25` }}>
                  <div style={{ width: 2, height: 14, background: team.accent || V.cyan, boxShadow: `0 0 4px ${team.accent || V.cyan}` }} />
                  <span style={{ fontFamily: V.fontMono, fontSize: 9, color: team.accent || V.cyan, letterSpacing: "0.12em", textTransform: "uppercase", flex: 1 }}>{team.name}</span>
                  {teamTotal > 0 && <span style={{ fontFamily: V.fontHead, fontSize: 13, color: team.accent || V.cyan, textShadow: `0 0 6px ${team.accent || V.cyan}` }}>+{teamTotal.toFixed(1)}</span>}
                </div>

                {eligible.map(player => {
                  const val = points[player.id];
                  const hasVal = val !== "" && val !== undefined && !isNaN(val);
                  return (
                    <div key={player.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: hasVal ? "rgba(26,16,60,0.7)" : "rgba(0,0,0,0.3)", border: `1px solid ${hasVal ? (team.accent || V.cyan) + "40" : V.border}`, marginBottom: 5, transition: "all 0.15s" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: V.fontHead, fontSize: 11, color: hasVal ? V.text : V.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                          <RolePill role={player.role} />
                          <span style={{ fontFamily: V.fontMono, fontSize: 9, color: V.sub }}>{player.iplTeam}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {hasVal && <StatNumber value={parseFloat(val).toFixed(1)} color={team.accent || V.cyan} size={14} />}
                        <Input type="number" step="0.5" placeholder="pts" value={val ?? ""}
                          onChange={e => setP(player.id, e.target.value === "" ? "" : parseFloat(e.target.value))}
                          style={{ width: 72, textAlign: "center", fontSize: 12, padding: "6px 8px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {entered > 0 && (
            <div style={{ position: "sticky", bottom: 16, background: "rgba(0,0,0,0.9)", border: `1px solid ${V.border}`, borderTop: `2px solid ${V.magenta}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: `0 -4px 24px rgba(0,0,0,0.6)` }}>
              <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, flex: 1 }}>
                {entered} players · {Object.values(points).filter(v => v !== "" && !isNaN(v)).reduce((s, v) => s + parseFloat(v || 0), 0).toFixed(1)} pts
              </div>
              <PrimaryBtn onClick={submit} disabled={saving} style={{ width: "auto", padding: "9px 18px", fontSize: 10 }}>
                {saving ? "WRITING…" : "▶ SAVE TO LEADERBOARD"}
              </PrimaryBtn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Rollback ──────────────────────────────────────────────────────────────────
function Audit({ onBack }) {
  const { matches, fetchLeague } = useStore();
  const [rolling, setRolling] = useState(null);
  const [err, setErr] = useState("");

  const doRollback = async (matchId, label) => {
    if (!confirm(`Roll back "${label}"?`)) return;
    setRolling(matchId); setErr("");
    try { await score.rollback(matchId); await fetchLeague(); }
    catch (e) { setErr(e.error || "Rollback failed"); }
    setRolling(null);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <GhostBtn onClick={onBack}>← BACK</GhostBtn>
        <div style={{ fontFamily: V.fontHead, fontSize: 13, fontWeight: 700, color: V.red, textShadow: `0 0 6px ${V.red}` }}>ROLLBACK_UTILITY.EXE</div>
      </div>
      <ErrorBox message={err} />
      <SectionLabel>Scored matches</SectionLabel>
      {matches.length === 0 && <div style={{ fontFamily: V.fontMono, fontSize: 12, color: V.sub, letterSpacing: "0.06em" }}>NO_MATCHES_SCORED_YET</div>}
      {matches.map(m => (
        <div key={m.id} style={{ background: "rgba(26,16,60,0.6)", border: `1px solid ${V.border}`, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: V.fontHead, fontSize: 12, color: V.text }}>{m.label}</div>
            <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, marginTop: 2 }}>{m.source?.replace(/_/g, " ")} · {new Date(m.createdAt).toLocaleDateString()}</div>
          </div>
          <button onClick={() => doRollback(m.id, m.label)} disabled={rolling === m.id} style={{ background: "transparent", border: `1px solid ${V.red}50`, color: V.red, fontFamily: V.fontMono, fontSize: 9, padding: "5px 12px", cursor: "pointer", letterSpacing: "0.1em", opacity: rolling === m.id ? 0.5 : 1, transition: "all 0.15s" }}>
            {rolling === m.id ? "PROCESSING…" : "↩ ROLLBACK"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Retained Points Entry ─────────────────────────────────────────────────────
function RetainedPoints({ onBack }) {
  const { leaderboard } = useStore();
  const [teamId, setTeamId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [iplTeam, setIplTeam] = useState("");
  const [role, setRole] = useState("Batsman");
  const [points, setPoints] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const save = async () => {
    if (!teamId || !playerName || points === "") { setErr("Fill in all fields."); return; }
    setSaving(true); setErr(""); setOk("");
    try {
      const res = await rostersApi.retain(teamId, { playerName, iplTeam, role, points: parseFloat(points) });
      setOk(res.message);
      setPlayerName(""); setIplTeam(""); setPoints("");
    } catch (e) { setErr(e.error || "Failed"); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <GhostBtn onClick={onBack}>← BACK</GhostBtn>
        <div style={{ fontFamily: V.fontHead, fontSize: 13, fontWeight: 700, color: V.orange, textShadow: `0 0 6px ${V.orange}` }}>RETAINED_PTS.EXE</div>
      </div>
      <div style={{ background: "rgba(255,153,0,0.06)", border: "1px solid rgba(255,153,0,0.3)", borderLeft: `2px solid ${V.orange}`, padding: "10px 14px", marginBottom: 20 }}>
        <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.orange, lineHeight: 1.7 }}>
          Manually log points that stay on a team's total from a player they traded away. Type the player name, pick the team that retains the points, enter the amount.
        </div>
      </div>
      <ErrorBox message={err} />
      {ok && <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.green, padding: "8px 12px", background: V.green + "10", border: `1px solid ${V.green}30`, marginBottom: 16 }}>✓ {ok}</div>}
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <Label>Fantasy team (who retains the points)</Label>
          <Select value={teamId} onChange={e => setTeamId(e.target.value)}>
            <option value="">Select team…</option>
            {leaderboard.map(t => <option key={t.id} value={t.id}>{t.name} — {t.manager}</option>)}
          </Select>
        </div>
        <div>
          <Label>Player name</Label>
          <Input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="e.g. Krunal Pandya" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Label>IPL Team</Label>
            <Select value={iplTeam} onChange={e => setIplTeam(e.target.value)}>
              <option value="">Select…</option>
              {["MI","CSK","RCB","KKR","SRH","GT","RR","DC","PBKS","LSG"].map(t => <option key={t}>{t}</option>)}
            </Select>
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onChange={e => setRole(e.target.value)}>
              {["Batsman","Bowler","All-Rounder","Wicket-Keeper"].map(r => <option key={r}>{r}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <Label>Points to retain (can be negative)</Label>
          <Input type="number" step="0.5" value={points} onChange={e => setPoints(e.target.value)} placeholder="e.g. -1 or 45" />
        </div>
        <PrimaryBtn onClick={save} disabled={saving || !teamId || !playerName || points === ""}>
          {saving ? "SAVING…" : "▶ SAVE RETAINED POINTS"}
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ── Menu items ────────────────────────────────────────────────────────────────
const MENU = [
  { id: "crex",       color: "#CC44FF", badge: "PRIMARY SCORING METHOD", title: "Enter CREX Fantasy Points",    desc: "Enter each player's final CREX points directly. C/VC multipliers applied automatically. This is how every match gets scored." },
  { id: "rosters",    color: V.green,   badge: "SQUAD MANAGEMENT",       title: "Manage Rosters & Trades",     desc: "Set captains, vice-captains, swap players. Track each team's trade count. Equalization is enforced automatically." },
  { id: "trades", color: V.cyan, badge: "ADMIN TOOL", title: "Trades Overview & Editor", desc: "See every team's trade count at a glance. Nudge counts up or down to correct mistakes." },
  { id: "auto",       color: V.cyan,    badge: "REFERENCE TOOL",         title: "Parse Scorecard via API",     desc: "Fetch a live or recent match scorecard from CricketData. Claude extracts raw stats for reference. Useful for verifying CREX figures." },
  { id: "screenshot", color: V.magenta, badge: null,                     title: "Import from Screenshot",      desc: "Upload a scorecard image from Cricbuzz or ESPN. Claude reads stats and maps them to your squads." },
  { id: "audit",      color: V.red,     badge: null,                     title: "Rollback & Audit",            desc: "Remove all points from a scored match. Full audit trail in the database." },
  { id: "retained",   color: V.orange,  badge: "POINTS RETENTION", title: "Log Retained Points", desc: "Manually enter points that stay on a team's total from a traded-out player." },
];

function TradesOverview({ onBack }) {
  const [rosters, setRosters] = useState([]);
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    rostersApi.getAll()
    .then(r => setRosters(r.rosters))
    .catch((e) => setErr(e.error || "Failed to load rosters"));
  }, []);

  const save = async (teamId) => {
    if (editing[teamId] === undefined) return;
    setSaving(teamId);
    try {
      await rostersApi.setTrades(teamId, editing[teamId]);
      setRosters(r => r.map(t => t.teamId === teamId ? { ...t, tradesUsed: editing[teamId], tradesRemaining: t.maxTrades - editing[teamId] } : t));
      setEditing(e => { const n = { ...e }; delete n[teamId]; return n; });
    } catch (e) { setErr(e.error || "Failed"); }
    setSaving(null);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <GhostBtn onClick={onBack}>← BACK</GhostBtn>
        <div style={{ fontFamily: V.fontHead, fontSize: 13, fontWeight: 700, color: V.cyan, textShadow: `0 0 6px ${V.cyan}` }}>TRADES_OVERVIEW.EXE</div>
      </div>
      <ErrorBox message={err} />
      <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, marginBottom: 16, letterSpacing: "0.04em" }}>
        Edit the trades used count for any team. Use this to correct mistakes or manually apply trades made outside the app.
      </div>
      {rosters.map(r => {
        const used = editing[r.teamId] !== undefined ? editing[r.teamId] : r.tradesUsed;
        const remaining = r.maxTrades - used;
        const color = remaining > 5 ? V.green : remaining > 2 ? V.orange : V.red;
        return (
          <div key={r.teamId} style={{ background: "rgba(26,16,60,0.7)", border: `1px solid ${(r.accent || V.cyan) + "40"}`, borderLeft: `2px solid ${r.accent || V.cyan}`, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: V.fontHead, fontSize: 12, color: V.text }}>{r.teamName}</div>
                <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub, marginTop: 2 }}>{r.manager}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub }}>Used:</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setEditing(e => ({ ...e, [r.teamId]: Math.max(0, used - 1) }))} style={{ background: "rgba(255,0,255,0.15)", border: `1px solid ${V.magenta}40`, color: V.magenta, width: 24, height: 24, cursor: "pointer", fontFamily: V.fontMono, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <div style={{ fontFamily: V.fontHead, fontSize: 16, fontWeight: 700, color, textShadow: `0 0 6px ${color}`, minWidth: 20, textAlign: "center" }}>{used}</div>
                  <button onClick={() => setEditing(e => ({ ...e, [r.teamId]: Math.min(r.maxTrades, used + 1) }))} style={{ background: "rgba(0,255,255,0.1)", border: `1px solid ${V.cyan}40`, color: V.cyan, width: 24, height: 24, cursor: "pointer", fontFamily: V.fontMono, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
                <div style={{ fontFamily: V.fontMono, fontSize: 10, color: V.sub }}>/ {r.maxTrades}</div>
                <div style={{ fontFamily: V.fontMono, fontSize: 10, color, padding: "2px 8px", background: color + "15", border: `1px solid ${color}30`, letterSpacing: "0.08em", minWidth: 80, textAlign: "center" }}>
                  {remaining} LEFT
                </div>
                {editing[r.teamId] !== undefined && (
                  <button onClick={() => save(r.teamId)} disabled={saving === r.teamId} style={{ background: V.cyan + "18", border: `1px solid ${V.cyan}50`, color: V.cyan, fontFamily: V.fontMono, fontSize: 9, padding: "4px 10px", cursor: "pointer", letterSpacing: "0.1em" }}>
                    {saving === r.teamId ? "…" : "SAVE"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ControlCenter() {
  const [mode, setMode] = useState("home");
  const [recap, setRecap] = useState(null);
  const { fetchLeague, matches } = useStore();
  const navigate = useNavigate();

  const onDone = async (matched, matchLabel) => {
    await fetchLeague();
    if (matched) setRecap({ matched, matchLabel });
    else navigate("/");
  };

  if (recap) return <MatchRecap matched={recap.matched} matchLabel={recap.matchLabel} onDismiss={() => { setRecap(null); navigate("/"); }} />;

  return (
    <div className="vp-animate-in">
      {mode === "home" && (
        <div>
          <SectionLabel>Control center</SectionLabel>
          <div style={{ display: "grid", gap: 8, marginBottom: 28 }}>
            {MENU.map(item => (
              <div key={item.id}
                onClick={() => setMode(item.id)}
                style={{ background: "rgba(26,16,60,0.7)", border: `1px solid ${item.color}40`, borderLeft: `2px solid ${item.color}`, padding: "16px 18px", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = item.color + "0e"; e.currentTarget.style.borderColor = item.color + "80"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(26,16,60,0.7)"; e.currentTarget.style.borderColor = item.color + "40"; }}>
                {item.badge && (
                  <div style={{ fontFamily: V.fontMono, fontSize: 8, letterSpacing: "0.18em", color: item.color, textShadow: `0 0 4px ${item.color}`, marginBottom: 6, textTransform: "uppercase" }}>
                    ◆ {item.badge}
                  </div>
                )}
                <div style={{ fontFamily: V.fontHead, fontSize: 13, fontWeight: 700, color: V.text, marginBottom: 4, letterSpacing: "0.02em" }}>{item.title}</div>
                <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.sub, lineHeight: 1.6, letterSpacing: "0.03em" }}>{item.desc}</div>
              </div>
            ))}
          </div>

          {matches.length > 0 && (
            <>
              <SectionLabel>Match log</SectionLabel>
              {[...matches].map(m => (
                <div key={m.id} style={{ fontFamily: V.fontMono, fontSize: 11, color: V.sub, padding: "6px 0", borderBottom: `1px solid ${V.border}`, display: "flex", gap: 10, letterSpacing: "0.03em" }}>
                  <span style={{ color: V.magenta }}>▶</span>
                  <span style={{ flex: 1 }}>{m.label}</span>
                  <span style={{ fontSize: 9, color: V.muted, textTransform: "uppercase" }}>{m.source?.replace(/_/g, " ")}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {mode === "crex"       && <CrexEntry    onBack={() => setMode("home")} onDone={onDone} />}
      {mode === "rosters"    && <RosterManager onBack={() => setMode("home")} />}
      {mode === "trades" && <TradesOverview onBack={() => setMode("home")} />}
      {mode === "auto"       && <AutoScore    onBack={() => setMode("home")} onDone={onDone} />}
      {mode === "screenshot" && <Screenshot   onBack={() => setMode("home")} onDone={onDone} />}
      {mode === "audit"      && <Audit        onBack={() => setMode("home")} />}
      {mode === "retained"   && <RetainedPoints onBack={() => setMode("home")} />}
    </div>
  );
}
