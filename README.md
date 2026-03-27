# Fantasy IPL 2026 — Full Stack Setup

## What you're running
- **Backend**: Node.js + Express + PostgreSQL + Prisma ORM
- **Frontend**: React + Vite + Zustand + React Router
- **AI**: Claude claude-opus-4-5 for scorecard parsing
- **Live data**: CricketData.org API
- **Database**: PostgreSQL (via Docker) + Redis (caching)

---

## Prerequisites — install these first

```bash
# 1. Node.js 20+
node --version   # should say v20+

# 2. Docker Desktop — runs your database
# Download from: https://www.docker.com/products/docker-desktop

# 3. VS Code (you already have this)
```

---

## Step 1 — Open the project in VS Code

Open VS Code → File → Open Folder → select `dream11_auction`

Open the integrated terminal: **Ctrl+` ** (backtick)

---

## Step 2 — Start the database

```bash
# From the dream11_auction root folder:
docker-compose up -d

# Verify it's running:
docker ps
# You should see: ipl_fantasy_db and ipl_fantasy_redis
```

---

## Step 3 — Set up the backend

```bash
cd backend

# Install dependencies
npm install

# Copy the env file and fill it in
cp .env.example .env
```

Now open `backend/.env` and fill in:

```env
DATABASE_URL="postgresql://fantasy:fantasy_secret@localhost:5432/ipl_fantasy"
JWT_SECRET="make-this-a-long-random-string-like-this-abc123xyz789"
ADMIN_PASSWORD="dc2026"
ANTHROPIC_API_KEY="sk-ant-api03-..."       ← your Anthropic key
CRICKETDATA_API_KEY="your-key-here"         ← from cricketdata.org
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

```bash
# Generate the Prisma client
npx prisma generate

# Push the schema to the database
npx prisma migrate dev --name init

# Seed all 8 squads and 120 players into the database
npm run db:seed

# Start the backend
npm run dev
# Should print: 🏏 IPL Fantasy API running on http://localhost:3001
```

---

## Step 4 — Set up the frontend

Open a **second terminal tab** in VS Code (click the + icon in the terminal panel):

```bash
cd frontend

# Install dependencies
npm install

# Start the frontend
npm run dev
# Opens at http://localhost:5173
```

---

## Step 5 — You're live

Open **http://localhost:5173** in your browser.

- Click **Admin** → enter password `dc2026` → unlocks Control Center
- Click **⚙** → add your CricketData key → live scores work
- Go to **Control Center → Auto-score** after a match ends

---

## How auto-scoring works (the foolproof pipeline)

After a match ends on ESPN/Cricbuzz:

1. **You** click Control Center → Auto-score
2. The backend fetches live matches from CricketData API
3. You see the match list — it shows how many of your fantasy players are in each match
4. Click "Fetch & auto-score"
5. Backend pulls the **full ball-by-ball scorecard JSON** from CricketData
6. That JSON is sent to **Claude claude-opus-4-5** with the list of all 120 registered player names
7. Claude extracts every stat for every player and returns structured JSON
8. The backend runs **fuzzy name matching** (Fuse.js) to handle:
   - API abbreviations ("V Kohli" → "Virat Kohli")
   - Spelling variants ("Varun Chakravarthy" → "Varun Chakaravarthy")
   - 50+ hardcoded aliases for common mismatches
9. Every stat is **validated** — catches impossible values (runs > balls×6, overs > 4, etc.)
10. You see a **review screen** with confidence scores per player
    - Green (90%+) = exact or alias match ✓
    - Yellow (70-89%) = fuzzy matched — verify it's correct
    - Red (<70%) = skipped automatically
11. Click **Confirm** → saved to PostgreSQL with full audit trail
12. Leaderboard updates instantly

### What can go wrong and how we handle it:

| Problem | How it's handled |
|---|---|
| CricketData scorecard not ready yet | Error shown, try again in 10 mins |
| Player name abbreviation in API | 50+ aliases + Fuse.js fuzzy matching |
| Claude returns bad JSON | Try/catch with clear error message |
| Match already scored | Database unique constraint blocks duplicate |
| Wrong stats entered | Rollback button removes all points for that match |
| Overs > 4, impossible values | Server-side validation caps and warns |

---

## Daily workflow during IPL

```
Match finishes (e.g. MI vs RCB)
       ↓
Open http://localhost:5173
       ↓
Control Center → Auto-score
       ↓
Pick the match → Claude parses it (~10 seconds)
       ↓
Review screen → looks good → Confirm
       ↓
Done. Share the URL with your friends.
```

**Total effort per match: ~3 clicks, 15 seconds.**

---

## Useful commands

```bash
# View your database visually
cd backend && npx prisma studio
# Opens at http://localhost:5555

# Roll back a match (also available in the UI)
# Go to Control Center → Rollback & audit

# Check backend logs
cd backend && npm run dev

# Rebuild frontend after code changes
cd frontend && npm run dev
```

---

## Making it accessible to your friends

Right now it only runs on your laptop. To share it:

**Option A — Share on local network (all on same WiFi)**
```bash
# Find your local IP
ipconfig    # Windows
ifconfig    # Mac/Linux

# Tell friends to open: http://YOUR_LOCAL_IP:5173
```

**Option B — Deploy online (Render + Railway)**
- Backend → Railway.app (free PostgreSQL included)
- Frontend → Vercel (free)
- Full deploy guide: ask Claude when you're ready

---

## Project structure

```
dream11_auction/
├── docker-compose.yml          ← PostgreSQL + Redis
├── backend/
│   ├── .env                    ← YOUR KEYS GO HERE
│   ├── server.js               ← Express entry point
│   ├── prisma/schema.prisma    ← Database schema
│   └── src/
│       ├── routes/             ← API endpoints
│       ├── services/
│       │   ├── ai-scorer.js    ← Claude integration
│       │   ├── player-matcher.js ← Fuzzy name matching
│       │   ├── scoring-engine.js ← Dream11 points logic
│       │   └── cricket-api.js  ← CricketData wrapper
│       └── data/
│           ├── squads.js       ← All 8 squads
│           └── seed.js         ← DB seeder
└── frontend/
    ├── src/
    │   ├── App.jsx             ← Router
    │   ├── store.js            ← Global state (Zustand)
    │   ├── api.js              ← Backend API client
    │   ├── pages/              ← Leaderboard, Squads, Live, ControlCenter, Rules
    │   └── components/         ← Header, UI, LoginModal, SettingsDrawer
    └── index.html
```

---

## Admin password
Current: `dc2026`
To change: update `ADMIN_PASSWORD` in `backend/.env` and restart the server.
