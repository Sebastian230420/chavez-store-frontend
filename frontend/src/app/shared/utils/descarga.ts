/** Descarga un Blob como archivo, usado por los exports de ESQUEMA_API.md §12.9. */
export function descargarArchivo(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  // Libera el object URL en el siguiente ciclo para no romper la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}