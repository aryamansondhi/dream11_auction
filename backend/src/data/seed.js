require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { SQUADS } = require("./squads");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Wipe all existing data cleanly in the right order
  console.log("  🗑  Wiping old data…");
  await prisma.auditLog.deleteMany();
  await prisma.playerMatchScore.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.fantasyTeam.deleteMany();

  for (const squad of SQUADS) {
    const team = await prisma.fantasyTeam.create({
      data: {
        id: squad.id,
        name: squad.name,
        manager: squad.manager,
        accent: squad.accent,
      },
    });

    for (const player of squad.players) {
      await prisma.player.create({
        data: {
          name: player.name,
          role: player.role,
          iplTeam: player.iplTeam,
          fantasyTeamId: team.id,
        },
      });
    }

    // Create initial roster (no C/VC set yet)
    await prisma.teamRoster.upsert({
      where: { fantasyTeamId: team.id },
      update: {},
      create: { fantasyTeamId: team.id },
    });

    console.log(`  ✓ ${squad.name} (${squad.players.length} players)`);
  }

  await prisma.leagueSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Fantasy IPL 2026" },
  });

  console.log(`\n✅ Seed complete — ${SQUADS.length} teams, ${SQUADS.reduce((s, t) => s + t.players.length, 0)} players.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
