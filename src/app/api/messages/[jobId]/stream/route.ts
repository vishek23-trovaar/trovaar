import { NextRequest } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

interface DbJob {
  id: string;
  consumer_id: string;
}

interface DbBid {
  contractor_id: string;
}

interface DbMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  read: number;
  read_at: string | null;
  created_at: string;
}

/**
 * SSE endpoint for real-time message delivery.
 * Polls the database every 1.5 seconds and sends new messages as events.
 * Also sends typing indicators and read receipt updates.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { jobId } = await params;
  const db = getDb();
  await initializeDatabase();

  // Verify access
  const job = await db.prepare("SELECT id, consumer_id FROM jobs WHERE id = ?").get(jobId) as DbJob | undefined;
  if (!job) return new Response("Not found", { status: 404 });

  const isConsumer = job.consumer_id === payload.userId;
  const acceptedBid = await db.prepare(
    "SELECT contractor_id FROM bids WHERE job_id = ? AND status = 'accepted'"
  ).get(jobId) as DbBid | undefined;
  const isContractor = acceptedBid?.contractor_id === payload.userId;

  if (!isConsumer && !isContractor) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let lastMessageId = "";
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial heartbeat
      controller.enqueue(encoder.encode(": heartbeat\n\n"));

      const poll = async () => {
        if (closed) return;

        try {
          // Fetch new messages since last seen
          let messages: DbMessage[];
          if (lastMessageId) {
            messages = await db.prepare(`
              SELECT m.id, m.sender_id, u.name as sender_name, m.content, m.read, m.read_at, m.created_at
              FROM messages m
              JOIN users u ON m.sender_id = u.id
              WHERE m.job_id = ? AND m.created_at > (
                SELECT created_at FROM messages WHERE id = ?
              )
              ORDER BY m.created_at ASC
            `).all(jobId, lastMessageId) as DbMessage[];
          } else {
            // On first poll, get the latest message ID only (client already has messages from initial fetch)
            const latest = await db.prepare(`
              SELECT id FROM messages WHERE job_id = ? ORDER BY created_at DESC LIMIT 1
            `).get(jobId) as { id: string } | undefined;
            if (latest) lastMessageId = latest.id;
            messages = [];
          }

          for (const msg of messages) {
            const event = {
              type: "message",
              data: {
                id: msg.id,
                sender_id: msg.sender_id,
                sender_name: msg.sender_name,
                content: msg.content,
                read: msg.read,
                read_at: msg.read_at,
                created_at: msg.created_at,
                is_mine: msg.sender_id === payload.userId,
              },
            };
            controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify(event.data)}\n\n`));
            lastMessageId = msg.id;
          }

          // Check for read receipt updates on our sent messages
          const readUpdates = await db.prepare(`
            SELECT id, read_at FROM messages
            WHERE job_id = ? AND sender_id = ? AND read = 1 AND read_at IS NOT NULL
            ORDER BY read_at DESC LIMIT 1
          `).get(jobId, payload.userId) as { id: string; read_at: string } | undefined;

          if (readUpdates) {
            controller.enqueue(encoder.encode(`event: read\ndata: ${JSON.stringify({ jobId, readAt: readUpdates.read_at })}\n\n`));
          }

          // Mark received messages as read
          await db.prepare(
            "UPDATE messages SET read = 1, read_at = COALESCE(read_at, NOW()) WHERE job_id = ? AND receiver_id = ? AND read = 0"
          ).run(jobId, payload.userId);
        } catch {
          // Non-fatal — will retry on next poll
        }

        if (!closed) {
          setTimeout(poll, 1500);
        }
      };

      // Start polling
      poll();

      // Send heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
          clearInterval(heartbeat);
        }
      }, 30000);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
