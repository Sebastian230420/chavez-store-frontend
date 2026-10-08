import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Compra, CompraFiltros, CompraRecibidaResponse, CompraRequest, Page, toPage } from '../models';
import { API_BASE } from '../utils/api-base';

/** ESQUEMA_API.md §9 — R-CO-02 ADMIN | ALMACENERO, R-CO-03 recalcula costo al recibir. */
@Injectable({ providedIn: 'root' })
export class CompraService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/compras`;

  listar(filtros: CompraFiltros = {}): Observable<Page<Compra>> {
    let params = new HttpParams().set('page', filtros.page ?? 0).set('size', filtros.size ?? 20);
    if (filtros.status) params = params.set('status', filtros.status);
    if (filtros.proveedorId) params = params.set('proveedorId', filtros.proveedorId);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);

    return this.http
      .get<unknown>(this.base, { params })
      .pipe(map((r) => toPage<Compra>(r as never, filtros.size ?? 20)));
  }

  obtener(id: number): Observable<Compra> {
    return this.http.get<Compra>(`${this.base}/${id}`);
  }

  /** `POST /api/compras` — el total lo calcula el servidor (R-CO-07). */
  registrar(request: CompraRequest): Observable<Compra> {
    return this.http.post<Compra>(this.base, request);
  }

  /** `POST /api/compras/{id}/recibir` — crea lotes, suma stock y recalcula `cost_avg`. */
  recibir(id: number): Observable<CompraRecibidaResponse> {
    return this.http.post<CompraRecibidaResponse>(`${this.base}/${id}/recibir`, {});
  }

  /** `PATCH /api/compras/{id}/anular` — R-CO-04/05 solo ADMIN. */
  anular(id: number): Observable<Compra> {
    return this.http.patch<Compra>(`${this.base}/${id}/anular`, {});
  }
}