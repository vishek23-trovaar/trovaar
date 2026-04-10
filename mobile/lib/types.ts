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
  urgency: string;
  location: string;
  status: string;
  budget_min?: number;
  budget_max?: number;
  photos?: string;
  bid_count: number;
  latitude?: number;
  longitude?: number;
  consumer_name?: string;
  payment_status?: string;
  contractor_confirmed?: number;
  consumer_confirmed?: number;
  created_at: string;
  updated_at?: string;
}

export interface Bid {
  id: string;
  job_id: string;
  contractor_id: string;
  contractor_name: string;
  contractor_rating?: number;
  contractor_years_experience?: number;
  contractor_completed_jobs?: number;
  contractor_photo?: string;
  contractor_verification_status?: string;
  contractor_background_check?: string;
  price: number;
  labor_cents?: number;
  materials_json?: string;
  parts_summary?: string;
  equipment_json?: string;
  timeline?: string;
  timeline_days: number;
  availability_date: string;
  message?: string;
  status: string;
  created_at: string;
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

export interface PortfolioItem {
  id: string;
  contractor_id: string;
  category: string;
  title: string;
  description?: string;
  before_photos: string;
  after_photos: string;
  created_at: string;
}

export interface QuizScore {
  category: string;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  taken_at: string;
}

export interface MatchScore {
  score: number;
  reasoning: string;
  highlights: string[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: string;
  read: number;
  created_at: string;
}
