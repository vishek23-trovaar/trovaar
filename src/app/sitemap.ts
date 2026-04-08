import { MetadataRoute } from "next";
import { SEO_CATEGORIES, SEO_CITIES } from "@/lib/seo-data";

const BASE_URL = "https://trovaar.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/services`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/jobs`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/jobs/new`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/legal/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${BASE_URL}/legal/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];

  // Category pages: /services/[category]
  const categoryPages: MetadataRoute.Sitemap = SEO_CATEGORIES.map((cat) => ({
    url: `${BASE_URL}/services/${cat.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Service + City pages: /services/[category]/[city]
  const serviceCityPages: MetadataRoute.Sitemap = SEO_CATEGORIES.flatMap(
    (cat) =>
      SEO_CITIES.map((city) => ({
        url: `${BASE_URL}/services/${cat.slug}/${city.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }))
  );

  return [...staticPages, ...categoryPages, ...serviceCityPages];
}
