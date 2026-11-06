"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WebSocketEvent } from "@/types";

export function useWebSocket() {
  const [events, setEvents] = useState<WebSocketEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    let unmounted = false;
    let reconnectTimer: NodeJS.Timeout;

    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname || "127.0.0.1";
      const port = process.env.NEXT_PUBLIC_WS_PORT || "8000";
      const wsUrl = `${protocol}//${host}:${port}/ws/cameras`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!unmounted) setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          if (data.type === "pong") return;

          setEvents((prev) => [data, ...prev].slice(0, 100)); // keep last 100

          // Invalidate relevant react-query caches
          if (data.type.startsWith("camera.")) {
            queryClient.invalidateQueries({ queryKey: ["cameras"] });
          }
          if (data.type.startsWith("stream.")) {
            queryClient.invalidateQueries({ queryKey: ["cameras"] });
            queryClient.invalidateQueries({ queryKey: ["rtspStats"] });
            queryClient.invalidateQueries({ queryKey: ["rtmpStats"] });
          }
        } catch (e) {
          console.error("Failed to parse websocket event:", e);
        }
      };

      ws.onclose = () => {
        if (!unmounted) {
          setIsConnected(false);
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = (err) => {
        console.warn("WebSocket connection error:", err);
      };
    }

    connect();

    // Heartbeat ping
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send("ping");
      }
    }, 15000);

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimer);
      clearInterval(pingInterval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [queryClient]);

  const clearEvents = () => setEvents([]);

  const sendPing = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ping" }));
    }
  };

  return { events, isConnected, clearEvents, sendPing };
}
