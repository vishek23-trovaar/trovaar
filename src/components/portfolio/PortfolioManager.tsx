"use client";

import { useState, useEffect } from "react";
import ImageUploader from "@/components/jobs/ImageUploader";
import { CATEGORIES } from "@/lib/constants";

interface PortfolioItem {
  id: string;
  contractor_id: string;
  category: string;
  title: string;
  description: string | null;
  before_photos: string;
  after_photos: string;
  created_at: string;
}

interface PortfolioManagerProps {
  contractorId: string;
  editable?: boolean;
}

export default function PortfolioManager({ contractorId, editable = false }: PortfolioManagerProps) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [lightboxItem, setLightboxItem] = useState<{ photos: string[]; index: number } | null>(null);

  // New item form state
  const [newCategory, setNewCategory] = useState(CATEGORIES[0].value);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractorId]);

  async function fetchItems() {
    try {
      const res = await fetch(`/api/portfolio?contractorId=${contractorId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      }
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setNewCategory(CATEGORIES[0].value);
    setNewTitle("");
    setNewDescription("");
    setBeforePhotos([]);
    setAfterPhotos([]);
    setShowForm(false);
  }

  async function handleSave() {
    if (!newTitle.trim()) {
      setSaveMsg("Please enter a title for this work.");
      return;
    }
    if (afterPhotos.length === 0) {
      setSaveMsg("Please upload at least one 'After' photo.");
      return;
    }

    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          before_photos: beforePhotos,
          after_photos: afterPhotos,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      await fetchItems();
      resetForm();
      setSaveMsg("✓ Work added to portfolio!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this item from your portfolio?")) return;
    try {
      await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  function openLightbox(photos: string[], index: number) {
    setLightboxItem({ photos, index });
  }

  // Group items by category
  const grouped = items.reduce<Record<string, PortfolioItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Add button */}
      {editable && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-secondary">Before &amp; After Portfolio</h3>
            <p className="text-xs text-muted">Showcase your best work — before &amp; after photos build trust and win bids.</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <span className="text-base leading-none">+</span> Add Work
            </button>
          )}
        </div>
      )}

      {/* Add new item form */}
      {editable && showForm && (
        <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-secondary text-sm">Add a Completed Job</h4>
            <button onClick={resetForm} className="text-muted hover:text-secondary text-lg cursor-pointer">×</button>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Category *</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Job Title *</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Complete bathroom remodel, Engine rebuild on '18 F-150"
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Description <span className="text-muted font-normal">(optional)</span></label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe the work, challenges overcome, and materials used."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-muted"
            />
          </div>

          {/* Before photos */}
          <ImageUploader
            images={beforePhotos}
            onImagesChange={setBeforePhotos}
            maxImages={4}
            label="Before Photos"
            hint="Show the original condition before your work."
          />

          {/* After photos */}
          <ImageUploader
            images={afterPhotos}
            onImagesChange={setAfterPhotos}
            maxImages={4}
            label="After Photos *"
            hint="Show your completed work — this is the money shot."
          />

          {saveMsg && (
            <p className={`text-sm ${saveMsg.startsWith("✓") ? "text-emerald-600" : "text-danger"}`}>
              {saveMsg}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving…" : "Save to Portfolio"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-secondary transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && !showForm && (
        <div className="text-center py-10 border border-dashed border-border rounded-xl">
          <p className="text-3xl mb-2">🔨</p>
          <p className="font-medium text-secondary text-sm">No portfolio items yet</p>
          {editable ? (
            <p className="text-xs text-muted mt-1">Add your first before &amp; after to start building credibility.</p>
          ) : (
            <p className="text-xs text-muted mt-1">This contractor hasn&apos;t added portfolio work yet.</p>
          )}
        </div>
      )}

      {/* Grouped portfolio items */}
      {Object.entries(grouped).map(([cat, catItems]) => {
        const catLabel = CATEGORIES.find((c) => c.value === cat)?.label || cat;
        return (
          <div key={cat}>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{catLabel}</h4>
            <div className="space-y-4">
              {catItems.map((item) => {
                const before: string[] = (() => { try { return JSON.parse(item.before_photos); } catch { return []; } })();
                const after: string[] = (() => { try { return JSON.parse(item.after_photos); } catch { return []; } })();

                return (
                  <div key={item.id} className="bg-white rounded-xl border border-border overflow-hidden">
                    {/* Title bar */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
                      <div>
                        <p className="font-semibold text-secondary text-sm">{item.title}</p>
                        {item.description && (
                          <p className="text-xs text-muted mt-0.5">{item.description}</p>
                        )}
                      </div>
                      {editable && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-xs text-muted hover:text-danger transition-colors cursor-pointer ml-4 shrink-0"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Before / After grid */}
                    <div className="grid grid-cols-2 divide-x divide-border">
                      {/* Before column */}
                      <div className="p-3">
                        <p className="text-xs font-semibold text-muted mb-2 flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold">B</span>
                          Before
                        </p>
                        {before.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            {before.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => openLightbox(before, i)}
                                className="aspect-square rounded-lg overflow-hidden cursor-zoom-in"
                              >
                                <img src={url} alt="Before" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="aspect-square rounded-lg bg-surface border border-dashed border-border flex items-center justify-center">
                            <span className="text-xs text-muted">No photo</span>
                          </div>
                        )}
                      </div>

                      {/* After column */}
                      <div className="p-3">
                        <p className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-[9px] font-bold text-emerald-700">A</span>
                          After
                        </p>
                        {after.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            {after.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => openLightbox(after, i)}
                                className="aspect-square rounded-lg overflow-hidden cursor-zoom-in"
                              >
                                <img src={url} alt="After" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="aspect-square rounded-lg bg-surface border border-dashed border-border flex items-center justify-center">
                            <span className="text-xs text-muted">No photo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Lightbox */}
      {lightboxItem && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxItem(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:opacity-70 cursor-pointer"
            onClick={() => setLightboxItem(null)}
          >
            ×
          </button>
          {lightboxItem.photos.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:opacity-70 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxItem((prev) =>
                  prev
                    ? { ...prev, index: (prev.index - 1 + prev.photos.length) % prev.photos.length }
                    : null
                );
              }}
            >
              ‹
            </button>
          )}
          <img
            src={lightboxItem.photos[lightboxItem.index]}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {lightboxItem.photos.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:opacity-70 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxItem((prev) =>
                  prev
                    ? { ...prev, index: (prev.index + 1) % prev.photos.length }
                    : null
                );
              }}
            >
              ›
            </button>
          )}
          <div className="absolute bottom-4 text-white text-sm opacity-70">
            {lightboxItem.index + 1} / {lightboxItem.photos.length}
          </div>
        </div>
      )}
    </div>
  );
}
