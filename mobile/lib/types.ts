export type UserRole = "consumer" | "contractor";
export type JobStatus = "posted" | "bidding" | "accepted" | "en_route" | "arrived" | "in_progress" | "completed" | "cancelled";
export type BidStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type UrgencyLevel = "low" | "medium" | "high" | "emergency";

export interface Job {
  id: string;
  consumer_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  urgency: UrgencyLevel;
  status: JobStatus;
  photos: string;
  created_at: string;
  bid_count?: number;
  consumer_name?: string;
  budget_max?: number;
  budget_range?: string;
}

export interface Bid {
  id: string;
  job_id: string;
  contractor_id: string;
  price: number;
  timeline: string;
  message: string;
  status: BidStatus;
  created_at: string;
  contractor_name?: string;
  contractor_rating?: number;
}

export interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
}

export interface Conversation {
  job_id: string;
  job_title: string;
  other_user_name: string;
  other_user_id: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}
