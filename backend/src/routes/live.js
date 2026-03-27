const express = require("express");
const { getCurrentMatches, getScorecard } = require("../services/cricket-api");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/live — current IPL matches with fantasy player counts
router.get("/", async (req, res) => {
  try {
    const matches = await getCurrentMatches();

    // For each match, count how many fantasy players are involved
    const allPlayers = await prisma.player.findMany({ include: { fantasyTeam: true } });

    const enriched = matches.map(m => {
      const name = m.name || "";
      const parts = name.split(" vs ");
      const t1 = parts[0]?.split(",")[0]?.trim().split(" ").pop() || "";
      const t2 = parts[1]?.split(",")[0]?.trim().split(" ").pop() || "";

      const involved = allPlayers
        .filter(p => p.iplTeam === t1 || p.iplTeam === t2)
        .reduce((acc, p) => {
          const tid = p.fantasyTeamId;
          if (!acc[tid]) acc[tid] = { teamId: tid, teamName: p.fantasyTeam.name, manager: p.fantasyTeam.manager, accent: p.fantasyTeam.accent, count: 0 };
          acc[tid].count++;
          return acc;
        }, {});

      return {
        ...m,
        iplTeam1: t1,
        iplTeam2: t2,
        fantasyStake: Object.values(involved).sort((a, b) => b.count - a.count),
      };
    });

    // Check which matches are already scored
    const scoredIds = await prisma.match.findMany({
      where: { status: "scored", cricketApiId: { not: null } },
      select: { cricketApiId: true },
    });
    const scoredSet = new Set(scoredIds.map(m => m.cricketApiId));

    const withStatus = enriched.map(m => ({
      ...m,
      alreadyScored: scoredSet.has(m.id),
    }));

    res.json({ matches: withStatus });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/live/:matchId/scorecard — fetch raw scorecard
router.get("/:matchId/scorecard", async (req, res) => {
  try {
    const sc = await getScorecard(req.params.matchId);
    res.json({ scorecard: sc });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
