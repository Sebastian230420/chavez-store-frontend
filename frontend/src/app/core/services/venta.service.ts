import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  AnularVentaRequest,
  Page,
  Venta,
  VentaFiltros,
  VentaRequest,
  toPage,
} from '../models';
import { API_BASE } from '../utils/api-base';

/**
 * ESQUEMA_API.md §10 — la venta es un asiento interno:
 * sin forma de pago, sin voucher, sin cobro (R-V-14).
 */
@Injectable({ providedIn: 'root' })
export class VentaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/ventas`;

  /** `POST /api/ventas` — el total y el profit los calcula el servidor (R-V-03, R-V-15). */
  registrar(request: VentaRequest): Observable<Venta> {
    return this.http.post<Venta>(this.base, request);
  }

  listar(filtros: VentaFiltros = {}): Observable<Page<Venta>> {
    let params = new HttpParams().set('page', filtros.page ?? 0).set('size', filtros.size ?? 20);
    if (filtros.type) params = params.set('type', filtros.type);
    if (filtros.status) params = params.set('status', filtros.status);
    if (filtros.clienteId) params = params.set('clienteId', filtros.clienteId);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);

    return this.http
      .get<unknown>(this.base, { params })
      .pipe(map((r) => toPage<Venta>(r as never, filtros.size ?? 20)));
  }

  obtener(id: number): Observable<Venta> {
    return this.http.get<Venta>(`${this.base}/${id}`);
  }

  /** `PATCH /api/ventas/{id}/anular` — R-V-09 revierte stock, R-V-10 solo ADMIN. */
  anular(id: number, request: AnularVentaRequest): Observable<Venta> {
    return this.http.patch<Venta>(`${this.base}/${id}/anular`, request);
  }
}