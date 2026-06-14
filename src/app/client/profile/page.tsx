"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import PhoneVerifyWidget from "@/components/auth/PhoneVerifyWidget";
import ScrollReveal from "@/components/ui/ScrollReveal";
import PageHero from "@/components/ui/PageHero";

interface ClientStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  totalSpent: number;
}

export default function ClientProfilePage() {
  const { user, refreshUser, logout } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [stats, setStats] = useState<ClientStats>({ totalJobs: 0, activeJobs: 0, completedJobs: 0, totalSpent: 0 });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsMsg, setSmsMsg] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone((user as unknown as { phone?: string }).phone || "");
      setLocation((user as unknown as { location?: string }).location || "");
    }
  }, [user]);

  useEffect(() => {
    fetch("/api/user/phone")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setSmsAlertsEnabled(!!data.sms_alerts_enabled);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/jobs?mine=true")
      .then(r => r.json())
      .then(data => {
        const jobs = data.jobs || [];
        setStats({
          totalJobs: jobs.length,
          activeJobs: jobs.filter((j: { status: string }) => ["posted", "bidding", "accepted"].includes(j.status)).length,
          completedJobs: jobs.filter((j: { status: string }) => j.status === "completed").length,
          totalSpent: jobs
            .filter((j: { status: string; accepted_bid_price?: number }) => j.status === "completed" && j.accepted_bid_price)
            .reduce((sum: number, j: { accepted_bid_price?: number }) => sum + (j.accepted_bid_price || 0), 0),
        });
      })
      .catch(() => {});
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, location }),
      });
      if (res.ok) {
        setSaveMsg("✅ Profile updated");
        await refreshUser(); // pull account_number + any other changes into context
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveMsg(`❌ ${(data as { error?: string }).error ?? "Failed to save"}`);
      }
    } catch {
      setSaveMsg("❌ Something went wrong");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  }

  async function toggleSmsAlerts() {
    setSmsLoading(true);
    setSmsMsg("");
    try {
      const newValue = !smsAlertsEnabled;
      // If enabling and no phone number saved, warn the user
      if (newValue && !phone.trim()) {
        setSmsMsg("Please add a phone number first, then save your profile.");
        setSmsLoading(false);
        return;
      }
      const res = await fetch("/api/user/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sms_alerts_enabled: newValue, phone_number: phone.trim() || undefined }),
      });
      if (res.ok) {
        setSmsAlertsEnabled(newValue);
        setSmsMsg(newValue ? "SMS bid alerts enabled" : "SMS bid alerts disabled");
      } else {
        setSmsMsg("Failed to update SMS preferences");
      }
    } catch {
      setSmsMsg("Something went wrong");
    } finally {
      setSmsLoading(false);
      setTimeout(() => setSmsMsg(""), 4000);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwMsg("❌ Passwords don't match"); return; }
    if (newPassword.length < 8) { setPwMsg("❌ Password must be at least 8 characters"); return; }
    setPwSaving(true);
    setPwMsg("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg("✅ Password changed successfully");
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        setPwMsg(`❌ ${data.error || "Failed to change password"}`);
      }
    } catch {
      setPwMsg("❌ Something went wrong");
    } finally {
      setPwSaving(false);
      setTimeout(() => setPwMsg(""), 4000);
    }
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        // logout clears user state and redirects to /
        await logout();
      } else {
        alert(data.error || "Failed to delete account");
        setShowDeleteConfirm(false);
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setDeletingAccount(false);
    }
  }

  if (!user) return null;

  const memberSince = (user as unknown as { created_at?: string }).created_at
    ? new Date((user as unknown as { created_at: string }).created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      <PageHero
        title="My Profile"
        subtitle={`${user.name} · ${user.email}${memberSince ? ` · Member since ${memberSince}` : ""}`}
      />

      {/* Phone verification prompt (compact) */}
      <PhoneVerifyWidget compact />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Jobs Posted", value: stats.totalJobs, color: "text-[#60A5FA]", bg: "bg-[#3B82F6]/10" },
          { label: "Active", value: stats.activeJobs, color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10" },
          { label: "Completed", value: stats.completedJobs, color: "text-[#34d399]", bg: "bg-[#27a644]/10" },
          { label: "Total Spent", value: `$${stats.totalSpent.toFixed(0)}`, color: "text-[#c4b5fd]", bg: "bg-[#a78bfa]/10" },
        ].map((s, i) => (
          <ScrollReveal key={s.label} delay={i * 80}>
            <div className={`${s.bg} rounded-2xl p-4 shadow-sm border border-[#23252a] backdrop-blur-sm text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-[#8a8f98] mt-1">{s.label}</div>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* Personal Info */}
      <ScrollReveal delay={100}>
      <div className="bg-[#0f1011] rounded-2xl shadow-sm border border-[#23252a] p-6 hover:shadow-md transition-all duration-300">
        <h2 className="text-lg font-semibold text-[#f7f8f8] mb-4">Personal Information</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Full Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Email</label>
              <input
                value={user.email}
                disabled
                className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm bg-[#010102] text-[#8a8f98] cursor-not-allowed"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-[#d0d6e0]">Phone Number</label>
                {user.phone_verified
                  ? <span className="text-xs font-semibold text-[#34d399]">✓ Verified</span>
                  : user.phone
                  ? <span className="text-xs font-medium text-[#fbbf24]">⚠ Not verified</span>
                  : null}
              </div>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="+1 (555) 000-0000"
                type="tel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Home / Service Address</label>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="City, State"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {saveMsg && <span className="text-sm">{saveMsg}</span>}
          </div>
        </form>
      </div>
      </ScrollReveal>

      {/* SMS Bid Alerts */}
      <ScrollReveal delay={150}>
      <div className="bg-[#0f1011] rounded-2xl shadow-sm border border-[#23252a] p-6 hover:shadow-md transition-all duration-300">
        <h2 className="text-lg font-semibold text-[#f7f8f8] mb-1">SMS Bid Alerts</h2>
        <p className="text-sm text-[#8a8f98] mb-4">
          Get a text message on your phone whenever a contractor submits a new bid on one of your jobs.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={smsAlertsEnabled}
              disabled={smsLoading}
              onClick={toggleSmsAlerts}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 ${
                smsAlertsEnabled ? "bg-emerald-500" : "bg-[#18191a]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  smsAlertsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-[#d0d6e0]">
              {smsAlertsEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          {smsMsg && <span className="text-sm text-[#8a8f98]">{smsMsg}</span>}
        </div>
        {smsAlertsEnabled && !phone.trim() && (
          <p className="mt-3 text-xs text-[#fbbf24] font-medium">
            Add a phone number above and save your profile to receive SMS alerts.
          </p>
        )}
      </div>
      </ScrollReveal>

      {/* Account Security */}
      <ScrollReveal delay={200}>
      <div className="bg-[#0f1011] rounded-2xl shadow-sm border border-[#23252a] p-6 hover:shadow-md transition-all duration-300">
        <h2 className="text-lg font-semibold text-[#f7f8f8] mb-1">Account Security</h2>
        <p className="text-sm text-[#8a8f98] mb-4">Change your password. You&apos;ll need your current password to update it.</p>
        <form onSubmit={changePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#d0d6e0] mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-[#141516] border border-[#23252a] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pwSaving}
              className="px-5 py-2 bg-[#141516] border border-[#23252a] text-[#f7f8f8] text-sm font-medium rounded-lg hover:bg-[#18191a] transition-colors disabled:opacity-50"
            >
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
            {pwMsg && <span className="text-sm">{pwMsg}</span>}
          </div>
        </form>
      </div>
      </ScrollReveal>

      {/* Account Info */}
      <ScrollReveal delay={250}>
      <div className="bg-[#0f1011] rounded-2xl shadow-sm border border-[#23252a] p-6 hover:shadow-md transition-all duration-300">
        <h2 className="text-lg font-semibold text-[#f7f8f8] mb-4">Account Details</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-[#23252a]">
            <span className="text-[#8a8f98]">Account Number</span>
            {user.account_number ? (
              <span className="text-[#f7f8f8] font-mono font-semibold tracking-wide">
                {user.account_number}
              </span>
            ) : (
              <span className="text-[#fbbf24] text-xs font-medium">
                ⚠ Add your phone number to activate
              </span>
            )}
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#23252a]">
            <span className="text-[#8a8f98]">Member Since</span>
            <span className="text-[#d0d6e0]">{memberSince}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#23252a]">
            <span className="text-[#8a8f98]">Email Verified</span>
            <span className={`font-medium ${(user as unknown as { email_verified?: number }).email_verified ? "text-[#34d399]" : "text-[#fbbf24]"}`}>
              {(user as unknown as { email_verified?: number }).email_verified ? "✓ Verified" : "⚠ Not Verified"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-[#8a8f98]">Account Type</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#27a644]/10 text-[#34d399]">Client</span>
          </div>
        </div>
      </div>
      </ScrollReveal>

      {/* Danger Zone */}
      <ScrollReveal delay={300}>
      <div className="bg-[#0f1011] rounded-2xl shadow-sm border border-[#f87171]/30 p-6">
        <h2 className="text-lg font-semibold text-[#f87171] mb-1">Danger Zone</h2>
        <p className="text-sm text-[#8a8f98] mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-5 py-2 border border-[#f87171]/30 text-[#f87171] text-sm font-medium rounded-lg hover:bg-[#f87171]/10 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[#f87171]">Are you sure? This will permanently delete your account and all your data.</p>
            <div className="flex gap-3">
              <button
                onClick={deleteAccount}
                disabled={deletingAccount}
                className="px-5 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingAccount ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-5 py-2 border border-[#23252a] text-[#8a8f98] text-sm font-medium rounded-lg hover:bg-[#141516] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      </ScrollReveal>

    </div>
  );
}
