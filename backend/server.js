require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(require("cors")({
  origin: [
    "http://localhost:5173",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// Rate limiting
app.use("/api/score", rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: "Too many requests" } }));
app.use("/api/auth/login", rateLimit({ windowMs: 60 * 1000, max: 10 }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",   require("./src/routes/auth"));
app.use("/api/league", require("./src/routes/league"));
app.use("/api/live",   require("./src/routes/live"));
app.use("/api/score",  require("./src/routes/scoring"));
app.use("/api/stats",  require("./src/routes/stats"));
app.use("/api/rosters", require("./src/routes/rosters"));
app.use("/api/fixtures", require("./src/routes/fixtures"));
app.use("/api/events", require("./src/routes/events").router);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n🏏 IPL Fantasy API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   CricketData key: ${process.env.CRICKETDATA_API_KEY ? "✓ set" : "✗ missing"}`);
  console.log(`   Anthropic key:   ${process.env.ANTHROPIC_API_KEY   ? "✓ set" : "✗ missing"}\n`);
});
