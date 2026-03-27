import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "./store";
import { V } from "./tokens";
import Header from "./components/Header";
import SettingsDrawer from "./components/SettingsDrawer";
import Leaderboard from "./pages/Leaderboard";
import Squads from "./pages/Squads";
import Live from "./pages/Live";
import ControlCenter from "./pages/ControlCenter";
import Rules from "./pages/Rules";
import { useLiveEvents } from "./hooks/useLiveEvents";

function ProtectedRoute({ children }) {
  const isAdmin = useStore(s => s.isAdmin);
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppLayout() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { checkAuth, authChecked } = useStore();

  useEffect(() => { checkAuth(); }, []);
  useLiveEvents();

  if (!authChecked) {
    return (
      <div style={{ background: V.void, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: V.fontHead, fontSize: 28, fontWeight: 900, background: V.gradSunset, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 12 }}>
            THE GRID
          </div>
          <div style={{ fontFamily: V.fontMono, fontSize: 11, color: V.magenta, letterSpacing: "0.2em", textShadow: `0 0 6px ${V.magenta}`, animation: "vpPulse 1.5s ease-in-out infinite" }}>
            INITIALIZING…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: V.void, minHeight: "100vh", color: V.text, position: "relative" }}>
      {/* Floating sun */}
      <div className="vp-sun" style={{ top: "10%", left: "50%", transform: "translateX(-50%)" }} />

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Header onSettingsOpen={() => setSettingsOpen(true)} />

      <main style={{ padding: "20px 20px 80px", maxWidth: 640, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <Routes>
          <Route path="/"        element={<Leaderboard />} />
          <Route path="/squads"  element={<Squads />} />
          <Route path="/live"    element={<Live />} />
          <Route path="/control" element={<ProtectedRoute><ControlCenter /></ProtectedRoute>} />
          <Route path="/rules"   element={<Rules />} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Bottom perspective grid */}
      <div className="vp-grid" style={{ position: "fixed" }}>
        <div className="vp-grid-inner" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
