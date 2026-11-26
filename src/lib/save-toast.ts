import type { SaveResult } from "@/components/use-work-autosave";

/** Aviso tipo toast (arriba a la derecha, 3 s) con el resultado del botón Guardar. */
export async function showSaveToast(result: SaveResult) {
  const { default: Swal } = await import("sweetalert2");
  const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  if (result.ok) {
    await toast.fire({ icon: "success", title: "Cambios guardados" });
  } else if (result.message === "Ya se está guardando.") {
    // El autoguardado ya estaba enviando los cambios en ese momento.
    await toast.fire({ icon: "info", title: "Guardando tus cambios…" });
  } else if (result.offline) {
    await toast.fire({ icon: "warning", title: "Sin conexión: guardado en este dispositivo" });
  } else {
    await toast.fire({ icon: "error", title: "No se pudo guardar, inténtalo de nuevo" });
  }
}
