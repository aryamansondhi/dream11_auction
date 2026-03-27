const express = require("express");
const { FIXTURES } = require("../data/fixtures");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/fixtures
// Returns all 69 fixtures enriched with:
//  - alreadyScored flag
//  - fantasyStake (which managers have players in each match)
router.get("/", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Get already-scored match labels to mark fixtures
    const scoredMatches = await prisma.match.findMany({
      where: { status: "scored" },
      select: { iplTeam1: true, iplTeam2: true, matchDate: true, label: true },
    });

    // Build a Set of scored team-pair keys
    const scoredSet = new Set(
      scoredMatches.map(m => [m.iplTeam1, m.iplTeam2].sort().join("|") + "|" + (m.matchDate || ""))
    );

    // Load all players for fantasy stake calculation
    const players = await prisma.player.findMany({
      include: { fantasyTeam: { select: { id: true, name: true, manager: true, accent: true } } },
    });

    const enriched = FIXTURES.map(f => {
      const key = [f.home, f.away].sort().join("|") + "|" + f.date;
      const alreadyScored = scoredSet.has(key);

      const involved = players
        .filter(p => p.iplTeam === f.home || p.iplTeam === f.away)
        .reduce((acc, p) => {
          const tid = p.fantasyTeamId;
          if (!acc[tid]) acc[tid] = { teamId: tid, teamName: p.fantasyTeam.name, manager: p.fantasyTeam.manager, accent: p.fantasyTeam.accent, count: 0 };
          acc[tid].count++;
          return acc;
        }, {});

      const isPast = f.date < today;
      const isToday = f.date === today;

      return {
        ...f,
        alreadyScored,
        isPast,
        isToday,
        isUpcoming: !isPast && !isToday,
        fantasyStake: Object.values(involved).sort((a, b) => b.count - a.count),
      };
    });

    res.json({ fixtures: enriched, total: enriched.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
