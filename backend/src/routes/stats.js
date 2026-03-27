const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/stats/trends
// Returns per-match point history for every fantasy team — powers the trend chart
router.get("/trends", async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      where: { status: "scored" },
      orderBy: { createdAt: "asc" },
      include: {
        playerScores: {
          include: { fantasyTeam: true },
        },
      },
    });

    const teams = await prisma.fantasyTeam.findMany();

    // Build cumulative series: [{ matchLabel, teamId: pts, ... }]
    const cumulative = {};
    teams.forEach(t => { cumulative[t.id] = 0; });

    const series = matches.map(m => {
      const entry = { matchLabel: m.label.split(",")[0].trim() };
      // Sum points per team for this match
      const matchPts = {};
      m.playerScores.forEach(ps => {
        matchPts[ps.fantasyTeamId] = (matchPts[ps.fantasyTeamId] || 0) + ps.points;
      });
      teams.forEach(t => {
        cumulative[t.id] += matchPts[t.id] || 0;
        entry[t.id] = cumulative[t.id];
      });
      return entry;
    });

    // Also return best single-match performances per team
    const matchBests = teams.map(team => {
      let bestMatch = null, bestPts = 0;
      matches.forEach(m => {
        const pts = m.playerScores.filter(ps => ps.fantasyTeamId === team.id).reduce((s, ps) => s + ps.points, 0);
        if (pts > bestPts) { bestPts = pts; bestMatch = m.label; }
      });
      return { teamId: team.id, bestMatch, bestPts };
    });

    // Top scorer per match
    const matchRecaps = matches.map(m => {
      const byPlayer = {};
      m.playerScores.forEach(ps => {
        byPlayer[ps.playerId] = (byPlayer[ps.playerId] || 0) + ps.points;
      });
      return {
        matchId: m.id,
        label: m.label,
        source: m.source,
        date: m.createdAt,
      };
    });

    res.json({ series, teams: teams.map(t => ({ id: t.id, name: t.name, manager: t.manager, accent: t.accent })), matchBests, matchRecaps });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/stats/player/:playerId
router.get("/player/:playerId", async (req, res) => {
  try {
    const scores = await prisma.playerMatchScore.findMany({
      where: { playerId: req.params.playerId },
      include: { match: true },
      orderBy: { match: { createdAt: "asc" } },
    });
    const player = await prisma.player.findUnique({
      where: { id: req.params.playerId },
      include: { fantasyTeam: true },
    });
    res.json({ player, scores });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

// GET /api/stats/match-players?t1=DC&t2=RCB
// Returns all auctioned players from both IPL teams with owner + points info
router.get("/match-players", async (req, res) => {
  try {
    const { t1, t2 } = req.query;
    if (!t1 || !t2) return res.status(400).json({ error: "t1 and t2 required" });

    const players = await prisma.player.findMany({
      where: { iplTeam: { in: [t1, t2] } },
      include: {
        fantasyTeam: { select: { id: true, name: true, manager: true, accent: true } },
        matchScores: {
          where: { match: { status: "scored" } },
          select: { points: true, isCaptain: true, isViceCaptain: true, isEligible: true, match: { select: { label: true, createdAt: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    // Group by IPL team
    const grouped = { [t1]: [], [t2]: [] };
    players.forEach(p => {
      const totalPoints = p.matchScores.reduce((s, ms) => s + ms.points, 0);
      const isCaptain = p.matchScores.some(ms => ms.isCaptain);
      const isViceCaptain = p.matchScores.some(ms => ms.isViceCaptain);
      const entry = {
        id: p.id,
        name: p.name,
        role: p.role,
        iplTeam: p.iplTeam,
        fantasyTeam: p.fantasyTeam,
        totalPoints,
        matchCount: p.matchScores.length,
        isCaptain,
        isViceCaptain,
      };
      if (grouped[p.iplTeam] !== undefined) grouped[p.iplTeam].push(entry);
    });

    // Sort each group by role order then points
    const roleOrder = ["Batsman", "All-Rounder", "Wicket-Keeper", "Bowler"];
    Object.keys(grouped).forEach(team => {
      grouped[team].sort((a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role) || b.totalPoints - a.totalPoints);
    });

    res.json({ t1, t2, players: grouped, total: players.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});
