"use client";

import { useRef } from "react";

interface ImageUploadPanelProps {
  currentBase64: string | null;
  onImageSelected: (base64: string) => void;
  label?: string;
}

export function ImageUploadPanel({ currentBase64, onImageSelected, label = "Imagen" }: ImageUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix (e.g. "data:image/png;base64,")
      const base64 = result.split(",")[1] ?? "";
      onImageSelected(base64);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="image-upload-panel">
      <p className="image-upload-label">
        <strong>{label}:</strong> {currentBase64 ? "✅ Imagen cargada" : "📂 Sin imagen"}
      </p>
      {currentBase64 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="Vista previa"
          className="image-upload-preview"
          src={`data:image/png;base64,${currentBase64}`}
        />
      )}
      <button
        className="button button-secondary"
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {currentBase64 ? "Cambiar imagen" : "Cargar imagen"}
      </button>
      <input
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}
