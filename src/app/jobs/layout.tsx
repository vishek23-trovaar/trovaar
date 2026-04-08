import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Jobs — Trovaar",
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
