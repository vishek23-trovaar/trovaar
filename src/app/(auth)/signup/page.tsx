"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { UserRole } from "@/types";
import { dashboardPath } from "@/lib/portalRoutes";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

// ── Password strength logic ──────────────────────────────────────────────────

type StrengthLevel = "weak" | "fair" | "good" | "strong";

function getPasswordStrength(pw: string): { level: StrengthLevel; label: string; color: string; width: string } {
  if (pw.length === 0) return { level: "weak", label: "", color: "", width: "0%" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasMixed = (hasUpper && hasLower) || (hasLower && hasDigit) || (hasUpper && hasDigit);

  if (pw.length >= 12 && hasMixed) {
    return { level: "strong", label: "Strong", color: "bg-green-500", width: "100%" };
  }
  if (pw.length >= 8 && hasMixed) {
    return { level: "good", label: "Good", color: "bg-blue-500", width: "75%" };
  }
  if (pw.length >= 8) {
    return { level: "fair", label: "Fair", color: "bg-amber-500", width: "50%" };
  }
  return { level: "weak", label: "Weak", color: "bg-red-500", width: "25%" };
}

// ────────────────────────────────────────────────────────────────────────────

function SignupForm() {
  const searchParams = useSearchParams();
  const rawRole = searchParams.get("role");
  const initialRole: UserRole = rawRole === "contractor" ? "contractor" : "consumer";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [location, setLocation] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const { signup, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(dashboardPath(user.role));
    }
  }, [user, authLoading, router]);

  const strength = getPasswordStrength(password);

  async function detectLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported by your browser");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en-US,en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.county ||
              "";
            const state = data.address?.state || "";
            if (city && state) {
              setLocation(`${city}, ${state}`);
            } else if (state) {
              setLocation(state);
            } else {
              setGeoError("Could not determine city/state from your location");
            }
          } else {
            setGeoError("Could not look up your location");
          }
        } catch {
          setGeoError("Could not determine your location");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoError("Location access denied — please type your city manually");
        setGeoLoading(false);
      },
      { timeout: 8000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!ageConfirmed) {
      setError("You must confirm you are 18 years of age or older.");
      return;
    }

    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      setError("Please enter a valid phone number.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await signup({ name, email, password, role, location, phone: phone.trim(), referralCode: referralCode.trim() || undefined });
      router.push(dashboardPath(role));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  // Don't render the form while checking auth or redirecting
  if (authLoading || user) return null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-secondary">Create Your Account</h1>
          <p className="text-muted mt-2">Join Trovaar today</p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <a href={`/api/auth/oauth/google/start?role=${role}`} className="block">
            <Button type="button" variant="outline" className="w-full justify-center">
              <GoogleIcon /> Continue with Google
            </Button>
          </a>
          <a href={`/api/auth/oauth/apple/start?role=${role}`} className="block">
            <Button type="button" variant="outline" className="w-full justify-center">
              <AppleIcon /> Continue with Apple
            </Button>
          </a>
          <a href={`/api/auth/oauth/facebook/start?role=${role}`} className="block">
            <Button type="button" variant="outline" className="w-full justify-center">
              <FacebookIcon /> Continue with Facebook
            </Button>
          </a>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-muted">or sign up with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" aria-live="polite" className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>
          )}

          {/* Role Selector */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("consumer")}
                className={`p-4 rounded-lg border-2 text-center transition-all cursor-pointer ${
                  role === "consumer"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted hover:border-primary/30"
                }`}
              >
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="font-semibold text-sm">Consumer</p>
                <p className="text-xs mt-1 opacity-70">I need work done</p>
              </button>
              <button
                type="button"
                onClick={() => setRole("contractor")}
                className={`p-4 rounded-lg border-2 text-center transition-all cursor-pointer ${
                  role === "contractor"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted hover:border-primary/30"
                }`}
              >
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="font-semibold text-sm">Contractor</p>
                <p className="text-xs mt-1 opacity-70">I do the work</p>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            required
          />

          {/* Email */}
          <Input
            id="email"
            name="email"
            autoComplete="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          {/* Phone Number */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-secondary mb-1.5">
              Phone Number <span className="text-danger">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              autoComplete="tel"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted transition-colors duration-200"
            />
            <p className="text-xs text-muted mt-1">Used to verify your identity and generate your account number.</p>
          </div>

          {/* Password with visibility toggle + strength indicator */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-secondary mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
                className="w-full px-4 py-2.5 pr-11 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted transition-colors duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength bar */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>
                <p className={`text-xs mt-1 font-medium ${
                  strength.level === "strong" ? "text-green-600" :
                  strength.level === "good" ? "text-blue-600" :
                  strength.level === "fair" ? "text-amber-600" :
                  "text-red-600"
                }`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                className={`w-full px-4 py-2.5 pr-11 rounded-lg border focus:outline-none focus:ring-2 bg-white text-secondary placeholder-muted transition-colors duration-200 ${
                  confirmPassword && password !== confirmPassword
                    ? "border-danger focus:ring-danger/20"
                    : "border-border focus:ring-primary/20 focus:border-primary"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-danger mt-1">Passwords do not match.</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-secondary mb-1.5">
              {role === "consumer" ? "Home / Service Address" : "Primary Service Area"}
            </label>
            <div className="flex gap-2">
              <input
                id="address"
                name="address"
                autoComplete="street-address"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={role === "consumer" ? "123 Main St, Atlanta, GA 30301" : "Atlanta, GA"}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={detectLocation}
                disabled={geoLoading}
                title="Detect my location"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-surface text-sm font-medium text-secondary hover:bg-surface-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {geoLoading ? (
                  <span className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full inline-block" />
                ) : (
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                📍 Detect
              </button>
            </div>
            {geoError && <p className="text-xs text-danger mt-1">{geoError}</p>}
            <p className="text-xs text-muted mt-1">
              {role === "consumer"
                ? "Used to match you with nearby contractors. Street address stays private until you accept a bid."
                : "Used to surface relevant jobs near you. Only your general area is shown publicly."}
            </p>
          </div>

          <Input
            label="Referral Code (optional)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder="e.g. A3F92B1CJO"
            maxLength={12}
          />

          {/* Age 18+ acknowledgment */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              required
              className="w-4 h-4 mt-0.5 rounded border-border text-primary flex-shrink-0"
            />
            <span className="text-sm text-muted leading-relaxed">
              I confirm I am <span className="font-semibold text-secondary">18 years of age or older</span>.
              Users must be 18+ to schedule contractors to visit their property.
            </span>
          </label>

          <Button type="submit" loading={loading} className="w-full">
            Create Account
          </Button>

          <p className="text-xs text-center text-muted mt-3 leading-relaxed">
            By creating an account, you agree to our{" "}
            <Link href="/legal/terms" className="text-primary hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
