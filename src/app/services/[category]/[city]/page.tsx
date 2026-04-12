import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  SEO_CATEGORIES,
  SEO_CITIES,
  getCategoryBySlug,
  getCityBySlug,
} from "@/lib/seo-data";

export const dynamicParams = true;

interface Props {
  params: Promise<{ category: string; city: string }>;
}

export async function generateStaticParams() {
  const combos: { category: string; city: string }[] = [];
  for (const cat of SEO_CATEGORIES) {
    for (const city of SEO_CITIES) {
      combos.push({ category: cat.slug, city: city.slug });
    }
  }
  return combos;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: catSlug, city: citySlug } = await params;
  const category = getCategoryBySlug(catSlug);
  const city = getCityBySlug(citySlug);
  if (!category || !city) return {};

  const title = `${category.name} Services in ${city.name}, ${city.stateAbbr} | Trovaar`;
  const description = `Find top-rated ${category.name.toLowerCase()} professionals in ${city.name}, ${city.stateAbbr}. Get competitive bids, verified reviews, and escrow protection. Post your ${category.name.toLowerCase()} job today on Trovaar.`;
  const url = `https://trovaar.com/services/${catSlug}/${citySlug}`;

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

export default async function ServiceCityPage({ params }: Props) {
  const { category: catSlug, city: citySlug } = await params;
  const category = getCategoryBySlug(catSlug);
  const city = getCityBySlug(citySlug);
  if (!category || !city) notFound();

  const cityLabel = `${city.name}, ${city.stateAbbr}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <nav className="text-sm text-blue-200 mb-6" aria-label="Breadcrumb">
            <Link href="/services" className="hover:text-white transition-colors">
              Services
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/services/${catSlug}`}
              className="hover:text-white transition-colors"
            >
              {category.name}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-white">{city.name}</span>
          </nav>
          <span className="text-5xl mb-4 block">{category.icon}</span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            {category.name} Services in {cityLabel}
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Connect with verified {category.name.toLowerCase()} professionals in{" "}
            {city.name}. Post your project, compare competitive bids, and hire
            with confidence through Trovaar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/jobs/new"
              className="inline-block bg-white text-blue-800 font-semibold px-8 py-3 rounded-lg shadow hover:bg-blue-50 transition-colors text-lg"
            >
              Post a {category.name} Job
            </Link>
            <Link
              href={`/jobs?category=${catSlug}`}
              className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg shadow hover:bg-blue-500 transition-colors border border-blue-400 text-lg"
            >
              Find {category.name} Jobs
            </Link>
          </div>
        </div>
      </section>

      {/* About This Service */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {category.name} in {city.name}
        </h2>
        <p className="text-gray-700 leading-relaxed text-lg">
          {category.description}
        </p>
        <p className="text-gray-600 leading-relaxed mt-4">
          Whether you need a quick repair or a major project in {cityLabel},
          Trovaar makes it easy to find qualified {category.name.toLowerCase()}{" "}
          professionals who are ready to compete for your business. Every
          contractor on our platform is verified, reviewed, and backed by our
          escrow payment protection.
        </p>
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
                emoji: "📋",
                title: "Post Your Job",
                desc: `Describe your ${category.name.toLowerCase()} project in ${city.name}, upload photos, and set your budget. It takes less than 2 minutes.`,
              },
              {
                step: "2",
                emoji: "💰",
                title: "Get Competitive Bids",
                desc: `Verified ${category.name.toLowerCase()} pros in ${city.name} see your job and submit real bids. Compare prices, reviews, and qualifications.`,
              },
              {
                step: "3",
                emoji: "🤝",
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
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/jobs/new"
              className="inline-block bg-blue-800 text-white font-semibold px-10 py-3 rounded-lg shadow hover:bg-blue-700 transition-colors text-lg"
            >
              Get Started — It&apos;s Free
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="bg-gray-50 py-16 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
            Why {city.name} Homeowners Trust Trovaar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                icon: "🔒",
                title: "Escrow Protection",
                desc: "Your payment is held securely and only released when the job is completed to your satisfaction. No more paying upfront and hoping for the best.",
              },
              {
                icon: "✅",
                title: "Verified Contractors",
                desc: `Every ${category.name.toLowerCase()} pro in ${city.name} is background-checked with verified licenses, insurance, and real customer reviews.`,
              },
              {
                icon: "⭐",
                title: "Resolution Guarantee",
                desc: "Every dispute gets a fair resolution. 48-hour escrow review window, re-service matching, and admin mediation — no one gets stuck.",
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
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.desc}
                </p>
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
              {category.name} FAQ for {city.name} Homeowners
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

      {/* Browse Other Cities */}
      <section className="bg-gray-50 py-16 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {category.name} Services in Other Cities
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {SEO_CITIES.filter((c) => c.slug !== citySlug).map((c) => (
              <Link
                key={c.slug}
                href={`/services/${catSlug}/${c.slug}`}
                className="text-sm bg-white border border-gray-200 rounded-full px-4 py-2 text-gray-700 hover:border-blue-300 hover:text-blue-800 hover:shadow-sm transition-all duration-200"
              >
                {c.name}, {c.stateAbbr}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-blue-800 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to Hire a {category.name} Pro in {city.name}?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Post your job for free and start receiving competitive bids from
            verified local professionals today.
          </p>
          <Link
            href="/jobs/new"
            className="inline-block bg-white text-blue-800 font-semibold px-10 py-4 rounded-lg shadow hover:bg-blue-50 transition-colors text-lg"
          >
            Post Your {category.name} Job Now
          </Link>
        </div>
      </section>

      {/* Schema.org LocalBusiness */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: `Trovaar ${category.name} Services in ${city.name}`,
            description: `Find verified ${category.name.toLowerCase()} professionals in ${cityLabel}. Get competitive bids and hire with escrow protection on Trovaar.`,
            url: `https://trovaar.com/services/${catSlug}/${citySlug}`,
            areaServed: {
              "@type": "City",
              name: city.name,
              containedInPlace: {
                "@type": "State",
                name: city.state,
              },
            },
            provider: {
              "@type": "Organization",
              name: "Trovaar",
              url: "https://trovaar.com",
            },
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
            name: `${category.name} Services in ${cityLabel}`,
            description: category.description,
            provider: {
              "@type": "Organization",
              name: "Trovaar",
              url: "https://trovaar.com",
            },
            areaServed: {
              "@type": "City",
              name: city.name,
              containedInPlace: {
                "@type": "State",
                name: city.state,
              },
            },
            serviceType: category.name,
          }),
        }}
      />

      {/* Schema.org FAQPage */}
      {category.faqs.length > 0 && (
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
      )}

      {/* Schema.org BreadcrumbList */}
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
                item: `https://trovaar.com/services/${catSlug}`,
              },
              {
                "@type": "ListItem",
                position: 4,
                name: city.name,
                item: `https://trovaar.com/services/${catSlug}/${citySlug}`,
              },
            ],
          }),
        }}
      />
    </div>
  );
}
