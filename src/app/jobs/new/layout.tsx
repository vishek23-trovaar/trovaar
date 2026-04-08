import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post a Job — Trovaar",
};

export default function JobsNewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
