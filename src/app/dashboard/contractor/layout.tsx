import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contractor Dashboard — Trovaar",
};

export default function ContractorDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
