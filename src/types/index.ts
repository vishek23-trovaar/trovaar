export type UserRole = "consumer" | "contractor";
export type JobStatus = "posted" | "bidding" | "accepted" | "en_route" | "arrived" | "in_progress" | "completed" | "cancelled";
export type BidStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type UrgencyLevel = "low" | "medium" | "high" | "emergency";
export type ContractorType = "independent" | "licensed" | "certified" | "master";

export interface Qualification {
  type: "license" | "certification" | "bonded" | "membership";
  name: string;
  issuer?: string;
  number?: string;
  expiry?: string;
}

export type CategoryType =
  // Home Services
  | "plumbing" | "electrical" | "hvac" | "roofing" | "flooring"
  | "painting" | "handyman" | "carpentry" | "drywall" | "insulation"
  | "garage_doors" | "windows_doors" | "siding" | "gutters" | "pressure_washing"
  | "pool_spa" | "security_systems" | "smart_home" | "appliance_repair" | "locksmith"
  | "foundation" | "tile_grout" | "cabinets" | "kitchen_remodel" | "bathroom_remodel"
  | "cleaning" | "deep_cleaning" | "carpet_cleaning" | "window_cleaning"
  | "home_organizing" | "junk_removal" | "tv_mounting" | "furniture_assembly"
  | "shelving_install" | "minor_demolition" | "wallpaper" | "caulking_weatherstrip"
  // Outdoor & Landscaping
  | "landscaping" | "tree_service" | "irrigation" | "fencing" | "concrete_masonry"
  | "deck_patio" | "outdoor_lighting" | "pest_control" | "snow_removal"
  | "gutter_cleaning" | "holiday_lights" | "outdoor_painting"
  // Moving & Hauling
  | "moving" | "moving_labor" | "furniture_moving" | "heavy_lifting"
  | "packing" | "junk_hauling" | "donation_dropoff" | "storage_help"
  // Automotive
  | "auto_repair" | "auto_detailing" | "tires_wheels" | "auto_glass" | "auto_body"
  | "car_audio" | "window_tinting" | "auto_upholstery" | "transmission" | "diesel_heavy"
  | "mobile_mechanic" | "car_wrap" | "paint_protection" | "fleet_service"
  // Marine
  | "boat_repair" | "jetski_repair" | "marine_fiberglass" | "marine_upholstery"
  | "boat_detailing" | "marine_electrical" | "prop_drive" | "boat_trailer"
  | "wakeboard_setup" | "marine_electronics"
  // Glass & Glazing
  | "auto_windshield" | "commercial_glass" | "shower_glass" | "mirror_install" | "glass_custom"
  // Personal Services & Errands
  | "errands" | "grocery_shopping" | "waiting_in_line" | "personal_assistant"
  | "senior_assistance" | "childcare" | "tutoring" | "notary" | "translation"
  // Pet Services
  | "dog_walking" | "pet_sitting" | "pet_grooming" | "pet_training"
  | "pet_transport" | "aquarium_service"
  // Events & Entertainment
  | "event_setup" | "event_staffing" | "photography" | "videography"
  | "dj_music" | "bartending" | "catering" | "bounce_house" | "face_painting"
  // Health & Wellness
  | "personal_training" | "yoga_instruction" | "massage_therapy"
  | "nutrition_coaching" | "hair_styling" | "makeup_artist" | "nail_tech"
  // Commercial
  | "commercial_cleaning" | "commercial_electrical" | "commercial_plumbing"
  | "commercial_hvac" | "commercial_flooring" | "restaurant_equipment"
  | "fire_safety" | "signage_installation" | "office_moving" | "commercial_painting"
  | "janitorial" | "bookkeeping"
  // Technology & IT
  | "it_networking" | "computer_repair" | "smart_home_install" | "security_cameras"
  | "home_theater" | "data_recovery" | "phone_repair" | "website_help" | "drone_services"
  // Specialty Trades
  | "welding" | "powder_coating" | "fiberglass_composite" | "vinyl_wrap"
  | "sandblasting" | "generator" | "elevator_lift" | "machine_shop"
  | "solar_install" | "ev_charging" | "water_treatment";
export type OAuthProvider = "google" | "apple" | "facebook";

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  role: UserRole;
  phone: string | null;
  location: string | null;
  email_verified: number; // 0 or 1 (SQLite boolean)
  oauth_provider: OAuthProvider | null;
  referral_code: string | null;
  referred_by: string | null;
  credit_balance_cents: number;
  created_at: string;
}

export interface ContractorProfile {
  user_id: string;
  bio: string | null;
  years_experience: number;
  categories: string;
  profile_photo: string | null;
  rating: number;
  rating_count: number;
  verification_status: "none" | "pending" | "approved" | "rejected";
  insurance_status: "none" | "pending" | "approved" | "rejected";
  business_established: number | null;
  portfolio_photos: string;
  contractor_type: ContractorType;
  qualifications: string; // JSON array of Qualification
  created_at: string;
}

export interface Job {
  id: string;
  consumer_id: string;
  title: string;
  description: string | null;
  category: CategoryType;
  photos: string;
  location: string;
  urgency: UrgencyLevel;
  status: JobStatus;
  latitude: number | null;
  longitude: number | null;
  emergency_fee: number;
  expected_completion_date: string | null;
  is_instant_book?: number;
  created_at: string;
  updated_at: string;
}

export interface Bid {
  id: string;
  job_id: string;
  contractor_id: string;
  price: number;
  timeline_days: number;
  availability_date: string;
  message: string | null;
  status: BidStatus;
  created_at: string;
}

export interface JobWithBidCount extends Job {
  bid_count: number;
  consumer_name: string;
  consumer_rating?: number | null;
  consumer_rating_count?: number | null;
  payment_status?: string | null;
  payment_intent_id?: string | null;
  ai_questions?: string | null; // JSON: [{question, answer}]
  // Collaboration fields — present when is_collab === true
  is_collab?: boolean;
  collab_help_request_id?: string;   // the help_request row id
  collab_pay_cents?: number;          // what the lead contractor pays the helper
  collab_spots?: number;
  collab_spots_filled?: number;
}

export interface BidWithContractor extends Bid {
  contractor_name: string;
  contractor_rating: number;
  contractor_years_experience: number;
  contractor_photo: string | null;
  contractor_verification_status?: string;
  contractor_insurance_status?: string;
  contractor_type?: ContractorType;
  contractor_qualifications?: string; // JSON array of Qualification
  contractor_completed_jobs?: number;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  isAdmin: boolean;
  tokenVersion?: number;
}

export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: OAuthProvider;
  provider_user_id: string;
  created_at: string;
}

export interface VerificationCode {
  id: string;
  user_id: string;
  code: string;
  expires_at: string;
  used: number; // 0 or 1
  created_at: string;
}

export interface PendingOAuthData {
  email: string;
  name: string;
  provider: OAuthProvider;
  providerUserId: string;
  emailVerified: true;
}

export interface Review {
  id: string;
  job_id: string;
  reviewer_id: string;
  contractor_id: string;
  rating: number;
  comment: string | null;
  photos: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  job_id: string | null;
  read: number;
  created_at: string;
}
