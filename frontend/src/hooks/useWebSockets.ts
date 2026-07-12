import { useEffect, useState, useRef, useCallback } from 'react';

export function useWebSockets(baseUrl: string, token?: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const connect = useCallback(() => {
    if (!token) return; // Don't connect without a token
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const url = `${baseUrl}?token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      if (!isMounted.current) return;
      setIsConnected(true);
      // Clear any pending reconnect
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    socket.onmessage = (event) => {
      if (!isMounted.current) return;
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch {
        setLastMessage(event.data);
      }
    };

    socket.onerror = () => {
      // Will be followed by onclose — let onclose handle reconnect
    };

    socket.onclose = () => {
      if (!isMounted.current) return;
      setIsConnected(false);
      // Auto-reconnect after 3s
      reconnectTimer.current = setTimeout(() => {
        if (isMounted.current) connect();
      }, 3000);
    };

    ws.current = socket;
  }, [baseUrl, token]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return { isConnected, lastMessage };
}
