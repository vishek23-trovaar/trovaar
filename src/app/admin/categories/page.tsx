"use client";

import { useState, useEffect, useCallback } from "react";

interface AdminCategory {
  value: string;
  label: string;
  group_label: string;
  icon: string;
  active: number;
  sort_order: number;
  job_count: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [msg, setMsg] = useState({ text: "", type: "success" as "success" | "error" });

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [newIcon, setNewIcon] = useState("🔧");
  const [adding, setAdding] = useState(false);

  // Edit inline
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIcon, setEditIcon] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories ?? []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  function showMsg(text: string, type: "success" | "error" = "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "success" }), 3500);
  }

  async function toggleActive(cat: AdminCategory) {
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: cat.value, active: !cat.active }),
    });
    if (res.ok) {
      setCategories((prev) => prev.map((c) => c.value === cat.value ? { ...c, active: cat.active ? 0 : 1 } : c));
      showMsg(`"${cat.label}" ${cat.active ? "deactivated" : "activated"}`);
    } else {
      const d = await res.json();
      showMsg(d.error ?? "Failed", "error");
    }
  }

  async function saveEdit(value: string) {
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, label: editLabel, icon: editIcon }),
    });
    if (res.ok) {
      setCategories((prev) => prev.map((c) => c.value === value ? { ...c, label: editLabel, icon: editIcon } : c));
      setEditingValue(null);
      showMsg("Category updated");
    } else {
      const d = await res.json();
      showMsg(d.error ?? "Failed", "error");
    }
  }

  async function deleteCategory(cat: AdminCategory) {
    if (!confirm(`Delete "${cat.label}"? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: cat.value }),
    });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.value !== cat.value));
      showMsg(`"${cat.label}" deleted`);
    } else {
      const d = await res.json();
      showMsg(d.error ?? "Cannot delete", "error");
    }
  }

  async function addCategory() {
    if (!newValue || !newLabel || !newGroup) {
      showMsg("Value, label, and group are required", "error"); return;
    }
    setAdding(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newValue, label: newLabel, group_label: newGroup, icon: newIcon }),
    });
    const data = await res.json();
    if (res.ok) {
      showMsg(`"${newLabel}" added`);
      setNewValue(""); setNewLabel(""); setNewGroup(""); setNewIcon("🔧");
      setShowAdd(false);
      fetchCategories();
    } else {
      showMsg(data.error ?? "Failed to add", "error");
    }
    setAdding(false);
  }

  const filtered = categories.filter((c) => {
    const matchSearch = !search || c.label.toLowerCase().includes(search.toLowerCase()) || c.value.includes(search.toLowerCase()) || c.group_label.toLowerCase().includes(search.toLowerCase());
    const matchActive = filterActive === "all" || (filterActive === "active" ? !!c.active : !c.active);
    return matchSearch && matchActive;
  });

  // Group for display
  const groups = Array.from(new Set(filtered.map((c) => c.group_label)));

  const activeCount = categories.filter((c) => c.active).length;
  const inactiveCount = categories.filter((c) => !c.active).length;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categories</h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeCount} active · {inactiveCount} inactive · {categories.length} total
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
        >
          + Add Category
        </button>
      </div>

      {/* Message */}
      {msg.text && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">New Category</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Value (unique key) *</label>
              <input value={newValue} onChange={(e) => setNewValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="e.g. solar_install" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono" />
              <p className="text-xs text-slate-400 mt-0.5">Lowercase letters, digits, underscores only</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Display Label *</label>
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Solar Panel Installation" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Group *</label>
              <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)}
                placeholder="e.g. Home Services" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Icon (emoji)</label>
              <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)}
                placeholder="🔧" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" maxLength={4} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addCategory} disabled={adding} className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors cursor-pointer">
              {adding ? "Adding…" : "Add Category"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 shadow-sm flex flex-col sm:flex-row gap-3">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories…"
          className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <div className="flex gap-1">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button key={f} onClick={() => setFilterActive(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors cursor-pointer ${filterActive === f ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Categories grouped */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-700 rounded-full" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No categories found.</div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const groupCats = filtered.filter((c) => c.group_label === group);
            const groupIcon = groupCats[0]?.icon ?? "🔧";
            return (
              <div key={group} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <span>{groupIcon}</span>
                  <span className="font-semibold text-slate-700 text-sm">{group}</span>
                  <span className="text-xs text-slate-400">({groupCats.length})</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {groupCats.map((cat) => (
                    <div key={cat.value} className={`flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors ${!cat.active ? "opacity-50" : ""}`}>
                      {/* Icon + names */}
                      {editingValue === cat.value ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="w-12 border border-slate-200 rounded px-2 py-1 text-sm text-center" maxLength={4} />
                          <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                          <button onClick={() => saveEdit(cat.value)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">Save</button>
                          <button onClick={() => setEditingValue(null)} className="px-3 py-1.5 text-slate-500 text-xs rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-base shrink-0">{cat.icon}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{cat.label}</p>
                            <p className="text-xs text-slate-400 font-mono">{cat.value}</p>
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      {editingValue !== cat.value && (
                        <>
                          <span className="text-xs text-slate-400 shrink-0">{cat.job_count} jobs</span>

                          {/* Active toggle */}
                          <button
                            onClick={() => toggleActive(cat)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${cat.active ? "bg-emerald-500" : "bg-slate-300"}`}
                            title={cat.active ? "Deactivate" : "Activate"}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${cat.active ? "translate-x-4" : "translate-x-1"}`} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => { setEditingValue(cat.value); setEditLabel(cat.label); setEditIcon(cat.icon); }}
                            className="text-xs text-slate-400 hover:text-blue-600 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-blue-50"
                          >
                            Edit
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => deleteCategory(cat)}
                            className="text-xs text-slate-400 hover:text-red-600 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
