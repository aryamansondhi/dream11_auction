const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/league — full leaderboard with player stats
router.get("/", async (req, res) => {
  try {
    const teams = await prisma.fantasyTeam.findMany({
      include: {
        players: {
          include: {
            matchScores: {
              where: { match: { status: "scored" } },
              include: { match: { select: { label: true, matchDate: true, createdAt: true } } },
              orderBy: { match: { createdAt: "desc" } },
            },
          },
        },
      },
    });

    const leaderboard = teams.map(team => {
      const players = team.players.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        iplTeam: p.iplTeam,
        totalPoints: p.matchScores.reduce((s, ms) => s + ms.points, 0),
        matchHistory: p.matchScores.map(ms => ({
          matchLabel: ms.match.label,
          pts: ms.points,
          played: ms.played,
        })),
      }));

      const totalPoints = players.reduce((s, p) => s + p.totalPoints, 0);

      return {
        id: team.id,
        name: team.name,
        manager: team.manager,
        accent: team.accent,
        totalPoints,
        players: players.sort((a, b) => b.totalPoints - a.totalPoints),
      };
    });

    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    const matches = await prisma.match.findMany({
      where: { status: "scored" },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, iplTeam1: true, iplTeam2: true, matchDate: true, source: true, createdAt: true },
    });

    res.json({ leaderboard, matches });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
