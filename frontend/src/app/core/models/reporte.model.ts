import { MetodoPago, TipoVenta } from '../enums';

/** ESQUEMA_API.md §12.1 */
export interface Periodo {
  desde: string;
  hasta: string;
}

export interface TotalesGanancias {
  ventasCount: number;
  unidadesVendidas: number;
  ingresos: number;
  costoVentas: number;
  mermas: number;
  utilidadNeta: number;
  margenPct: number;
}

export interface GananciaPorDia {
  fecha: string;
  ventasCount: number;
  ingresos: number;
  costo: number;
  mermas: number;
  utilidad: number;
  margenPct: number;
}

export interface VentaPorTipo {
  type: TipoVenta;
  ventasCount: number;
  total: number;
  porcentaje: number;
}

export interface ReporteGanancias {
  periodo: Periodo;
  totales: TotalesGanancias;
  porDia: GananciaPorDia[];
  porTipoVenta: VentaPorTipo[];
  recaudadoAbonos: number;
}

/** ESQUEMA_API.md §12.2 */
export interface GananciaCategoria {
  categoriaId: number;
  categoriaNombre: string;
  ventasCount: number;
  unidadesVendidas: number;
  litrosVendidos: number;
  ingresos: number;
  costoVentas: number;
  mermas: number;
  utilidad: number;
  margenPct: number;
  margenRealPct: number;
  participacionIngresosPct: number;
}

export interface ReporteGananciasCategoria {
  periodo: Periodo;
  categorias: GananciaCategoria[];
}

/** ESQUEMA_API.md §12.3 */
export interface GananciaProducto {
  productoId: number;
  sku: string;
  nombre: string;
  categoria: string;
  unidadesVendidas: number;
  litrosVendidos: number;
  ingresos: number;
  costo: number;
  mermas: number;
  utilidad: number;
  margenPct: number;
  margenRealPct: number;
  stockActual: number;
  rotacion: number;
  diasSinVenta: number;
}

export interface ReporteGananciasProducto {
  periodo: Periodo;
  productos: GananciaProducto[];
  totalProductos: number;
}

export type OrdenReporteProducto = 'utilidad' | 'ingresos' | 'unidadesVendidas' | 'rotacion' | 'nombre';

export interface FiltrosReporteProducto {
  desde: string;
  hasta: string;
  categoriaId?: number | null;
  orden?: OrdenReporteProducto;
  limite?: number;
}

/** ESQUEMA_API.md §12.4 */
export interface VentasPorHora {
  hora: number;
  ventasCount: number;
  ingresos: number;
  ticketPromedio: number;
}

export interface ReporteVentasPorHora {
  porHora: VentasPorHora[];
  horaPico: number | null;
  horaBaja: number | null;
}

/** ESQUEMA_API.md §12.5 */
export interface ProductoStockCritico {
  productoId: number;
  sku: string;
  nombre: string;
  stock: number;
  stockMin: number;
  faltante: number;
}

export interface LotePorVencerReporte {
  productoId: number;
  nombre: string;
  lotCode: string;
  qty: number;
  expiryDate: string;
  diasRestantes: number;
  valor: number;
}

export interface ResumenStock {
  productosStockCritico: number;
  lotesPorVencer: number;
  valorPorVencer: number;
}

export interface ReporteStock {
  stockCritico: ProductoStockCritico[];
  porVencer: LotePorVencerReporte[];
  sinVencimiento: LotePorVencerReporte[];
  resumen: ResumenStock;
}

/** ESQUEMA_API.md §12.6 */
export interface MermaPorMotivo {
  motivo: string;
  unidades: number;
  costoPerdido: number;
  porcentaje: number;
}

export interface MermaPorProducto {
  productoId: number;
  nombre: string;
  unidades: number;
  costoPerdido: number;
  mermaPct: number;
}

export interface ReporteMermas {
  periodo: Periodo;
  totales: { unidades: number; costoPerdido: number };
  porMotivo: MermaPorMotivo[];
  porProducto: MermaPorProducto[];
}

/** ESQUEMA_API.md §12.7 */
export interface Antiguedad {
  actual: number;
  dias30: number;
  dias60: number;
  dias90: number;
}

export interface ClienteCuentasPorCobrar {
  clienteId: number;
  nombre: string;
  document: string;
  creditLimit: number;
  saldoTotal: number;
  disponible: number;
  antiguedad: Antiguedad;
  ultimaVenta: string | null;
  ultimoPago: string | null;
}

export interface ReporteCuentasPorCobrar {
  clientes: ClienteCuentasPorCobrar[];
  resumen: {
    clientesConDeuda: number;
    saldoTotal: number;
    deudaMas90Dias: number;
  };
}

/** ESQUEMA_API.md §12.8 */
export interface ResumenVentasDia {
  ventasCount: number;
  ingresosTotal: number;
  costoTotal: number;
  utilidad: number;
  creditoOtorgado: number;
  abonosRecibidos: number;
}

export interface AbonoDelDia {
  cliente: string;
  amount: number;
  method: MetodoPago;
}

export interface TopProductoDia {
  producto: string;
  unidades: number;
  ingresos: number;
}

export interface ReporteVentasDelDia {
  fecha: string;
  resumen: ResumenVentasDia;
  porTipoVenta: VentaPorTipo[];
  abonosDelDia: AbonoDelDia[];
  topProductos: TopProductoDia[];
}

/** ESQUEMA_API.md §12.9 */
export type FormatoExportacion = 'excel' | 'pdf';