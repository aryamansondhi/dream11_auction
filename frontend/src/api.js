import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api",
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem("ipl_admin_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r.data,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem("ipl_admin_token");
      window.location.reload();
    }
    return Promise.reject(err.response?.data || err);
  }
);

export const auth = {
  login: pw => api.post("/auth/login", { password: pw }),
  verify: () => api.get("/auth/verify"),
};

export const league = {
  get: () => api.get("/league"),
};

export const live = {
  matches: () => api.get("/live"),
  scorecard: id => api.get(`/live/${id}/scorecard`),
};

export const score = {
  autoPreview:    body => api.post("/score/auto/preview", body),
  autoConfirm:    body => api.post("/score/auto/confirm", body),
  ssPreview:      body => api.post("/score/screenshot/preview", body),
  ssConfirm:      body => api.post("/score/screenshot/confirm", body),
  manual:         body => api.post("/score/manual", body),
  rollback:       id   => api.post(`/score/${id}/rollback`),
  crex:           body => api.post('/score/crex', body),
  audit:          ()   => api.get("/score/audit"),
};

export default api;

export const stats = {
  trends: () => api.get("/stats/trends"),
  player: (id) => api.get(`/stats/player/${id}`),
  matchPlayers: (t1, t2) => api.get(`/stats/match-players?t1=${t1}&t2=${t2}`),
};

// SSE — returns an EventSource, caller manages lifecycle
export function createEventSource() {
  return new EventSource("/api/events");
}

export const rosters = {
  getAll:     ()     => api.get("/rosters"),
  setCapVC:   (teamId, body) => api.post(`/rosters/${teamId}/captain`, body),
  swap:       (teamId, body) => api.post(`/rosters/${teamId}/swap`, body),
  trades:     ()     => api.get("/rosters/trades"),
  setTrades:  (teamId, tradesUsed) => api.patch(`/rosters/${teamId}/trades`, { tradesUsed }),
  retain:     (teamId, body) => api.post(`/rosters/${teamId}/retain`, body),
};

export const fixtures = {
  getAll: () => api.get("/fixtures"),
};