"use client";

import { use } from "react";
import { redirect } from "next/navigation";

/**
 * Public Contractor Profile — redirects to /profile/[id]
 * which is the main public-facing profile page with full trust data.
 */
export default function ContractorPublicProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  redirect(`/profile/${id}`);
}
