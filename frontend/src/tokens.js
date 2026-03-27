// ── Vaporwave / Outrun Design Tokens ─────────────────────────────────────────

export const V = {
  void:     "#090014",
  card:     "#1a103c",
  cardHi:   "#231548",
  border:   "#2D1B4E",
  borderHi: "#FF00FF",
  magenta:  "#FF00FF",
  cyan:     "#00FFFF",
  orange:   "#FF9900",
  text:     "#E0E0E0",
  sub:      "rgba(224,224,224,0.55)",
  muted:    "rgba(224,224,224,0.12)",
  dim:      "rgba(0,0,0,0.5)",
  green:    "#00FF88",
  red:      "#FF3366",
  gold:     "#FF9900",

  glowM:    "0 0 8px #FF00FF, 0 0 20px rgba(255,0,255,0.4)",
  glowC:    "0 0 8px #00FFFF, 0 0 20px rgba(0,255,255,0.4)",
  glowO:    "0 0 8px #FF9900, 0 0 20px rgba(255,153,0,0.4)",
  glowMBig: "0 0 15px #FF00FF, 0 0 40px rgba(255,0,255,0.5), 0 0 60px rgba(255,0,255,0.2)",
  glowCBig: "0 0 15px #00FFFF, 0 0 40px rgba(0,255,255,0.5), 0 0 60px rgba(0,255,255,0.2)",

  gradSunset: "linear-gradient(to right, #FF9900, #FF00FF, #00FFFF)",
  gradGlow:   "linear-gradient(to bottom, #FF9900, #FF00FF)",
  gradAccent: "linear-gradient(to right, #FF00FF, #00FFFF)",

  fontHead: "'Orbitron', sans-serif",
  fontMono: "'Share Tech Mono', monospace",
};

// ── IPL team brand data ───────────────────────────────────────────────────────
// primary = main brand color, secondary = accent, bg = dark background shade
export const IPL_BRANDS = {
  MI:   { name: "Mumbai Indians",      primary: "#004BA0", secondary: "#D4AF37", bg: "#001F4D", text: "#FFFFFF" },
  CSK:  { name: "Chennai Super Kings", primary: "#F7B731", secondary: "#0066B3", bg: "#2C1A00", text: "#000000" },
  RCB:  { name: "Royal Challengers",   primary: "#EC1C24", secondary: "#C8A84B", bg: "#2C0000", text: "#FFFFFF" },
  KKR:  { name: "Kolkata Knight Riders",primary:"#3B215F", secondary: "#F1C40F", bg: "#1A0C2E", text: "#F1C40F" },
  SRH:  { name: "Sunrisers Hyderabad", primary: "#FF822A", secondary: "#000000", bg: "#2C1000", text: "#FFFFFF" },
  GT:   { name: "Gujarat Titans",      primary: "#1C2B5E", secondary: "#C8A84B", bg: "#0A1020", text: "#C8A84B" },
  RR:   { name: "Rajasthan Royals",    primary: "#EA1A7F", secondary: "#2F5DA8", bg: "#2C0020", text: "#FFFFFF" },
  DC:   { name: "Delhi Capitals",      primary: "#0078BC", secondary: "#EF1B23", bg: "#001C30", text: "#FFFFFF" },
  PBKS: { name: "Punjab Kings",        primary: "#ED1B24", secondary: "#A7A9AC", bg: "#2C0000", text: "#FFFFFF" },
  LSG:  { name: "Lucknow Super Giants",primary: "#A72056", secondary: "#00B4FF", bg: "#1A0010", text: "#FFFFFF" },
};

// Vaporwave-tinted versions for UI elements
export const TEAM_COLORS = {
  MI:   "#004BA0",
  CSK:  "#F7B731",
  RCB:  "#EC1C24",
  KKR:  "#9B59B6",
  SRH:  "#FF822A",
  GT:   "#C8A84B",
  RR:   "#EA1A7F",
  DC:   "#0078BC",
  PBKS: "#ED1B24",
  LSG:  "#00B4FF",
};

export const ROLE_COLORS = {
  "Batsman":       "#00FFFF",
  "Bowler":        "#FF00FF",
  "All-Rounder":   "#FF9900",
  "Wicket-Keeper": "#CC44FF",
};

export const IPL_TEAMS = ["MI","CSK","RCB","KKR","SRH","GT","RR","DC","PBKS","LSG"];

export const TEAM_OWNERS = {
  "point_blank_xi": "Aryaman Sondhi",
  "chodu_power":    "Krish Choudhary",
  "rb":             "Roshan Bhuchar",
  "yuvin3108":      "Yuvin Madhani",
  "arya":           "Arya Tulsyan",
  "yashish_hirani": "Yashish Hirani",
};

export const STAT_FIELDS = [
  ["runs","Runs"],["balls","Balls"],["fours","4s"],["sixes","6s"],
  ["wickets","Wkts"],["overs","Overs"],["runsConceded","Runs gvn"],
  ["dotBalls","Dots"],["maidens","Maiden"],["lbwBowled","LBW/Bld"],
  ["catches","Catches"],["stumpings","Stump"],["directRO","Dir RO"],["indirectRO","Indir RO"],
];

// Backward compat
export const T = V;
