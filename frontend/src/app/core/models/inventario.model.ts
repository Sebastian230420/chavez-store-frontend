import { EstadoStock, TipoMovimientoStock } from '../enums';

/** ESQUEMA_API.md §7.4 */
export interface LoteDetalle {
  lotId: number;
  lotCode: string;
  qtyRemaining: number;
  expiryDate: string | null;
  diasRestantes: number | null;
  costUnit?: number;
}

export interface StockProducto {
  productoId: number;
  nombre: string;
  sku?: string;
  stock: number;
  stockMin: number;
  stockMax?: number | null;
  estado: EstadoStock;
  diasParaVencer: number | null;
  lotes: LoteDetalle[];
}

/** ESQUEMA_API.md §7.1 */
export interface MovimientoKardex {
  id: number;
  productoId: number;
  productoNombre: string;
  sku?: string;
  lote?: { lotCode: string; expiryDate: string | null } | null;
  type: TipoMovimientoStock;
  qty: number;
  unitCost: number;
  refTable?: string | null;
  refId?: number | null;
  reason?: string | null;
  usuario: string;
  stockResultante: number;
  createdAt: string;
}

export interface KardexFiltros {
  desde?: string;
  hasta?: string;
  page?: number;
  size?: number;
}

/** ESQUEMA_API.md §7.2 */
export interface MermaRequest {
  productoId: number;
  qty: number;
  lotId?: number | null;
  reason: string;
}

export interface LoteAfectado {
  lotId: number;
  lotCode: string;
  qty: number;
}

export interface MermaResponse {
  productoId: number;
  productoNombre: string;
  qty: number;
  costoPerdido: number;
  lotesAfectados: LoteAfectado[];
  stockRestante: number;
  motivo: string;
}

/** ESQUEMA_API.md §7.3 */
export interface AjusteRequest {
  productoId: number;
  unitsBase: number;
  reason: string;
}

/** ESQUEMA_API.md §7.5 */
export interface DescuadreInventario {
  productoId: number;
  sku: string;
  stockCacheado: number;
  stockReal: number;
  diferencia: number;
}

export interface VerificacionInventario {
  verificado: boolean;
  productosConDescuadre: DescuadreInventario[];
}