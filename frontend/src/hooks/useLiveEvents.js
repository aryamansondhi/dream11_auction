import { useEffect } from "react";
import { createEventSource } from "../api";
import { useStore } from "../store";

/**
 * Connects to the backend SSE stream.
 * When a match_scored event comes in, auto-refreshes the leaderboard.
 * Mount once at the App level.
 */
export function useLiveEvents() {
  const fetchLeague = useStore(s => s.fetchLeague);

  useEffect(() => {
    const es = createEventSource();

    es.addEventListener("match_scored", () => {
      // Small delay so DB writes fully commit before we re-fetch
      setTimeout(() => fetchLeague(), 500);
    });

    es.onerror = () => {
      // SSE will auto-reconnect — no action needed
    };

    return () => es.close();
  }, []);
}
