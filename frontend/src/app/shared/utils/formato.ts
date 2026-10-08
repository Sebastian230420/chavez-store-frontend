/**
 * Formateadores compartidos.
 * Los pipes de `shared/pipes` los usan para render y estos helpers son para
 * los pocos casos donde hay que componer texto dentro de TypeScript
 * (por ejemplo, el cuerpo de un diálogo de confirmación).
 */

export function formatearMoneda(valor: number | null | undefined, decimales = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor);
}

export function formatearEntero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return new Intl.NumberFormat('es-PE').format(valor);
}

export function formatearPorcentaje(valor: number | null | undefined, decimales = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return `${new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor)}%`;
}

export function formatearFecha(
  valor: string | Date | null | undefined,
  formato: 'corta' | 'larga' | 'hora' = 'corta',
): string {
  if (!valor) return '—';
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';

  switch (formato) {
    case 'hora':
      return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(fecha);
    case 'larga':
      return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(fecha);
    default:
      return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(fecha);
  }
}