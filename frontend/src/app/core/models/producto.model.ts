import { EstadoStock, TipoPresentacion, UnidadBase } from '../enums';
import { RefSimple } from './catalogo.model';

/** ESQUEMA_API.md §6 */
export interface Presentacion {
  id: number;
  productoId?: number;
  name: string;
  unitsBase: number;
  type: TipoPresentacion;
  price: number;
  stockMin?: number | null;
  active?: boolean;
  sortOrder?: number;
}

export interface PresentacionRequest {
  name: string;
  unitsBase: number;
  type: TipoPresentacion;
  /** Obligatorio si type = VENTA (R-C-06) */
  price?: number | null;
  stockMin?: number | null;
  sortOrder?: number;
  active?: boolean;
}

/** ESQUEMA_API.md §5.1 */
export interface LotePorVencer {
  lotId?: number;
  lotCode: string;
  qtyRemaining: number;
  expiryDate: string | null;
  diasRestantes: number | null;
}

export interface Producto {
  id: number;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoria?: RefSimple | null;
  marca?: RefSimple | null;
  baseUnit: UnidadBase;
  contentMl?: number | null;
  /** Unidad base. Cacheado — el kardex es la fuente de verdad (R-I-03) */
  stock: number;
  minStock: number;
  maxStock?: number | null;
  costAvg: number;
  presentaciones: Presentacion[];
  margenTeorico?: number | null;
  lotesPorVencer?: LotePorVencer[];
  estadoStock?: EstadoStock | null;
  active: boolean;
}

/** ESQUEMA_API.md §5.2 */
export interface ProductoRequest {
  /** null ⇒ el servidor lo autogenera (R-C-01) */
  sku?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoriaId: number;
  marcaId?: number | null;
  baseUnit: UnidadBase;
  contentMl?: number | null;
  minStock: number;
  maxStock?: number | null;
  presentaciones: PresentacionRequest[];
  active?: boolean;
}

/** ESQUEMA_API.md §5.3 — el costAvg nunca se edita (R-C-09) */
export interface ProductoUpdateRequest {
  sku?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  marcaId?: number | null;
  baseUnit?: UnidadBase;
  contentMl?: number | null;
  minStock: number;
  maxStock?: number | null;
  presentaciones?: PresentacionRequest[];
  active?: boolean;
}

/** ESQUEMA_API.md §5.5 */
export interface LoteStockInicial {
  lotCode: string;
  expiryDate: string | null;
  qty: number;
  costUnit: number;
}

export interface StockInicialRequest {
  unitsBase: number;
  reason: string;
  lotes: LoteStockInicial[];
}

export interface ProductoFiltros {
  search?: string;
  categoriaId?: number | null;
  marcaId?: number | null;
  stockBajo?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}