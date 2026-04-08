import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trovaar.com";
    const res = await fetch(`${baseUrl}/api/jobs/${id}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      const job = data.job as { title?: string; description?: string } | null;
      if (job) {
        const title = `${job.title ?? "Job"} — Trovaar`;
        const description = (job.description ?? "").slice(0, 160) || "View this job and submit a competitive bid on Trovaar.";
        const jobUrl = `https://trovaar.com/jobs/${id}`;
        return {
          title,
          description,
          alternates: { canonical: jobUrl },
          openGraph: {
            title,
            description,
            url: jobUrl,
            siteName: "Trovaar",
            type: "website",
          },
        };
      }
    }
  } catch {
    // fall through to default
  }

  return {
    title: "Job Details — Trovaar",
    alternates: { canonical: `https://trovaar.com/jobs/${id}` },
  };
}

export default function JobDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
