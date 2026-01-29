"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { HELIUS_WS_URL } from "@/lib/helius";

interface AccountUpdate {
  pubkey: string;
  data: any;
  slot: number;
}

export function useHeliusWebSocket(
  accountPubkey: string | null,
  onUpdate?: (update: AccountUpdate) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<AccountUpdate | null>(null);

  const connect = useCallback(() => {
    if (!accountPubkey || wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(HELIUS_WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "accountSubscribe",
          params: [
            accountPubkey,
            { encoding: "jsonParsed", commitment: "confirmed" },
          ],
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.method === "accountNotification") {
          const update: AccountUpdate = {
            pubkey: accountPubkey,
            data: data.params.result.value,
            slot: data.params.result.context.slot,
          };
          setLastUpdate(update);
          onUpdate?.(update);
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => setConnected(false);
    ws.onclose = () => setConnected(false);
  }, [accountPubkey, onUpdate]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { connected, lastUpdate, reconnect: connect };
}
