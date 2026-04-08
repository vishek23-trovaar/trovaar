"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface Referral {
  id: string;
  name: string;
  joinedAt: string;
  completedFirstJob: boolean;
  rewardStatus: string;
}

interface ReferralData {
  referralCode: string;
  creditBalanceCents: number;
  totalReferred: number;
  totalEarnedCents: number;
  pendingRewardsCents: number;
  referrals: Referral[];
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchReferralData();
  }, [user]);

  async function fetchReferralData() {
    try {
      const res = await fetch("/api/referrals");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch referral data:", err);
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (!data?.referralCode) return;
    navigator.clipboard.writeText(data.referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyLink() {
    if (!data?.referralCode) return;
    const link = `${window.location.origin}/login?ref=${data.referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Please log in to view your referral program.</p>
        <Link href="/login" className="text-blue-600 hover:underline mt-2 inline-block">Log in</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const shareLink = data?.referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/login?ref=${data.referralCode}`
    : "";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Referral Program</h1>
        <p className="text-gray-500 text-sm mt-1">
          Invite friends and earn rewards when they join Trovaar
        </p>
      </div>

      {/* Reward Structure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
          <div className="text-3xl mb-2">🎁</div>
          <h3 className="font-bold text-indigo-900 text-lg">You Earn $25</h3>
          <p className="text-sm text-indigo-700 mt-1">
            When your referred friend completes their first job on Trovaar
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5">
          <div className="text-3xl mb-2">🤝</div>
          <h3 className="font-bold text-emerald-900 text-lg">They Get $10</h3>
          <p className="text-sm text-emerald-700 mt-1">
            Your friend gets a $10 credit applied to their account immediately upon signup
          </p>
        </div>
      </div>

      {/* Referral Code Card */}
      {data?.referralCode && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-4">Your Referral Code</h2>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 font-mono text-lg font-bold text-gray-900 tracking-wider text-center">
              {data.referralCode}
            </div>
            <button
              onClick={copyCode}
              className="px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer flex-shrink-0"
            >
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>

          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Share Link</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-mono truncate"
              />
              <button
                onClick={copyLink}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex-shrink-0"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xl font-bold text-indigo-600">{data?.totalReferred ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Total Invited</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xl font-bold text-blue-600">
            {data?.referrals?.filter((r) => r.completedFirstJob).length ?? 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Completed 1st Job</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xl font-bold text-green-600">
            ${((data?.totalEarnedCents ?? 0) / 100).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total Earned</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-xl font-bold text-amber-600">
            ${((data?.pendingRewardsCents ?? 0) / 100).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Pending Rewards</p>
        </div>
      </div>

      {/* Credit Balance */}
      {data && data.creditBalanceCents > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5 mb-8 flex items-center gap-3">
          <span className="text-xl">💰</span>
          <p className="text-sm text-emerald-800 font-medium">
            Your current credit balance:{" "}
            <strong>${(data.creditBalanceCents / 100).toFixed(2)}</strong>
          </p>
        </div>
      )}

      {/* Referral List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Your Referrals</h2>
        </div>

        {!data?.referrals?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📨</div>
            <p className="font-semibold text-gray-800">No referrals yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Share your code with friends to start earning rewards
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.referrals.map((referral) => (
              <div key={referral.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{referral.name}</p>
                  <p className="text-xs text-gray-400">
                    Joined {new Date(referral.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  {referral.rewardStatus === "credited" ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      $25 Credited
                    </span>
                  ) : referral.completedFirstJob ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Completed 1st Job
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="mt-8 bg-gray-50 rounded-xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">How It Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold flex-shrink-0">1</span>
            <div>
              <p className="font-medium text-gray-800 text-sm">Share your code</p>
              <p className="text-xs text-gray-500 mt-0.5">Send your unique referral code or link to friends</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold flex-shrink-0">2</span>
            <div>
              <p className="font-medium text-gray-800 text-sm">They sign up</p>
              <p className="text-xs text-gray-500 mt-0.5">Your friend creates an account with your code and gets $10</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold flex-shrink-0">3</span>
            <div>
              <p className="font-medium text-gray-800 text-sm">You earn $25</p>
              <p className="text-xs text-gray-500 mt-0.5">When they complete their first job, you get $25 credited</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
