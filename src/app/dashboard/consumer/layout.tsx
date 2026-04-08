import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Dashboard — Trovaar",
};

export default function ConsumerDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
