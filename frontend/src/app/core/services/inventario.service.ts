import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  AjusteRequest,
  KardexFiltros,
  MermaRequest,
  MermaResponse,
  MovimientoKardex,
  Page,
  StockProducto,
  VerificacionInventario,
  toPage,
} from '../models';
import { API_BASE } from '../utils/api-base';

/** ESQUEMA_API.md §7 */
@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/inventario`;

  /** `GET /api/inventario/kardex/{productoId}` — R-I-02, kardex append-only. */
  kardex(productoId: number, filtros: KardexFiltros = {}): Observable<Page<MovimientoKardex>> {
    let params = new HttpParams().set('page', filtros.page ?? 0).set('size', filtros.size ?? 50);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);

    return this.http
      .get<unknown>(`${this.base}/kardex/${productoId}`, { params })
      .pipe(map((r) => toPage<MovimientoKardex>(r as never, filtros.size ?? 50)));
  }

  /** `GET /api/inventario/stock/{productoId}` — incluye lotes y días para vencer. */
  stock(productoId: number): Observable<StockProducto> {
    return this.http.get<StockProducto>(`${this.base}/stock/${productoId}`);
  }

  /** `POST /api/inventario/mermas` — R-I-07 motivo obligatorio, R-I-08 lotes FEFO. ADMIN | SUPERVISOR */
  registrarMerma(request: MermaRequest): Observable<MermaResponse> {
    return this.http.post<MermaResponse>(`${this.base}/mermas`, request);
  }

  /** `POST /api/inventario/ajustes` — R-I-06 motivo obligatorio, R-I-01 sin stock negativo. */
  ajustar(request: AjusteRequest): Observable<StockProducto> {
    return this.http.post<StockProducto>(`${this.base}/ajustes`, request);
  }

  /** `GET /api/inventario/verificar` — R-I-04. ADMIN */
  verificarInvariante(): Observable<VerificacionInventario> {
    return this.http.get<VerificacionInventario>(`${this.base}/verificar`);
  }
}