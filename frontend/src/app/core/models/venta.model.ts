import { EstadoVenta, TipoVenta } from '../enums';

/** ESQUEMA_API.md §10.1 — detalle de venta */
export interface DetalleVenta {
  producto: string;
  productoId?: number;
  presentacion: string;
  presentacionId?: number;
  lote?: string | null;
  lotId?: number | null;
  qty: number;
  unitsBase: number;
  unitPrice: number;
  unitCost: number;
  subtotal: number;
  profit: number;
}

/** ESQUEMA_API.md §10.1 */
export interface Venta {
  id: number;
  document: string;
  type: TipoVenta;
  cliente: { id: number; name: string } | null;
  clienteId?: number | null;
  registradoPor: string;
  fecha: string;
  saleDate?: string;
  subtotal: number;
  total: number;
  costTotal: number;
  profit: number;
  status: EstadoVenta;
  detalles: DetalleVenta[];
  annulledAt?: string | null;
  annulReason?: string | null;
}

/** ESQUEMA_API.md §10.1 — sin pagos y sin voucher (R-V-14) */
export interface DetalleVentaRequest {
  productoId: number;
  presentacionId: number;
  qty: number;
}

export interface VentaRequest {
  type: TipoVenta;
  /** Obligatorio solo si type = CREDITO (R-V-13) */
  clienteId?: number | null;
  /** Retroactivo permitido, futuro no (R-V-17) */
  saleDate?: string | null;
  detalles: DetalleVentaRequest[];
}

/** ESQUEMA_API.md §10.5 */
export interface AnularVentaRequest {
  reason: string;
}

export interface VentaFiltros {
  type?: TipoVenta | null;
  status?: EstadoVenta | null;
  clienteId?: number | null;
  desde?: string;
  hasta?: string;
  page?: number;
  size?: number;
}