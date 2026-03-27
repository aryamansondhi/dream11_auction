const Anthropic = require("@anthropic-ai/sdk");
const { matchBatch } = require("./player-matcher");
const { validateStats } = require("./scoring-engine");

const client = new Anthropic(); // uses ANTHROPIC_API_KEY from env

const ALL_PLAYER_NAMES_PROMPT = (names) =>
`You are a cricket stats extraction assistant for a private fantasy IPL league.

REGISTERED FANTASY PLAYERS (match these exactly):
${names.join(", ")}

INSTRUCTIONS:
- Only include players from the registered list above who actually played
- Map player names accurately even if the scorecard uses abbreviations (e.g. "V Kohli" → "Virat Kohli")
- For each player extract ALL available stats. Use 0 for missing fields
- lbwBowled = count of wickets taken by LBW or Bowled dismissal specifically
- directRO = run outs where the fielder directly hit the stumps without throwing to another fielder
- indirectRO = run outs where the ball was relayed
- Return ONLY valid JSON, no markdown, no explanation, no preamble

FORMAT:
{
  "Exact Player Name": {
    "played": true,
    "runs": 0, "balls": 0, "fours": 0, "sixes": 0,
    "wickets": 0, "overs": 0, "runsConceded": 0, "dotBalls": 0, "maidens": 0, "lbwBowled": 0,
    "catches": 0, "stumpings": 0, "directRO": 0, "indirectRO": 0
  }
}`;

/**
 * Extract stats from a raw scorecard JSON string using Claude
 */
async function extractFromScorecard(scorecardJson, registeredNames) {
  const prompt = ALL_PLAYER_NAMES_PROMPT(registeredNames);
  const content = `${prompt}\n\nSCORECARD JSON:\n${scorecardJson.slice(0, 10000)}`;

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    messages: [{ role: "user", content }],
  });

  const raw = response.content.find(c => c.type === "text")?.text || "";
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Claude returned invalid JSON: ${cleaned.slice(0, 200)}`);
  }

  return parsed;
}

/**
 * Extract stats from a base64 image using Claude Vision
 */
async function extractFromImage(base64Image, mediaType, registeredNames) {
  const prompt = ALL_PLAYER_NAMES_PROMPT(registeredNames);

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
        { type: "text", text: prompt },
      ],
    }],
  });

  const raw = response.content.find(c => c.type === "text")?.text || "";
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Claude returned invalid JSON from image: ${cleaned.slice(0, 200)}`);
  }

  return parsed;
}

/**
 * Full pipeline: raw Claude output → matched + validated stats
 * Returns { matched, skipped, warnings }
 */
async function processParsedStats(claudeOutput) {
  const matchResults = await matchBatch(claudeOutput);

  const matched = [];
  const skipped = [];
  const warnings = [];

  for (const result of matchResults) {
    if (!result.player) {
      skipped.push({
        incomingName: result.incomingName,
        reason: "No player match found in any squad",
      });
      continue;
    }

    if (result.confidence < 0.6) {
      skipped.push({
        incomingName: result.incomingName,
        reason: `Low confidence match (${(result.confidence * 100).toFixed(0)}%) to ${result.player.name}`,
      });
      continue;
    }

    const { valid, warnings: statWarnings, sanitised } = validateStats(result.stats, result.player.role);
    if (!valid || statWarnings.length > 0) {
      warnings.push({ player: result.player.name, issues: statWarnings });
    }

    if (result.confidence < 0.85) {
      warnings.push({
        player: result.player.name,
        issues: [`Name fuzzy-matched: "${result.incomingName}" → "${result.player.name}" (${(result.confidence * 100).toFixed(0)}% confidence). Verify this is correct.`],
      });
    }

    matched.push({
      player: result.player,
      stats: sanitised,
      confidence: result.confidence,
      method: result.method,
      nameUsed: result.incomingName,
    });
  }

  return { matched, skipped, warnings };
}

module.exports = { extractFromScorecard, extractFromImage, processParsedStats };
