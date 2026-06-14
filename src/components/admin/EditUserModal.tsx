"use client";

import { useState } from "react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  role: "consumer" | "contractor";
}

interface Props {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditUserModal({ user, onClose, onSaved }: Props) {
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [location, setLocation] = useState((user.location as string) ?? "");
  const [role, setRole] = useState<"consumer" | "contractor">(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action: "edit_user",
          fields: { name, email, phone, location, role },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-[#0f1011] h-full shadow-2xl flex flex-col"
        style={{ width: 420 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#23252a]">
          <h2 className="text-base font-semibold text-[#d0d6e0]">Edit User</h2>
          <button
            onClick={onClose}
            className="text-[#8a8f98] hover:text-[#d0d6e0] transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2.5 bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171] rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#141516] text-[#f7f8f8] border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#141516] text-[#f7f8f8] border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1.5">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#141516] text-[#f7f8f8] border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1.5">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[#141516] text-[#f7f8f8] border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="City, State"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8f98] mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "consumer" | "contractor")}
              className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-[#141516] text-[#f7f8f8]"
            >
              <option value="consumer">Consumer</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#23252a] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-[#8a8f98] bg-[#141516] rounded-lg hover:bg-[#18191a] disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium text-white bg-[#3B82F6] rounded-lg hover:bg-[#3B82F6]/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
