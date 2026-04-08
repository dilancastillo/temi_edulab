export const maxProfileImageBytes = 2 * 1024 * 1024;

export function validateImageFile(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Usa una imagen JPG, PNG o WebP.";
  }

  if (file.size > maxProfileImageBytes) {
    return "La imagen debe pesar máximo 2 MB.";
  }

  return null;
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}
