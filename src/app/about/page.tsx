import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "About Trovaar — Stop searching, start finding.",
  description: "Trovaar connects homeowners and businesses with skilled local contractors through competitive bidding, secure escrow payments, and transparent reviews.",
};

export default function AboutPage() {
  return (
    <main id="main-content">
      {/* Hero */}
      <section
        className="relative bg-secondary overflow-hidden py-20 px-4"
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image src="/trovaar-icon.png" alt="Trovaar" width={48} height={48} />
            <span className="text-2xl font-bold text-white">Trovaar</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-white mb-4">
            The network that connects{" "}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #60a5fa, #818cf8)" }}>
              every skilled trade
            </span>{" "}
            to every job.
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            We built Trovaar because finding a reliable contractor shouldn&apos;t feel like a gamble. Post your job, receive competitive bids, and hire with confidence — all in one place.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-secondary mb-4">Our Mission</h2>
              <p className="text-muted leading-relaxed mb-4">
                Trovaar is a two-sided marketplace connecting homeowners and businesses with skilled local contractors. We believe every job deserves a fair price and every contractor deserves a steady stream of work.
              </p>
              <p className="text-muted leading-relaxed">
                By bringing competition and transparency to home services, we eliminate price gouging, cut out middlemen, and put both parties in control.
              </p>
            </div>
            <div className="bg-surface rounded-2xl p-8 space-y-4">
              {[
                { icon: "📸", title: "Snap & Post", desc: "Describe your job, add photos — takes 2 minutes." },
                { icon: "🏷️", title: "Competitive Bids", desc: "Local pros compete on price and availability." },
                { icon: "🔒", title: "Secure Escrow", desc: "Funds held safely until the job is done right." },
                { icon: "⭐", title: "Verified Reviews", desc: "Real feedback from real homeowners." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-secondary">{item.title}</p>
                    <p className="text-sm text-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-secondary text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Built for the real world</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "2-min", label: "Average job post time" },
              { value: "3+", label: "Bids per job on average" },
              { value: "0%", label: "Lead-gen fees for contractors" },
              { value: "100%", label: "Escrow-protected payments" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-black text-primary mb-1">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For both sides */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-secondary text-center mb-12">Built for everyone</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="border border-border rounded-2xl p-8">
              <h3 className="text-xl font-bold text-secondary mb-3">For Homeowners & Businesses</h3>
              <ul className="space-y-3 text-muted text-sm">
                {[
                  "Post any job in minutes — plumbing, electrical, landscaping & more",
                  "Receive multiple bids so you can compare price vs. speed",
                  "Chat directly with contractors before committing",
                  "Pay securely through escrow — released only when you're satisfied",
                  "Leave reviews to help your community",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?role=consumer"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
              >
                Post your first job →
              </Link>
            </div>
            <div className="border border-border rounded-2xl p-8">
              <h3 className="text-xl font-bold text-secondary mb-3">For Contractors & Tradespeople</h3>
              <ul className="space-y-3 text-muted text-sm">
                {[
                  "Browse jobs in your area and only bid on what you want",
                  "No monthly fees, no lead-generation costs",
                  "Build your reputation with verified reviews",
                  "Get paid quickly through our secure payment system",
                  "Set your own rates — you're in control",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup?role=contractor"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
              >
                Join as a contractor →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary/5 py-16 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-secondary mb-4">Ready to get started?</h2>
          <p className="text-muted mb-8">Join thousands of homeowners and contractors already using Trovaar.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
            >
              Create a free account
            </Link>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-border bg-white text-secondary font-semibold hover:border-primary/40 transition-colors"
            >
              Browse open jobs
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted">
            Questions?{" "}
            <a href="mailto:support@trovaar.com" className="text-primary hover:underline">
              support@trovaar.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
