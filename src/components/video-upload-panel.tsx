"use client";

import { useRef, useState } from "react";
import { uploadVideo } from "@/lib/robot-adapter";

interface VideoUploadPanelProps {
  currentVideoUrl: string | null;
  onVideoUploaded: (videoUrl: string) => void;
  label?: string;
}

export function VideoUploadPanel({ currentVideoUrl, onVideoUploaded, label = "Video" }: VideoUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const result = await uploadVideo(file);
      if (result.ok && result.videoUrl) {
        onVideoUploaded(result.videoUrl);
      } else {
        setError(result.message ?? "Error subiendo video");
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="image-upload-panel">
      <p className="image-upload-label">
        <strong>{label}:</strong>{" "}
        {uploading ? "⏳ Subiendo..." : currentVideoUrl ? "✅ Video cargado" : "📹 Sin video"}
      </p>
      {currentVideoUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={currentVideoUrl}
          style={{ height: 48, width: "auto", borderRadius: 4, border: "1px solid var(--color-border)" }}
        />
      )}
      {error && <p className="form-error" style={{ margin: 0, fontSize: "0.8rem" }}>{error}</p>}
      <button
        className="button button-secondary"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {currentVideoUrl ? "Cambiar video" : "Cargar video"}
      </button>
      <input
        accept="video/mp4,video/webm,video/*"
        className="sr-only"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}
