const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireAdmin } = require("../middleware/auth");
const { getScorecard } = require("../services/cricket-api");
const { extractFromScorecard, extractFromImage, processParsedStats } = require("../services/ai-scorer");
const { calcPoints } = require("../services/scoring-engine");
const { broadcast } = require("./events");

const router = express.Router();
const prisma = new PrismaClient();

// All scoring routes require admin
router.use(requireAdmin);

// Helper: get all registered player names
async function getRegisteredNames() {
  const players = await prisma.player.findMany({ select: { name: true } });
  return players.map(p => p.name);
}

// Helper: commit matched stats to DB
async function commitMatch({ label, iplTeam1, iplTeam2, matchDate, cricketApiId, source, rawPayload, matched, warnings }) {
  return await prisma.$transaction(async (tx) => {
    // Guard: prevent duplicate scoring of same cricketApiId
    if (cricketApiId) {
      const existing = await tx.match.findUnique({ where: { cricketApiId } });
      if (existing && existing.status === "scored") {
        throw new Error(`This match has already been scored (ID: ${existing.id}). Use rollback first if you need to re-score.`);
      }
    }

    const match = await tx.match.create({
      data: {
        label,
        iplTeam1: iplTeam1 || "",
        iplTeam2: iplTeam2 || "",
        matchDate: matchDate || null,
        cricketApiId: cricketApiId || null,
        source,
        rawPayload: rawPayload || undefined,
        status: "scored",
        auditLogs: {
          create: {
            action: "match_scored",
            details: {
              source,
              playerCount: matched.length,
              warnings,
              timestamp: new Date().toISOString(),
            },
          },
        },
      },
    });

    for (const { player, stats, confidence, method, nameUsed } of matched) {
      const pts = calcPoints(stats, player.role);
      await tx.playerMatchScore.create({
        data: {
          matchId: match.id,
          playerId: player.id,
          fantasyTeamId: player.fantasyTeamId,
          points: pts,
          played: !!stats.played,
          runs: stats.runs || 0,
          balls: stats.balls || 0,
          fours: stats.fours || 0,
          sixes: stats.sixes || 0,
          wickets: stats.wickets || 0,
          overs: stats.overs || 0,
          runsConceded: stats.runsConceded || 0,
          dotBalls: stats.dotBalls || 0,
          maidens: stats.maidens || 0,
          lbwBowled: stats.lbwBowled || 0,
          catches: stats.catches || 0,
          stumpings: stats.stumpings || 0,
          directRO: stats.directRO || 0,
          indirectRO: stats.indirectRO || 0,
          nameMatchConfidence: confidence,
          nameUsed: nameUsed || player.name,
        },
      });
    }

    return match;
  });
}

