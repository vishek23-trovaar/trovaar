"use client";

import { useState, useRef } from "react";

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
  hint?: string;
}

export default function ImageUploader({ images, onImagesChange, maxImages = 5, label, hint }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    const newImages = [...images];

    for (let i = 0; i < files.length && newImages.length < maxImages; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          newImages.push(data.url);
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    onImagesChange(newImages);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    onImagesChange(images.filter((_, i) => i !== index));
  }

  return (
    <div>
      {label !== "" && (
        <label className="block text-sm font-medium text-secondary mb-1.5">
          {label ?? "Photos / Videos"}
        </label>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((url, i) => {
          const isVideo = url.match(/\.(mp4|mov|webm)$/i);
          return (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
              {isVideo ? (
                <video src={url} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
              )}
              {isVideo && (
                <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">▶ video</span>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full
                  flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                &times;
              </button>
            </div>
          );
        })}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-border
              hover:border-primary hover:bg-primary/5 transition-colors
              flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            {uploading ? (
              <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <>
                <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs text-muted">Add Photo/Video</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
      <p className="mt-2 text-xs text-muted">
        {hint ?? `Upload up to ${maxImages} photos or videos. Snap the problem or an estimate you received.`}
      </p>
    </div>
  );
}
