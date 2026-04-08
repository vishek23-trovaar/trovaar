import Badge from "@/components/ui/Badge";
import { JobStatus } from "@/types";

const statusConfig: Record<JobStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  posted:      { label: "Open",        variant: "info" },
  bidding:     { label: "Bidding",     variant: "warning" },
  accepted:    { label: "Accepted",    variant: "success" },
  en_route:    { label: "En Route 🚗", variant: "info" },
  arrived:     { label: "Arrived 📍",  variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  completed:   { label: "Completed",   variant: "success" },
  cancelled:   { label: "Cancelled",   variant: "danger" },
};

export default function JobStatusBadge({ status }: { status: JobStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
