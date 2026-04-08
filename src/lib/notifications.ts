import { v4 as uuidv4 } from "uuid";
import { getDb, initializeDatabase } from "@/lib/db";
import { sendPushNotification } from "@/lib/push";

// ---------------------------------------------------------------------------
// Core helper — insert a row into the notifications table
// ---------------------------------------------------------------------------

export type NotificationType =
  | "new_bid"
  | "bid_accepted"
  | "bid_rejected"
  | "job_completed"
  | "payment_released"
  | "dispute_opened"
  | "dispute_resolved"
  | "message_received"
  | "review_received";

export async function createNotification(
  userId: string,
  type: NotificationType | string,
  title: string,
  message: string,
  jobId?: string
): Promise<void> {
  try {
    const db = getDb();
  await initializeDatabase();
    await db.prepare(
      "INSERT INTO notifications (id, user_id, type, title, message, job_id) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(uuidv4(), userId, type, title, message, jobId ?? null);

    // Also send push notification (non-blocking)
    try {
      sendPushNotification(userId, title, message, jobId ? `/jobs/${jobId}` : undefined);
    } catch {
      // push is best-effort
    }
  } catch (err) {
    console.error("[notifications] createNotification failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Typed notification creators
// ---------------------------------------------------------------------------

export function notifyNewBid(
  consumerId: string,
  jobTitle: string,
  contractorName: string,
  bidAmount: number,
  jobId: string
): void {
  createNotification(
    consumerId,
    "new_bid",
    "New bid on your job",
    `${contractorName} submitted a bid of $${bidAmount} on "${jobTitle}"`,
    jobId
  );
}

export function notifyBidAccepted(
  contractorId: string,
  jobTitle: string,
  jobId: string
): void {
  createNotification(
    contractorId,
    "bid_accepted",
    "Your bid was accepted!",
    `Your bid on "${jobTitle}" was accepted. Contact the customer to get started.`,
    jobId
  );
}

export function notifyBidRejected(
  contractorId: string,
  jobTitle: string,
  jobId: string
): void {
  createNotification(
    contractorId,
    "bid_rejected",
    "Bid not selected",
    `Your bid on "${jobTitle}" was not selected this time.`,
    jobId
  );
}

export function notifyJobCompleted(
  userId: string,
  jobTitle: string,
  jobId: string
): void {
  createNotification(
    userId,
    "job_completed",
    "Job confirmed complete!",
    `The job "${jobTitle}" has been marked as complete.`,
    jobId
  );
}

export function notifyPaymentReleased(
  contractorId: string,
  amount: number,
  jobTitle: string,
  jobId: string
): void {
  createNotification(
    contractorId,
    "payment_released",
    "Payment released",
    `$${amount} has been released for "${jobTitle}".`,
    jobId
  );
}

export function notifyDisputeOpened(
  userId: string,
  jobTitle: string,
  jobId: string
): void {
  createNotification(
    userId,
    "dispute_opened",
    "Dispute filed",
    `A dispute has been filed for "${jobTitle}". Our team will review it shortly.`,
    jobId
  );
}

export function notifyDisputeResolved(
  userId: string,
  jobTitle: string,
  resolution: string,
  jobId: string
): void {
  createNotification(
    userId,
    "dispute_resolved",
    "Dispute resolved",
    `The dispute for "${jobTitle}" has been resolved: ${resolution}`,
    jobId
  );
}

export function notifyNewMessage(
  userId: string,
  senderName: string,
  jobTitle: string,
  jobId: string
): void {
  createNotification(
    userId,
    "message_received",
    "New message",
    `${senderName} sent a message about "${jobTitle}"`,
    jobId
  );
}

export function notifyReviewReceived(
  contractorId: string,
  rating: number,
  jobTitle: string,
  jobId: string
): void {
  createNotification(
    contractorId,
    "review_received",
    "New review received",
    `You received a ${rating}-star review for "${jobTitle}"`,
    jobId
  );
}
