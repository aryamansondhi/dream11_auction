const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireAdmin } = require("../middleware/auth");
const { broadcast } = require("./events");
const router = express.Router();
const prisma = new PrismaClient();

// ── GET /api/rosters ─────────────────────────────────────────────────────────
// Returns all rosters with C/VC resolved and trade counts
router.get("/", async (req, res) => {
  try {
    const rosters = await prisma.teamRoster.findMany({
      include: {
        fantasyTeam: {
          include: {
            players: true,
          },
        },
      },
    });

    const tradeLogs = await prisma.tradeLog.findMany({
      orderBy: { createdAt: "desc" },
    });

    const result = rosters.map(r => ({
      teamId: r.fantasyTeamId,
      teamName: r.fantasyTeam.name,
      manager: r.fantasyTeam.manager,
      accent: r.fantasyTeam.accent,
      captainId: r.captainId,
      viceCaptainId: r.viceCaptainId,
      tradesUsed: r.tradesUsed,
      maxTrades: r.maxTrades,
      tradesRemaining: r.maxTrades - r.tradesUsed,
      players: r.fantasyTeam.players.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        iplTeam: p.iplTeam,
        isCaptain: p.id === r.captainId,
        isViceCaptain: p.id === r.viceCaptainId,
      })),
      recentTrades: tradeLogs
        .filter(t => t.fantasyTeamId === r.fantasyTeamId)
        .slice(0, 5),
    }));

    res.json({ rosters: result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/rosters/:teamId/captain ────────────────────────────────────────
// Change captain or vice-captain. Costs 1 trade.
router.post("/:teamId/captain", requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { captainId, viceCaptainId, countAsTrade = true } = req.body;

    const roster = await prisma.teamRoster.findUnique({ where: { fantasyTeamId: teamId } });
    if (!roster) return res.status(404).json({ error: "Roster not found" });
    if (countAsTrade && roster.tradesUsed >= roster.maxTrades) {
      return res.status(400).json({ error: `Trade limit reached (${roster.maxTrades}/${roster.maxTrades} used)` });
    }

    // Verify players belong to this team
    if (captainId) {
      const p = await prisma.player.findFirst({ where: { id: captainId, fantasyTeamId: teamId } });
      if (!p) return res.status(400).json({ error: "Captain must be on this team" });
    }
    if (viceCaptainId) {
      const p = await prisma.player.findFirst({ where: { id: viceCaptainId, fantasyTeamId: teamId } });
      if (!p) return res.status(400).json({ error: "Vice-captain must be on this team" });
    }
    if (captainId && viceCaptainId && captainId === viceCaptainId) {
      return res.status(400).json({ error: "Captain and vice-captain must be different players" });
    }

    const isCapChange = captainId && captainId !== roster.captainId;
    const isVCChange = viceCaptainId && viceCaptainId !== roster.viceCaptainId;
    const tradeCount = (isCapChange ? 1 : 0) + (isVCChange ? 1 : 0);

    if (tradeCount === 0) return res.status(400).json({ error: "No change detected" });
    if (countAsTrade && roster.tradesUsed + tradeCount > roster.maxTrades) {
      return res.status(400).json({ error: `Not enough trades remaining (need ${tradeCount}, have ${roster.maxTrades - roster.tradesUsed})` });
    }

    await prisma.$transaction([
      prisma.teamRoster.update({
        where: { fantasyTeamId: teamId },
        data: {
          ...(captainId ? { captainId } : {}),
          ...(viceCaptainId ? { viceCaptainId } : {}),
          tradesUsed: countAsTrade ? roster.tradesUsed + tradeCount : roster.tradesUsed,
        },
      }),
      prisma.tradeLog.create({
        data: {
          fantasyTeamId: teamId,
          tradeType: isCapChange && isVCChange ? "captain+vc" : isCapChange ? "captain" : "vc",
          oldCaptainId: isCapChange ? roster.captainId : null,
          newCaptainId: isCapChange ? captainId : null,
          oldVCId: isVCChange ? roster.viceCaptainId : null,
          newVCId: isVCChange ? viceCaptainId : null,
        },
      }),
    ]);

    broadcast("roster_updated", { teamId, type: "captain" });
    res.json({ success: true, tradesUsed: roster.tradesUsed + tradeCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/rosters/:teamId/swap ───────────────────────────────────────────
// Swap a player out. Costs 1 trade.
// matchesPlayedByOut = number of matches old player has played (for equalization)
router.post("/:teamId/swap", requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { playerOutId, playerInId, matchesPlayedByOut = 0, notes, countAsTrade = true } = req.body;

    if (!playerOutId || !playerInId) return res.status(400).json({ error: "playerOutId and playerInId required" });
    if (playerOutId === playerInId) return res.status(400).json({ error: "Same player" });

    const roster = await prisma.teamRoster.findUnique({ where: { fantasyTeamId: teamId } });
    if (!roster) return res.status(404).json({ error: "Roster not found" });
    if (countAsTrade && roster.tradesUsed >= roster.maxTrades) {
      return res.status(400).json({ error: `Trade limit reached (${roster.maxTrades}/${roster.maxTrades} used)` });
    }

    // playerOut must be on this team
    const outPlayer = await prisma.player.findFirst({ where: { id: playerOutId, fantasyTeamId: teamId } });
    if (!outPlayer) return res.status(400).json({ error: "Player being swapped out is not on this team" });

    // playerIn must exist (but can be from any team in the DB — just needs to be registered)
    const inPlayer = await prisma.player.findUnique({ where: { id: playerInId } });
    if (!inPlayer) return res.status(404).json({ error: "Incoming player not found" });

    // Move the incoming player to this team
    const wasCapOrVC = outPlayer.id === roster.captainId || outPlayer.id === roster.viceCaptainId;

    await prisma.$transaction([
      // Move incoming player to this team
      prisma.player.update({
        where: { id: playerInId },
        data: { fantasyTeamId: teamId },
      }),
      // Move outgoing player to a "free agent" state — null fantasyTeamId
      // Actually, keep them — just they're no longer on this team's active roster
      // We track this via TradeLog
      prisma.teamRoster.update({
        where: { fantasyTeamId: teamId },
        data: {
          tradesUsed: countAsTrade ? roster.tradesUsed + 1 : roster.tradesUsed,
          // If C/VC was swapped out, clear them
          ...(outPlayer.id === roster.captainId ? { captainId: null } : {}),
          ...(outPlayer.id === roster.viceCaptainId ? { viceCaptainId: null } : {}),
        },
      }),
      prisma.tradeLog.create({
        data: {
          fantasyTeamId: teamId,
          tradeType: "swap",
          playerOutId,
          playerInId,
          matchesPlayedByOut: Number(matchesPlayedByOut),
          notes: notes || null,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: "player_swap",
          details: {
            teamId,
            out: outPlayer.name,
            in: inPlayer.name,
            matchesPlayedByOut,
            tradesUsedAfter: roster.tradesUsed + 1,
          },
        },
      }),
    ]);

    broadcast("roster_updated", { teamId, type: "swap" });
    res.json({
      success: true,
      tradesUsed: roster.tradesUsed + 1,
      tradesRemaining: roster.maxTrades - roster.tradesUsed - 1,
      message: `${outPlayer.name} → ${inPlayer.name}. ${roster.maxTrades - roster.tradesUsed - 1} trades remaining.`,
      equalizationNote: matchesPlayedByOut > 0
        ? `${inPlayer.name}'s points will count from match ${matchesPlayedByOut + 1} onwards.`
        : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/rosters/trades ───────────────────────────────────────────────────
router.get("/trades", async (req, res) => {
  try {
    const trades = await prisma.tradeLog.findMany({
      orderBy: { createdAt: "desc" },
      include: { fantasyTeam: { select: { name: true, manager: true, accent: true } } },
    });
    res.json({ trades });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/rosters/:teamId/trades — manually set tradesUsed (admin correction)
router.patch("/:teamId/trades", requireAdmin, async (req, res) => {
  try {
    const { tradesUsed } = req.body;
    const roster = await prisma.teamRoster.update({
      where: { fantasyTeamId: req.params.teamId },
      data: { tradesUsed: Math.max(0, parseInt(tradesUsed)) },
    });
    res.json({ success: true, tradesUsed: roster.tradesUsed });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