// ─── POST /api/score/auto ─────────────────────────────────────────────────────
// Step 1: fetch scorecard, Step 2: Claude parses, Step 3: preview returned
router.post("/auto/preview", async (req, res) => {
  try {
    const { matchId, matchName } = req.body;
    if (!matchId) return res.status(400).json({ error: "matchId required" });

    // Check if already scored
    const existing = await prisma.match.findUnique({ where: { cricketApiId: matchId } });
    if (existing?.status === "scored") {
      return res.status(409).json({ error: "Already scored", existingMatchId: existing.id });
    }

    const scorecard = await getScorecard(matchId);
    const registeredNames = await getRegisteredNames();
    const claudeOutput = await extractFromScorecard(JSON.stringify(scorecard, null, 2), registeredNames);
    const { matched, skipped, warnings } = await processParsedStats(claudeOutput);

    res.json({
      preview: true,
      matchId,
      matchName,
      scorecard: scorecard,
      claudeRaw: claudeOutput,
      matched: matched.map(m => ({
        playerName: m.player.name,
        fantasyTeam: m.player.fantasyTeam?.name,
        fantasyTeamId: m.player.fantasyTeamId,
        role: m.player.role,
        iplTeam: m.player.iplTeam,
        stats: m.stats,
        pts: calcPoints(m.stats, m.player.role),
        confidence: m.confidence,
        method: m.method,
        nameUsed: m.nameUsed,
      })),
      skipped,
      warnings,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/score/auto/confirm ─────────────────────────────────────────────
router.post("/auto/confirm", async (req, res) => {
  try {
    const { matchId, matchName, iplTeam1, iplTeam2, matchDate, claudeRaw, scorecard } = req.body;
    const registeredNames = await getRegisteredNames();
    const { matched, skipped, warnings } = await processParsedStats(claudeRaw);

    const match = await commitMatch({
      label: matchName || `${iplTeam1} vs ${iplTeam2}`,
      iplTeam1, iplTeam2, matchDate,
      cricketApiId: matchId,
      source: "auto_api",
      rawPayload: scorecard,
      matched, warnings,
    });

    broadcast("match_scored", { matchId: match.id, label: match.label, playersScored: matched.length });
    res.json({ success: true, matchId: match.id, playersScored: matched.length, warnings });
  } catch (e) {
    console.error(e);
    res.status(e.message.includes("already been scored") ? 409 : 500).json({ error: e.message });
  }
});

// ─── POST /api/score/screenshot ───────────────────────────────────────────────
router.post("/screenshot/preview", async (req, res) => {
  try {
    const { imageBase64, mediaType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 required" });

    const registeredNames = await getRegisteredNames();
    const claudeOutput = await extractFromImage(imageBase64, mediaType || "image/png", registeredNames);
    const { matched, skipped, warnings } = await processParsedStats(claudeOutput);

    res.json({
      claudeRaw: claudeOutput,
      matched: matched.map(m => ({
        playerName: m.player.name,
        fantasyTeam: m.player.fantasyTeam?.name,
        fantasyTeamId: m.player.fantasyTeamId,
        role: m.player.role,
        iplTeam: m.player.iplTeam,
        stats: m.stats,
        pts: calcPoints(m.stats, m.player.role),
        confidence: m.confidence,
        method: m.method,
        nameUsed: m.nameUsed,
      })),
      skipped,
      warnings,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.post("/screenshot/confirm", async (req, res) => {
  try {
    const { claudeRaw, iplTeam1, iplTeam2, matchDate, label } = req.body;
    const { matched, skipped, warnings } = await processParsedStats(claudeRaw);

    const match = await commitMatch({
      label: label || `${iplTeam1 || "?"} vs ${iplTeam2 || "?"}${matchDate ? " · " + matchDate : ""}`,
      iplTeam1: iplTeam1 || "", iplTeam2: iplTeam2 || "", matchDate,
      source: "screenshot",
      matched, warnings,
    });

    broadcast("match_scored", { matchId: match.id, label: match.label, playersScored: matched.length });
    res.json({ success: true, matchId: match.id, playersScored: matched.length, warnings });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/score/manual ───────────────────────────────────────────────────
router.post("/manual", async (req, res) => {
  try {
    const { label, iplTeam1, iplTeam2, matchDate, playerStats } = req.body;
    // playerStats: [{ playerId, stats }]
    if (!playerStats?.length) return res.status(400).json({ error: "No player stats provided" });

    const players = await prisma.player.findMany({
      where: { id: { in: playerStats.map(ps => ps.playerId) } },
      include: { fantasyTeam: true },
    });

    const matched = playerStats.map(ps => {
      const player = players.find(p => p.id === ps.playerId);
      if (!player) return null;
      return { player, stats: { ...ps.stats, played: true }, confidence: 1.0, method: "manual", nameUsed: player.name };
    }).filter(Boolean);

    const match = await commitMatch({
      label: label || `${iplTeam1} vs ${iplTeam2}`,
      iplTeam1, iplTeam2, matchDate, source: "manual",
      matched, warnings: [],
    });

    broadcast("match_scored", { matchId: match.id, label: match.label, playersScored: matched.length });
    res.json({ success: true, matchId: match.id, playersScored: matched.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/score/:matchId/rollback ────────────────────────────────────────
router.post("/:matchId/rollback", async (req, res) => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.matchId },
      include: { playerScores: true },
    });
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.status === "rolled_back") return res.status(409).json({ error: "Already rolled back" });

    await prisma.$transaction([
      prisma.playerMatchScore.deleteMany({ where: { matchId: match.id } }),
      prisma.match.update({ where: { id: match.id }, data: { status: "rolled_back" } }),
      prisma.auditLog.create({
        data: { matchId: match.id, action: "match_rolled_back", details: { by: "admin", at: new Date().toISOString() } },
      }),
    ]);

    res.json({ success: true, message: `Match "${match.label}" rolled back. ${match.playerScores.length} player scores removed.` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/score/audit ─────────────────────────────────────────────────────
router.get("/audit", async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { match: { select: { label: true } } },
    });
    res.json({ logs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/score/crex ─────────────────────────────────────────────────────
// CREX direct points entry with C/VC multipliers and trade equalization
// Body: { label, iplTeam1, iplTeam2, matchDate, matchNumber,
//         playerPoints: [{ playerId, points, matchesPlayed }] }
//   matchNumber: sequential match number this season (for equalization)
router.post("/crex", async (req, res) => {
  try {
    const { label, iplTeam1, iplTeam2, matchDate, matchNumber, playerPoints } = req.body;
    if (!playerPoints?.length) return res.status(400).json({ error: "No player points provided" });

    const playerIds = playerPoints.map(pp => pp.playerId);
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      include: { fantasyTeam: true },
    });

    // Load all rosters to get C/VC info
    const rosters = await prisma.teamRoster.findMany();
    const rosterMap = {};
    rosters.forEach(r => { rosterMap[r.fantasyTeamId] = r; });

    // Load trade logs to check equalization
    const tradeLogs = await prisma.tradeLog.findMany({ where: { tradeType: "swap" } });

    const scoreResults = [];

    return await prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: {
          label: label || `${iplTeam1 || "?"} vs ${iplTeam2 || "?"}${matchDate ? " · " + matchDate : ""}`,
          iplTeam1: iplTeam1 || "",
          iplTeam2: iplTeam2 || "",
          matchDate: matchDate || null,
          source: "crex_manual",
          status: "scored",
          auditLogs: {
            create: {
              action: "match_scored",
              details: { source: "crex_manual", playerCount: playerPoints.length, timestamp: new Date().toISOString() },
            },
          },
        },
      });

      for (const { playerId, points: rawPoints, matchesPlayed = 0 } of playerPoints) {
        const player = players.find(p => p.id === playerId);
        if (!player) continue;
        if (!player.fantasyTeamId) continue;

        const roster = rosterMap[player.fantasyTeamId];
        const isCaptain = roster?.captainId === playerId;
        const isViceCaptain = roster?.viceCaptainId === playerId;

        // Check equalization: was this player recently traded in?
        // Check equalization: was this player recently traded in?
        const tradeIn = tradeLogs.find(t => t.playerInId === playerId && t.fantasyTeamId === player.fantasyTeamId);
        let isEligible = true;
        if (tradeIn && tradeIn.matchesPlayedByOut > 0) {
          // Count how many matches this player has actually scored in so far
          const actualMatchesPlayed = await tx.playerMatchScore.count({
            where: { playerId, played: true },
          });
          isEligible = actualMatchesPlayed >= tradeIn.matchesPlayedByOut;
        }

        // Apply multipliers
        let finalPoints = parseFloat(rawPoints) || 0;
        if (isEligible) {
          if (isCaptain) finalPoints = finalPoints * 2;
          else if (isViceCaptain) finalPoints = finalPoints * 1.5;
        } else {
          finalPoints = 0; // blocked by equalization — points don't count yet
        }

        await tx.playerMatchScore.create({
          data: {
            matchId: match.id,
            playerId: player.id,
            fantasyTeamId: player.fantasyTeamId,
            points: Math.round(finalPoints * 10) / 10, // keep 1 decimal
            played: true,
            isCaptain,
            isViceCaptain,
            isEligible,
            nameMatchConfidence: 1.0,
            nameUsed: player.name,
          },
        });

        scoreResults.push({ playerName: player.name, rawPoints: parseFloat(rawPoints), finalPoints, isCaptain, isViceCaptain, isEligible });
      }

      broadcast("match_scored", { matchId: match.id, label: match.label, playersScored: playerPoints.length });
      return res.json({ success: true, matchId: match.id, playersScored: playerPoints.length, scoreResults });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/score/match/:matchId/player/:playerId
// Admin corrects a single player's points for a match
router.patch("/match/:matchId/player/:playerId", async (req, res) => {
  try {
    const { matchId, playerId } = req.params;
    const { points } = req.body;
    if (points === undefined) return res.status(400).json({ error: "points required" });

    const existing = await prisma.playerMatchScore.findUnique({
      where: { matchId_playerId: { matchId, playerId } },
      include: { player: { select: { name: true } }, match: { select: { label: true } } },
    });
    if (!existing) return res.status(404).json({ error: "Score not found" });

    const updated = await prisma.playerMatchScore.update({
      where: { matchId_playerId: { matchId, playerId } },
      data: { points: parseFloat(points) },
    });

    await prisma.auditLog.create({
      data: {
        matchId,
        action: "score_corrected",
        details: {
          player: existing.player.name,
          match: existing.match.label,
          oldPoints: existing.points,
          newPoints: parseFloat(points),
          by: "admin",
          at: new Date().toISOString(),
        },
      },
    });

    broadcast("match_scored", { matchId, label: existing.match.label });
    res.json({ success: true, oldPoints: existing.points, newPoints: parseFloat(points) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;