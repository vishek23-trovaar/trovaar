import { NextRequest } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();
  let lastBidCount = -1;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial ping
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"));

      const interval = setInterval(async () => {
        try {
          const db = getDb();
  await initializeDatabase();
          const bids = await db.prepare(`
            SELECT b.id, b.amount, b.price, b.message, b.created_at,
                   b.contractor_id,
                   u.name as contractor_name,
                   cs.avg_response_hours
            FROM bids b
            JOIN users u ON u.id = b.contractor_id
            LEFT JOIN contractor_stats cs ON cs.contractor_id = b.contractor_id
            WHERE b.job_id = ?
            ORDER BY b.price ASC
          `).all(id) as Array<Record<string, unknown>>;

          if (bids.length !== lastBidCount) {
            lastBidCount = bids.length;
            const data = JSON.stringify({ type: "bids_update", bids });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch {
          clearInterval(interval);
          try { controller.close(); } catch { /* already closed */ }
        }
      }, 3000); // Poll DB every 3 seconds

      // Clean up when client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
