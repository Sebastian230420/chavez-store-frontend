/**
 * Paginación tolerante.
 *
 * ESQUEMA_API.md devuelve tres variantes distintas para la misma idea:
 *   §5.1 → { content, page, size, totalElements, totalPages }
 *   §7.1 → { content, totalElements, totalPages }
 *   §9.1 → { content, totalElements }
 * `toPage()` normaliza las tres para que el resto de la app use un solo tipo.
 */

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageParams {
  page?: number;
  size?: number;
  sort?: string;
}

interface RespuestaPaginada<T> {
  content?: T[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
}

export function toPage<T>(respuesta: RespuestaPaginada<T> | null | undefined, sizePorDefecto = 20): Page<T> {
  const content = respuesta?.content ?? [];
  const totalElements = respuesta?.totalElements ?? content.length;
  const size = respuesta?.size ?? sizePorDefecto;
  const totalPages = respuesta?.totalPages ?? Math.max(1, Math.ceil(totalElements / size));
  return {
    content,
    page: respuesta?.page ?? 0,
    size,
    totalElements,
    totalPages,
  };
}

export function paginaVacia<T>(size = 20): Page<T> {
  return { content: [], page: 0, size, totalElements: 0, totalPages: 0 };
}