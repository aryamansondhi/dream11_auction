const Fuse = require("fuse.js");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Known name aliases that APIs use
const ALIASES = {
  "virat kohli": "Virat Kohli",
  "v kohli": "Virat Kohli",
  "rohit sharma": "Rohit Sharma",
  "ro sharma": "Rohit Sharma",
  "r sharma": "Rohit Sharma",
  "ms dhoni": "MS Dhoni",
  "kl rahul": "KL Rahul",
  "k rahul": "KL Rahul",
  "jasprit bumrah": "Jasprit Bumrah",
  "j bumrah": "Jasprit Bumrah",
  "hardik pandya": "Hardik Pandya",
  "h pandya": "Hardik Pandya",
  "ravindra jadeja": "Ravindra Jadeja",
  "r jadeja": "Ravindra Jadeja",
  "jadeja": "Ravindra Jadeja",
  "suryakumar yadav": "Suryakumar Yadav",
  "surya": "Suryakumar Yadav",
  "sk yadav": "Suryakumar Yadav",
  "yashasvi jaiswal": "Yashasvi Jaiswal",
  "y jaiswal": "Yashasvi Jaiswal",
  "shubman gill": "Shubman Gill",
  "s gill": "Shubman Gill",
  "varun chakravarthy": "Varun Chakaravarthy",
  "varun chakaravarthy": "Varun Chakaravarthy",
  "v chakravarthy": "Varun Chakaravarthy",
  "kuldeep yadav": "Kuldeep Yadav",
  "k yadav": "Kuldeep Yadav",
  "axar patel": "Axar Patel",
  "a patel": "Axar Patel",
  "ravi bishnoi": "Ravi Bishnoi",
  "r bishnoi": "Ravi Bishnoi",
  "arshdeep singh": "Arshdeep Singh",
  "a singh": "Arshdeep Singh",
  "yuzvendra chahal": "Yuzvendra Chahal",
  "y chahal": "Yuzvendra Chahal",
  "chahal": "Yuzvendra Chahal",
  "tilak varma": "Tilak Varma",
  "t varma": "Tilak Varma",
  "sunil narine": "Sunil Narine",
  "s narine": "Sunil Narine",
  "narine": "Sunil Narine",
  "travis head": "Travis Head",
  "t head": "Travis Head",
  "abhishek sharma": "Abhishek Sharma",
  "a sharma": "Abhishek Sharma",
  "nitish kumar reddy": "Nitish Kumar Reddy",
  "n kumar reddy": "Nitish Kumar Reddy",
  "nitish reddy": "Nitish Kumar Reddy",
  "rishabh pant": "Rishabh Pant",
  "r pant": "Rishabh Pant",
  "vaibhav suryavanshi": "Vaibhav Suryavanshi",
  "vaibhav sooryavanshi": "Vaibhav Suryavanshi",
  "mohammed siraj": "Mohammed Siraj",
  "m siraj": "Mohammed Siraj",
  "mohammed shami": "Mohammed Shami",
  "m shami": "Mohammed Shami",
  "sanju samson": "Sanju Samson",
  "s samson": "Sanju Samson",
  "quinton de kock": "Quinton de Kock",
  "q de kock": "Quinton de Kock",
  "de kock": "Quinton de Kock",
  "kagiso rabada": "Kagiso Rabada",
  "k rabada": "Kagiso Rabada",
  "rabada": "Kagiso Rabada",
  "jofra archer": "Jofra Archer",
  "j archer": "Jofra Archer",
  "hardik": "Hardik Pandya",
  "bumrah": "Jasprit Bumrah",
  "kohli": "Virat Kohli",
  "rohit": "Rohit Sharma",
  "washington sundar": "Washington Sundar",
  "w sundar": "Washington Sundar",
  "sundar": "Washington Sundar",
  "jos buttler": "Jos Buttler",
  "j buttler": "Jos Buttler",
  "buttler": "Jos Buttler",
  "sai sudharsan": "Sai Sudharsan",
  "rashid khan": "Rashid Khan",
  "r khan": "Rashid Khan",
  "rashid": "Rashid Khan",
};

let _fuse = null;
let _allPlayers = null;

async function getAllPlayers() {
  if (_allPlayers) return _allPlayers;
  const players = await prisma.player.findMany({ include: { fantasyTeam: true } });
  _allPlayers = players;
  return players;
}

async function getFuse() {
  if (_fuse) return _fuse;
  const players = await getAllPlayers();
  _fuse = new Fuse(players, {
    keys: ["name"],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 3,
  });
  return _fuse;
}

// Invalidate cache when squads change
function invalidateCache() {
  _fuse = null;
  _allPlayers = null;
}

/**
 * Match an incoming name (from API or AI) to a registered player
 * Returns { player, confidence, method }
 */
async function matchPlayer(incomingName) {
  const cleaned = incomingName.trim().toLowerCase();

  // 1. Exact match first
  const allPlayers = await getAllPlayers();
  const exact = allPlayers.find(p => p.name.toLowerCase() === cleaned);
  if (exact) return { player: exact, confidence: 1.0, method: "exact" };

  // 2. Alias lookup
  const aliased = ALIASES[cleaned];
  if (aliased) {
    const p = allPlayers.find(p => p.name === aliased);
    if (p) return { player: p, confidence: 0.95, method: "alias" };
  }

  // 3. Fuzzy search
  const fuse = await getFuse();
  const results = fuse.search(incomingName);
  if (results.length > 0) {
    const best = results[0];
    const confidence = 1 - (best.score || 0);
    if (confidence >= 0.6) {
      return { player: best.item, confidence, method: "fuzzy" };
    }
  }

  return { player: null, confidence: 0, method: "none" };
}

/**
 * Match a whole batch of player names
 * Returns array of { incomingName, player, confidence, method, stats }
 */
async function matchBatch(playerStatMap) {
  const results = [];
  for (const [name, stats] of Object.entries(playerStatMap)) {
    const match = await matchPlayer(name);
    results.push({ incomingName: name, ...match, stats });
  }
  return results;
}

module.exports = { matchPlayer, matchBatch, invalidateCache };
