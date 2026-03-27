import { create } from "zustand";
import { auth as authApi, league as leagueApi } from "./api";

export const useStore = create((set, get) => ({
  // ── Auth ─────────────────────────────────────────────────────────────────
  isAdmin: false,
  authChecked: false,

  checkAuth: async () => {
    const token = localStorage.getItem("ipl_admin_token");
    if (!token) { set({ authChecked: true, isAdmin: false }); return; }
    try {
      const res = await authApi.verify();
      set({ isAdmin: res.valid && res.role === "admin", authChecked: true });
    } catch {
      set({ isAdmin: false, authChecked: true });
    }
  },

  login: async (password) => {
    const res = await authApi.login(password);
    localStorage.setItem("ipl_admin_token", res.token);
    set({ isAdmin: true });
  },

  logout: () => {
    localStorage.removeItem("ipl_admin_token");
    set({ isAdmin: false });
  },

  // ── League data ───────────────────────────────────────────────────────────
  leaderboard: [],
  matches: [],
  lastFetched: null,
  loading: false,
  error: null,

  fetchLeague: async () => {
    set({ loading: true, error: null });
    try {
      const res = await leagueApi.get();
      set({ leaderboard: res.leaderboard, matches: res.matches, lastFetched: Date.now(), loading: false });
    } catch (e) {
      set({ error: e.error || "Failed to load", loading: false });
    }
  },

  // ── UI state ──────────────────────────────────────────────────────────────
  selectedTeamId: null,
  setSelectedTeam: (id) => set({ selectedTeamId: id }),
}));
