import type { Metadata } from "next";
import Link from "next/link";
import { SEO_CATEGORIES } from "@/lib/seo-data";

export const metadata: Metadata = {
  title: "Home Services Near You | Trovaar",
  description:
    "Browse all service categories on Trovaar. Find and hire verified local professionals for plumbing, electrical, HVAC, painting, carpentry, roofing, landscaping, cleaning, and more.",
  alternates: { canonical: "https://trovaar.com/services" },
  openGraph: {
    title: "Home Services Near You | Trovaar",
    description:
      "Browse all service categories and find verified local contractors. Post a job and get competitive bids today.",
    url: "https://trovaar.com/services",
    siteName: "Trovaar",
    type: "website",
  },
};

export default function ServicesIndexPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Find Trusted Pros for Every Job
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            Browse service categories below, post your project, and receive
            competitive bids from verified local contractors.
          </p>
          <Link
            href="/jobs/new"
            className="inline-block bg-white text-blue-800 font-semibold px-8 py-3 rounded-lg shadow hover:bg-blue-50 transition-colors"
          >
            Post a Job Now
          </Link>
        </div>
      </section>

      {/* Category Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
          All Service Categories
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {SEO_CATEGORIES.map((cat, i) => (
            <Link
              key={cat.slug}
              href={`/services/${cat.slug}`}
              className="group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-300 transition-all duration-300"
              style={{ animation: `fadeInUp 0.5s ease-out ${Math.min(i * 0.05, 0.4)}s both` }}
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">{cat.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-800 transition-colors">
                {cat.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{cat.shortDescription}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-20 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-12 text-center">
            How Trovaar Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Post Your Job",
                desc: "Describe your project, upload photos, and set your budget. It takes less than 2 minutes.",
              },
              {
                step: "2",
                title: "Get Competitive Bids",
                desc: "Verified local pros see your job and submit real bids. Compare prices, reviews, and qualifications.",
              },
              {
                step: "3",
                title: "Hire the Best Pro",
                desc: "Choose the pro that fits your budget and timeline. Pay securely through Trovaar escrow protection.",
              },
            ].map((item, i) => (
              <div key={item.step} className="text-center p-6 rounded-2xl hover:bg-blue-50/50 transition-colors duration-300" style={{ animation: `fadeInUp 0.5s ease-out ${i * 0.15}s both` }}>
                <div className="w-14 h-14 bg-blue-800 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-md">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="bg-gray-50 py-20 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-12 text-center">
            Why Homeowners Trust Trovaar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                title: "Escrow Protection",
                desc: "Your payment is held securely and only released when the job is completed to your satisfaction.",
              },
              {
                title: "Verified Contractors",
                desc: "Every pro is background-checked with verified licenses, insurance, and real customer reviews.",
              },
              {
                title: "Resolution Guarantee",
                desc: "Every dispute gets a fair resolution. 48-hour escrow review, re-service matching, and admin mediation.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
