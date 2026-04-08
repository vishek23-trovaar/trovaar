import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/contractor/dashboard",
        "/client/dashboard",
        "/dashboard/",
        "/onboarding/",
        "/setup-admin",
      ],
    },
    sitemap: "https://trovaar.com/sitemap.xml",
  };
}
