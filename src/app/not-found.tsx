import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <Image src="/trovaar-icon.png" alt="Trovaar" width={40} height={40} className="rounded-xl" />
          <span className="text-xl font-bold text-secondary">Trovaar</span>
        </Link>

        {/* 404 display */}
        <div className="mb-6">
          <p className="text-8xl font-black text-primary/20 leading-none select-none">404</p>
        </div>

        <h1 className="text-2xl font-bold text-secondary mb-3">Page Not Found</h1>
        <p className="text-muted mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go Home
          </Link>
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-border bg-white text-secondary text-sm font-semibold hover:border-primary/40 hover:bg-surface transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Browse Jobs
          </Link>
        </div>

        {/* Help link */}
        <p className="mt-8 text-sm text-muted">
          Need help?{" "}
          <Link href="/client/dashboard" className="text-primary hover:underline font-medium">
            Go to your dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
