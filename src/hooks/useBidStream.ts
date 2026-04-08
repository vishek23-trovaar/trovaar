"use client";
import { useState, useEffect } from "react";

export interface LiveBid {
  id: string;
  amount: number;
  price: number;
  message: string;
  created_at: string;
  contractor_id: string;
  contractor_name: string;
  avg_response_hours: number | null;
  isNew?: boolean;
}

export function useBidStream(jobId: string, enabled: boolean) {
  const [bids, setBids] = useState<LiveBid[]>([]);
  const [connected, setConnected] = useState(false);
  const [newBidIds, setNewBidIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const es = new EventSource(`/api/jobs/${jobId}/bid-stream`);

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "bids_update") {
        setBids((prev) => {
          const prevIds = new Set(prev.map((b) => b.id));
          const newIds = (data.bids as LiveBid[])
            .filter((b) => !prevIds.has(b.id))
            .map((b) => b.id);
          if (newIds.length > 0) {
            setNewBidIds((ids) => new Set([...ids, ...newIds]));
            // Clear "new" highlight after 3 seconds
            setTimeout(() => {
              setNewBidIds((ids) => {
                const next = new Set(ids);
                newIds.forEach((id: string) => next.delete(id));
                return next;
              });
            }, 3000);
          }
          return data.bids;
        });
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => es.close();
  }, [jobId, enabled]);

  return { bids, connected, newBidIds };
}
