import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  FiltrosReporteProducto,
  OrdenReporteProducto,
  ReporteCuentasPorCobrar,
  ReporteGanancias,
  ReporteGananciasCategoria,
  ReporteGananciasProducto,
  ReporteMermas,
  ReporteStock,
  ReporteVentasDelDia,
  ReporteVentasPorHora,
} from '../models';
import { API_BASE } from '../utils/api-base';

/** ESQUEMA_API.md §12 */
@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/reportes`;

  private rango(desde: string, hasta: string, params = new HttpParams()): HttpParams {
    return params.set('desde', desde).set('hasta', hasta);
  }

  /** §12.1 — R-R-01 solo ventas PAGADA, R-R-02 utilidad = ingresos − costo − mermas. */
  ganancias(desde: string, hasta: string): Observable<ReporteGanancias> {
    return this.http.get<ReporteGanancias>(`${this.base}/ganancias`, {
      params: this.rango(desde, hasta),
    });
  }

  /** §12.2 — R-R-04 agrupa por categoría, R-R-05 margen teórico vs real. */
  gananciasPorCategoria(desde: string, hasta: string): Observable<ReporteGananciasCategoria> {
    return this.http.get<ReporteGananciasCategoria>(`${this.base}/ganancias/categoria`, {
      params: this.rango(desde, hasta),
    });
  }

  /** §12.3 — R-R-10 incluye productos sin movimiento con `diasSinVenta`. */
  gananciasPorProducto(filtros: FiltrosReporteProducto): Observable<ReporteGananciasProducto> {
    let params = this.rango(filtros.desde, filtros.hasta);
    if (filtros.categoriaId) params = params.set('categoriaId', filtros.categoriaId);
    params = params.set('orden', filtros.orden ?? 'utilidad');
    params = params.set('limite', filtros.limite ?? 50);
    return this.http.get<ReporteGananciasProducto>(`${this.base}/ganancias/producto`, { params });
  }

  /** §12.4 — R-R-09 agrupa por HOUR(sale_date). */
  ventasPorHora(desde: string, hasta: string): Observable<ReporteVentasPorHora> {
    return this.http.get<ReporteVentasPorHora>(`${this.base}/ventas-por-hora`, {
      params: this.rango(desde, hasta),
    });
  }

  /** §12.5 — R-R-07 lotes por vencer en los próximos N días. */
  stock(diasParaVencer = 30): Observable<ReporteStock> {
    const params = new HttpParams().set('diasParaVencer', diasParaVencer);
    return this.http.get<ReporteStock>(`${this.base}/stock`, { params });
  }

  /** §12.6 — R-R-06 mermas por `stock_movements.type = MERMA`. */
  mermas(desde: string, hasta: string, motivo?: string | null): Observable<ReporteMermas> {
    let params = this.rango(desde, hasta);
    if (motivo) params = params.set('motivo', motivo);
    return this.http.get<ReporteMermas>(`${this.base}/mermas`, { params });
  }

  /** §12.7 — R-R-08 saldo por cliente + antigüedad 0-30 / 31-60 / 61-90 / 90+. ADMIN */
  cuentasPorCobrar(): Observable<ReporteCuentasPorCobrar> {
    return this.http.get<ReporteCuentasPorCobrar>(`${this.base}/cuentas-por-cobrar`);
  }

  /** §12.8 */
  ventasDelDia(fecha: string): Observable<ReporteVentasDelDia> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http.get<ReporteVentasDelDia>(`${this.base}/ventas-del-dia`, { params });
  }

  /** §12.9 — devuelve el Blob para descargar; no se interprets como JSON. */
  exportarGanancias(formato: 'excel' | 'pdf', desde: string, hasta: string): Observable<Blob> {
    const params = this.rango(desde, hasta).set('formato', formato);
    return this.http.get(`${this.base}/ganancias/exportar`, {
      params,
      responseType: 'blob',
    });
  }

  /** Tipos de orden admitidos por §12.3, para poblar el selector. */
  readonly ordenesProducto: { valor: OrdenReporteProducto; etiqueta: string }[] = [
    { valor: 'utilidad', etiqueta: 'Utilidad' },
    { valor: 'ingresos', etiqueta: 'Ingresos' },
    { valor: 'unidadesVendidas', etiqueta: 'Unidades vendidas' },
    { valor: 'rotacion', etiqueta: 'Rotación' },
    { valor: 'nombre', etiqueta: 'Nombre' },
  ];
}