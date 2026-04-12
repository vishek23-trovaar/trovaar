import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  SEO_CATEGORIES,
  SEO_CITIES,
  getCategoryBySlug,
} from "@/lib/seo-data";

export const dynamicParams = true;

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return SEO_CATEGORIES.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};

  const title = `${category.name} Services Near You | Trovaar`;
  const description = `Find verified ${category.name.toLowerCase()} professionals in your city. Compare bids, read reviews, and hire with escrow protection on Trovaar.`;
  const url = `https://trovaar.com/services/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Trovaar",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-5xl mb-4 block">{category.icon}</span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            {category.name} Services Near You
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            {category.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/jobs/new"
              className="inline-block bg-white text-blue-800 font-semibold px-8 py-3 rounded-lg shadow hover:bg-blue-50 transition-colors"
            >
              Post a {category.name} Job
            </Link>
            <Link
              href={`/jobs?category=${slug}`}
              className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg shadow hover:bg-blue-500 transition-colors border border-blue-400"
            >
              Browse {category.name} Jobs
            </Link>
          </div>
        </div>
      </section>

      {/* Cities Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Find {category.name} Pros by City
        </h2>
        <p className="text-gray-600 text-center mb-10 max-w-xl mx-auto">
          Select your city to see local {category.name.toLowerCase()}{" "}
          professionals and get competitive bids.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {SEO_CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/services/${slug}/${city.slug}`}
              className="group bg-white rounded-xl border border-gray-200 px-4 py-3 text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-300 transition-all duration-300"
            >
              <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-800 transition-colors">
                {city.name}
              </span>
              <span className="block text-xs text-gray-500">
                {city.stateAbbr}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
            How Trovaar Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Post Your Job",
                desc: `Describe your ${category.name.toLowerCase()} project, upload photos, and set your budget. It takes less than 2 minutes.`,
              },
              {
                step: "2",
                title: "Get Competitive Bids",
                desc: `Verified local ${category.name.toLowerCase()} pros see your job and submit real bids. Compare prices, reviews, and qualifications.`,
              },
              {
                step: "3",
                title: "Hire the Best Pro",
                desc: "Choose the pro that fits your budget and timeline. Pay securely through Trovaar escrow protection.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center p-6 rounded-2xl hover:bg-blue-50/50 transition-colors duration-300">
                <div className="w-14 h-14 bg-blue-800 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-md">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="bg-gray-50 py-16 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
            Why Homeowners Trust Trovaar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                icon: "🔒",
                title: "Escrow Protection",
                desc: "Your payment is held securely and only released when the job is completed to your satisfaction.",
              },
              {
                icon: "✅",
                title: "Verified Contractors",
                desc: "Every pro is background-checked with verified licenses, insurance, and real customer reviews.",
              },
              {
                icon: "⭐",
                title: "Resolution Guarantee",
                desc: "Every dispute gets a fair resolution. 48-hour escrow review, re-service matching, and admin mediation.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {category.faqs.length > 0 && (
        <section className="bg-white py-16 border-t border-gray-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {category.faqs.map((faq, i) => (
                <div key={i} className="border-b border-gray-200 pb-6 hover:pl-2 transition-all duration-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Schema.org FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: category.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      {/* Schema.org Service */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `${category.name} Services`,
            description: category.description,
            provider: {
              "@type": "Organization",
              name: "Trovaar",
              url: "https://trovaar.com",
            },
            areaServed: {
              "@type": "Country",
              name: "United States",
            },
            serviceType: category.name,
          }),
        }}
      />

      {/* Breadcrumb Navigation */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://trovaar.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Services",
                item: "https://trovaar.com/services",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: category.name,
                item: `https://trovaar.com/services/${slug}`,
              },
            ],
          }),
        }}
      />
    </div>
  );
}
