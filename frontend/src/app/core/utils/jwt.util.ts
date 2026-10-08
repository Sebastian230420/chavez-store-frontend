export const CLAVE_TOKEN = 'chavez_store_token';
export const CLAVE_SESION = 'chavez_store_sesion';

/** Decodifica el payload de un JWT sin verificar la firma. */
export function decodificarJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalizado = payload.replace(/-/g, '+').replace(/_/g, '/');
    const relleno = normalizado.padEnd(
      normalizado.length + ((4 - (normalizado.length % 4)) % 4),
      '=',
    );
    return JSON.parse(atob(relleno)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Lee el instante de expiración (epoch ms) de un JWT, o `null` si no se puede. */
export function expiracionDe(token: string): number | null {
  const payload = decodificarJwt(token);
  const exp = payload?.['exp'];
  return typeof exp === 'number' ? exp * 1000 : null;
}