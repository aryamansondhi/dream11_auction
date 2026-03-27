/**
 * CREX Fantasy Points Reference Calculator
 * Server-side, no client exposure
 */

function calcPoints(stats, role) {
  if (!stats?.played) return 0;

  let pts = 4; // playing XI bonus

  const runs         = Number(stats.runs)         || 0;
  const balls        = Number(stats.balls)        || 0;
  const fours        = Number(stats.fours)        || 0;
  const sixes        = Number(stats.sixes)        || 0;
  const wickets      = Number(stats.wickets)      || 0;
  const overs        = Number(stats.overs)        || 0;
  const runsConceded = Number(stats.runsConceded) || 0;
  const dotBalls     = Number(stats.dotBalls)     || 0;
  const maidens      = Number(stats.maidens)      || 0;
  const lbwBowled    = Number(stats.lbwBowled)    || 0;
  const catches      = Number(stats.catches)      || 0;
  const stumpings    = Number(stats.stumpings)    || 0;
  const directRO     = Number(stats.directRO)     || 0;
  const indirectRO   = Number(stats.indirectRO)   || 0;

  // ── Batting ──────────────────────────────────────────────────────────────
  pts += runs + (fours * 4) + (sixes * 6);

  // Milestone bonuses — century replaces all others
  if (runs >= 100)      pts += 16;
  else if (runs >= 75)  pts += 12;
  else if (runs >= 50)  pts += 8;
  else if (runs >= 25)  pts += 4;

  // Duck penalty (not for bowlers)
  if (runs === 0 && balls > 0 && role !== "Bowler") pts -= 2;

  // Strike rate (min 10 balls)
  if (balls >= 10) {
    const sr = (runs / balls) * 100;
    if      (sr > 170)             pts += 6;
    else if (sr > 150)             pts += 4;
    else if (sr >= 130)            pts += 2;
    else if (sr >= 60 && sr <= 70) pts -= 2;
    else if (sr >= 50 && sr < 60)  pts -= 4;
    else if (sr < 50 && runs > 0)  pts -= 6;
    // Note: SR penalty only if scored runs (faced 10+ balls but scored 0 = already penalised by duck rule)
  }

  // ── Bowling ───────────────────────────────────────────────────────────────
  pts += (wickets * 30) + (lbwBowled * 8);

  if      (wickets >= 5) pts += 12;
  else if (wickets >= 4) pts += 8;
  else if (wickets >= 3) pts += 4;

  pts += dotBalls + (maidens * 12);

  // Economy rate (min 2 overs)
  if (overs >= 2) {
    const econ = runsConceded / overs;
    if      (econ < 5)             pts += 6;
    else if (econ < 6)             pts += 4;
    else if (econ <= 7)            pts += 2;
    else if (econ >= 10 && econ <= 11) pts -= 2;
    else if (econ > 11 && econ <= 12)  pts -= 4;
    else if (econ > 12)            pts -= 6;
  }

  // ── Fielding ──────────────────────────────────────────────────────────────
  pts += (catches * 8);
  if (catches >= 3) pts += 4; // 3-catch bonus (flat, not multiplied)

  pts += (stumpings * 12) + (directRO * 12) + (indirectRO * 6);

  return pts;
}

/**
 * Validate and sanitise incoming stat object before calculating
 * Returns { valid, errors, sanitised }
 */
function validateStats(raw, role) {
  const errors = [];
  const s = { ...raw };

  // Runs can't exceed balls * 6 + overthrows (allow small buffer)
  if (s.runs > 0 && s.balls > 0 && s.runs > (s.balls * 6 + 30)) {
    errors.push(`Suspicious: ${s.runs} runs off ${s.balls} balls`);
  }

  // Overs can't exceed 4 in T20
  if (s.overs > 4) {
    errors.push(`Overs ${s.overs} exceeds T20 maximum of 4`);
  }

  // Can't take more wickets than overs bowled × 6 (approx)
  if (s.wickets > 0 && s.overs === 0) {
    errors.push(`Wickets recorded but 0 overs bowled`);
  }

  // Dot balls can't exceed overs × 6
  if (s.dotBalls > 0 && s.overs > 0 && s.dotBalls > s.overs * 6) {
    errors.push(`Dot balls ${s.dotBalls} exceeds balls bowled`);
  }

  // Maidens can't exceed overs (rounded down)
  if (s.maidens > Math.floor(s.overs)) {
    errors.push(`Maidens ${s.maidens} exceeds overs ${s.overs}`);
    s.maidens = Math.floor(s.overs); // cap it
  }

  // Non-negative enforcement
  const fields = ["runs","balls","fours","sixes","wickets","overs","runsConceded","dotBalls","maidens","lbwBowled","catches","stumpings","directRO","indirectRO"];
  fields.forEach(f => {
    if (s[f] < 0) { errors.push(`${f} is negative`); s[f] = 0; }
  });

  return { valid: errors.length === 0, warnings: errors, sanitised: s };
}

module.exports = { calcPoints, validateStats };
