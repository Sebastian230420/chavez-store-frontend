/**
 * Catálogos ENUM del dominio.
 * Fuente: MODELO_DATOS.md §3 · LOGICA_NEGOCIO.md §3
 */

export enum Rol {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  CAJERO = 'CAJERO',
  ALMACENERO = 'ALMACENERO',
}

export enum EstadoVenta {
  PAGADA = 'PAGADA',
  ANULADA = 'ANULADA',
}

export enum EstadoCompra {
  REGISTRADA = 'REGISTRADA',
  RECIBIDA = 'RECEBIDA',
  ANULADA = 'ANULADA',
}

export enum TipoVenta {
  MOSTRADOR = 'MOSTRADOR',
  CREDITO = 'CREDITO',
}

export enum TipoPresentacion {
  COMPRA = 'COMPRA',
  VENTA = 'VENTA',
}

export enum UnidadBase {
  UNIDAD = 'UNIDAD',
  LT = 'LT',
  ML = 'ML',
}

export enum TipoCliente {
  CONSUMIDOR = 'CONSUMIDOR',
  MAYORISTA = 'MAYORISTA',
}

export enum MetodoPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA_DEBITO = 'TARJETA_DEBITO',
  TARJETA_CREDITO = 'TARJETA_CREDITO',
  YAPE = 'YAPE',
  PLIN = 'PLIN',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

/** MODELO_DATOS.md §3.1 — signos del kardex */
export enum TipoMovimientoStock {
  INVENTARIO_INICIAL = 'INVENTARIO_INICIAL',
  COMPRA = 'COMPRA',
  VENTA = 'VENTA',
  AJUSTE_POSITIVO = 'AJUSTE_POSITIVO',
  AJUSTE_NEGATIVO = 'AJUSTE_NEGATIVO',
  MERMA = 'MERMA',
  DEVOLUCION_PROVEEDOR = 'DEVOLUCION_PROVEEDOR',
}

/** LOGICA_NEGOCIO.md §2.3 */
export enum MotivoMerma {
  VENCIDO = 'VENCIDO',
  QUIEBRE = 'QUIEBRE',
  ERROR_TOMA = 'ERROR_TOMA',
  ROBO = 'ROBO',
}

/** ESQUEMA_API.md §7.4 */
export enum EstadoStock {
  NORMAL = 'NORMAL',
  CRITICO = 'CRITICO',
  AGOTADO = 'AGOTADO',
}

/** Colores de chip por estado, para el componente `estado-chip` */
export const COLOR_ESTADO_VENTA: Record<string, 'ok' | 'error' | 'warn' | 'info' | 'neutro'> = {
  [EstadoVenta.PAGADA]: 'ok',
  [EstadoVenta.ANULADA]: 'error',
};

export const COLOR_ESTADO_COMPRA: Record<string, 'ok' | 'error' | 'warn' | 'info' | 'neutro'> = {
  [EstadoCompra.REGISTRADA]: 'info',
  [EstadoCompra.RECIBIDA]: 'ok',
  [EstadoCompra.ANULADA]: 'error',
};

export const COLOR_ESTADO_STOCK: Record<string, 'ok' | 'error' | 'warn' | 'info' | 'neutro'> = {
  [EstadoStock.NORMAL]: 'ok',
  [EstadoStock.CRITICO]: 'warn',
  [EstadoStock.AGOTADO]: 'error',
};