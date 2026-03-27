const express = require("express");
const router = express.Router();

// In-memory set of connected SSE clients
const clients = new Set();

// Broadcast to all connected clients
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => {
    try { res.write(payload); } catch {}
  });
}

// GET /api/events — SSE stream
router.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send a heartbeat immediately, then every 25s to keep connection alive
  res.write(`event: connected\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
  const heartbeat = setInterval(() => {
    try { res.write(`: heartbeat\n\n`); } catch {}
  }, 25000);

  clients.add(res);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

module.exports = { router, broadcast };
