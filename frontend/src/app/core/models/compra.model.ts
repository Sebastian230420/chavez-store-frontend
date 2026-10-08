import { EstadoCompra } from '../enums';

/** ESQUEMA_API.md §9.1 */
export interface DetalleCompra {
  id?: number;
  productoId?: number;
  producto: string;
  presentacionId?: number;
  presentacion: string;
  qtyBought: number;
  qtyReceived: number;
  unitsBase: number;
  unitCost: number;
  subtotal: number;
}

export interface Compra {
  id: number;
  document: string;
  proveedor: { id: number; name: string };
  proveedorId?: number;
  issueDate: string;
  status: EstadoCompra;
  total: number;
  notes?: string | null;
  detalles: DetalleCompra[];
  creadoPor?: string;
  createdAt?: string;
  annulledAt?: string | null;
}

/**
 * ESQUEMA_API.md §9.2
 * `expiryDate` no figura en el request del documento pero §9.3 devuelve
 * `lotesCreados[].expiryDate` y toda compra genera un lote (LOGICA_NEGOCIO.md §2.2).
 * Se envía como opcional por línea.
 */
export interface DetalleCompraRequest {
  productoId: number;
  presentacionId: number;
  qty: number;
  unitCost: number;
  expiryDate?: string | null;
}

export interface CompraRequest {
  proveedorId: number;
  /** Vacío ⇒ el servidor autogenera (R-CO-06) */
  document?: string | null;
  issueDate: string;
  notes?: string | null;
  detalles: DetalleCompraRequest[];
}

/** ESQUEMA_API.md §9.3 */
export interface LoteCreado {
  productoId: number;
  productoNombre?: string;
  lotCode: string;
  expiryDate: string | null;
  qtyReceived: number;
  costUnit: number;
}

export interface ProductoActualizado {
  productoId: number;
  productoNombre?: string;
  stockAnterior: number;
  stockNuevo: number;
  costoAnterior: number;
  costoNuevo: number;
}

export interface CompraRecibidaResponse {
  id: number;
  document: string;
  status: EstadoCompra;
  total: number;
  lotesCreados: LoteCreado[];
  productosActualizados: ProductoActualizado[];
}

export interface CompraFiltros {
  status?: EstadoCompra | null;
  proveedorId?: number | null;
  desde?: string;
  hasta?: string;
  page?: number;
  size?: number;
}