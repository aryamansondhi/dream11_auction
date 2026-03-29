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
    const {
      playerOutId,
      playerInId,
      incomingName,
      incomingRole,
      incomingIplTeam,
      matchesPlayedByOut = 0,
      notes,
      countAsTrade = true,
    } = req.body;

    if (!playerOutId) {
      return res.status(400).json({ error: "playerOutId required" });
    }

    const roster = await prisma.teamRoster.findUnique({
      where: { fantasyTeamId: teamId },
    });

    if (!roster) {
      return res.status(404).json({ error: "Roster not found" });
    }

    if (countAsTrade && roster.tradesUsed >= roster.maxTrades) {
      return res.status(400).json({
        error: `Trade limit reached (${roster.maxTrades}/${roster.maxTrades} used)`,
      });
    }

    const outPlayer = await prisma.player.findFirst({
      where: { id: playerOutId, fantasyTeamId: teamId },
    });

    if (!outPlayer) {
      return res.status(400).json({
        error: "Player being swapped out is not on this team",
      });
    }

    let finalIncomingPlayerId = null;
    let finalIncomingPlayerName = null;

    if (playerInId) {
      if (playerInId === playerOutId) {
        return res.status(400).json({ error: "Same player" });
      }

      const inPlayer = await prisma.player.findUnique({
        where: { id: playerInId },
      });

      if (!inPlayer) {
        return res.status(404).json({ error: "Incoming player not found" });
      }

      if (inPlayer.fantasyTeamId && inPlayer.fantasyTeamId !== teamId) {
        return res.status(400).json({
          error: "Incoming player already belongs to another fantasy squad",
        });
      }

      finalIncomingPlayerId = inPlayer.id;
      finalIncomingPlayerName = inPlayer.name;
    } else {
      if (!incomingName || !incomingRole || !incomingIplTeam) {
        return res.status(400).json({
          error: "Manual incoming player details are required",
        });
      }
    }

    let createdManualPlayer = null;

    await prisma.$transaction(async (tx) => {
      if (playerInId) {
        await tx.player.update({
          where: { id: playerInId },
          data: { fantasyTeamId: teamId },
        });
      } else {
        createdManualPlayer = await tx.player.create({
          data: {
            name: incomingName.trim(),
            role: incomingRole,
            iplTeam: incomingIplTeam,
            fantasyTeamId: teamId,
          },
        });

        finalIncomingPlayerId = createdManualPlayer.id;
        finalIncomingPlayerName = createdManualPlayer.name;
      }

      await tx.player.update({
        where: { id: playerOutId },
        data: { fantasyTeamId: null },
      });

      await tx.teamRoster.update({
        where: { fantasyTeamId: teamId },
        data: {
          tradesUsed: countAsTrade ? roster.tradesUsed + 1 : roster.tradesUsed,
          ...(outPlayer.id === roster.captainId ? { captainId: null } : {}),
          ...(outPlayer.id === roster.viceCaptainId ? { viceCaptainId: null } : {}),
        },
      });

      await tx.tradeLog.create({
        data: {
          fantasyTeamId: teamId,
          tradeType: "swap",
          playerOutId,
          playerInId: finalIncomingPlayerId,
          matchesPlayedByOut: Number(matchesPlayedByOut),
          notes: notes || null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "player_swap",
          details: {
            teamId,
            out: outPlayer.name,
            in: finalIncomingPlayerName,
            matchesPlayedByOut,
            tradesUsedAfter: countAsTrade ? roster.tradesUsed + 1 : roster.tradesUsed,
          },
        },
      });
    });

    const newTradesUsed = countAsTrade ? roster.tradesUsed + 1 : roster.tradesUsed;
    const newTradesRemaining = roster.maxTrades - newTradesUsed;

    broadcast("roster_updated", { teamId, type: "swap" });

    res.json({
      success: true,
      tradesUsed: newTradesUsed,
      tradesRemaining: newTradesRemaining,
      message: `${outPlayer.name} → ${finalIncomingPlayerName}. ${newTradesRemaining} trades remaining.`,
      equalizationNote:
        matchesPlayedByOut > 0
          ? `${finalIncomingPlayerName}'s points will count from match ${Number(matchesPlayedByOut) + 1} onwards.`
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

// POST /api/rosters/:teamId/retain
router.post("/:teamId/retain", requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { playerName, iplTeam, role, points } = req.body;
    if (!playerName || points === undefined) return res.status(400).json({ error: "playerName and points required" });

    const label = `RETAINED: ${playerName}`;
    let match = await prisma.match.findFirst({ where: { label, iplTeam1: teamId } });
    if (!match) {
      match = await prisma.match.create({
        data: { label, iplTeam1: teamId, iplTeam2: "", source: "retained", status: "scored" },
      });
    }

    let player = await prisma.player.findFirst({
      where: { name: { contains: playerName, mode: "insensitive" } },
    });
    if (!player) {
      player = await prisma.player.create({
        data: { name: playerName, role: role || "Batsman", iplTeam: iplTeam || "??", fantasyTeamId: null },
      });
    }

    await prisma.playerMatchScore.upsert({
      where: { matchId_playerId: { matchId: match.id, playerId: player.id } },
      update: { points: parseFloat(points), fantasyTeamId: teamId },
      create: {
        matchId: match.id, playerId: player.id, fantasyTeamId: teamId,
        points: parseFloat(points), played: true, nameMatchConfidence: 1.0, nameUsed: playerName,
      },
    });

    broadcast("match_scored", { matchId: match.id, label: match.label });
    res.json({ success: true, message: `${playerName}: ${points} pts retained for ${teamId}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
