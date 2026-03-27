const axios = require("axios");
const NodeCache = require("node-cache");

const liveCache = new NodeCache({ stdTTL: 30 });     // 30s for live
const scorecardCache = new NodeCache({ stdTTL: 300 }); // 5m for scorecards

const BASE = "https://api.cricapi.com/v1";
const key = () => process.env.CRICKETDATA_API_KEY;

async function get(endpoint, params = {}) {
  if (!key()) throw new Error("CRICKETDATA_API_KEY not set in .env");
  const res = await axios.get(`${BASE}/${endpoint}`, {
    params: { apikey: key(), ...params },
    timeout: 10000,
  });
  if (res.data.status !== "success") {
    throw new Error(res.data.reason || `CricketData error on ${endpoint}`);
  }
  return res.data;
}

async function getCurrentMatches() {
  const cached = liveCache.get("current");
  if (cached) return cached;

  const data = await get("currentMatches", { offset: 0 });
  const ipl = (data.data || []).filter(m =>
    m.name?.toLowerCase().includes("ipl") ||
    m.series_id ||
    m.matchType === "t20"
  );
  liveCache.set("current", ipl);
  return ipl;
}

async function getScorecard(matchId) {
  const ckey = `sc_${matchId}`;
  const cached = scorecardCache.get(ckey);
  if (cached) return cached;

  const data = await get("match_scorecard", { id: matchId });
  scorecardCache.set(ckey, data.data || data);
  return data.data || data;
}

async function getMatchInfo(matchId) {
  const data = await get("match_info", { id: matchId });
  return data.data;
}

module.exports = { getCurrentMatches, getScorecard, getMatchInfo };
