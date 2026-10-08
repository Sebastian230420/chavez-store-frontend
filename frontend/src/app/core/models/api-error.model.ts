/**
 * Formato de error estándar del backend.
 * Fuente: ESQUEMA_API.md §14 · ARQUITECTURA.md §4.7
 */
export interface ApiError {
  code: string;
  message: string;
  timestamp?: string;
  path?: string;
}

/** Códigos de negocio de LOGICA_NEGOCIO.md §6 */
export const CODIGO_ERROR = {
  AUTH_001: 'AUTH_001',
  AUTH_002: 'AUTH_002',
  AUTH_003: 'AUTH_003',
  AUTH_004: 'AUTH_004',
  AUTH_005: 'AUTH_005',
  AUTH_006: 'AUTH_006',
  VAL_001: 'VAL_001',
  PROD_001: 'PROD_001',
  PROD_002: 'PROD_002',
  PROD_003: 'PROD_003',
  STK_001: 'STK_001',
  STK_002: 'STK_002',
  STK_003: 'STK_003',
  STK_004: 'STK_004',
  SAL_001: 'SAL_001',
  SAL_002: 'SAL_002',
  SAL_003: 'SAL_003',
  SAL_004: 'SAL_004',
  SAL_005: 'SAL_005',
  SAL_006: 'SAL_006',
  PUR_001: 'PUR_001',
  PUR_002: 'PUR_002',
  CLI_001: 'CLI_001',
  CLI_002: 'CLI_002',
  DAT_001: 'DAT_001',
  DAT_002: 'DAT_002',
} as const;

export type CodigoError = (typeof CODIGO_ERROR)[keyof typeof CODIGO_ERROR];