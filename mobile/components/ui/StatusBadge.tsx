import React from "react";
import Badge from "./Badge";

type JobStatus =
  | "posted"
  | "bidding"
  | "accepted"
  | "en_route"
  | "arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

type BidStatus = "pending" | "accepted" | "rejected" | "withdrawn";

interface StatusBadgeProps {
  status: JobStatus | BidStatus;
  type?: "job" | "bid";
}

const JOB_STATUS_MAP: Record<JobStatus, { label: string; color: "blue" | "green" | "amber" | "red" | "slate" }> = {
  posted: { label: "Posted", color: "blue" },
  bidding: { label: "Bidding", color: "blue" },
  accepted: { label: "Accepted", color: "green" },
  en_route: { label: "En Route", color: "amber" },
  arrived: { label: "Arrived", color: "amber" },
  in_progress: { label: "In Progress", color: "amber" },
  completed: { label: "Completed", color: "green" },
  cancelled: { label: "Cancelled", color: "red" },
};

const BID_STATUS_MAP: Record<BidStatus, { label: string; color: "blue" | "green" | "amber" | "red" | "slate" }> = {
  pending: { label: "Pending", color: "amber" },
  accepted: { label: "Accepted", color: "green" },
  rejected: { label: "Rejected", color: "red" },
  withdrawn: { label: "Withdrawn", color: "slate" },
};

export default function StatusBadge({ status, type = "job" }: StatusBadgeProps) {
  const map = type === "bid" ? BID_STATUS_MAP : JOB_STATUS_MAP;
  const config = (map as Record<string, { label: string; color: "blue" | "green" | "amber" | "red" | "slate" }>)[status];
  if (!config) return <Badge text={status} color="slate" />;
  return <Badge text={config.label} color={config.color} />;
}
