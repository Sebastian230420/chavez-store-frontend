import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  Abono,
  AbonoRequest,
  Cliente,
  ClienteDetalle,
  ClienteFiltros,
  ClienteRequest,
  LimiteCreditoRequest,
  Page,
  Venta,
  toPage,
} from '../models';
import { API_BASE } from '../utils/api-base';

/** ESQUEMA_API.md §11 */
@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/clientes`;

  listar(filtros: ClienteFiltros = {}): Observable<Cliente[]> {
    let params = new HttpParams();
    if (filtros.search) params = params.set('search', filtros.search);
    if (filtros.type) params = params.set('type', filtros.type);
    if (filtros.active !== undefined && filtros.active !== null) {
      params = params.set('active', filtros.active);
    }
    return this.http.get<Cliente[]>(this.base, { params });
  }

  obtener(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.base}/${id}`);
  }

  /** `GET /api/clientes/{id}/detalle` — incluye saldo, disponible e historial. */
  detalle(id: number): Observable<ClienteDetalle> {
    return this.http.get<ClienteDetalle>(`${this.base}/${id}/detalle`);
  }

  crear(request: ClienteRequest): Observable<Cliente> {
    return this.http.post<Cliente>(this.base, request);
  }

  actualizar(id: number, request: ClienteRequest): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.base}/${id}`, request);
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /* ── Abonos (R-CL-07 … R-CL-11) ── */

  /** `POST /api/clientes/{id}/abonos` — único registro de dinero recibido. */
  registrarAbono(clienteId: number, request: AbonoRequest): Observable<Abono> {
    return this.http.post<Abono>(`${this.base}/${clienteId}/abonos`, request);
  }

  listarAbonos(clienteId: number, page = 0, size = 20): Observable<Page<Abono>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<unknown>(`${this.base}/${clienteId}/abonos`, { params })
      .pipe(map((r) => toPage<Abono>(r as never, size)));
  }

  /** `PATCH /api/clientes/{id}/abonos/{abonoId}/anular` — R-CL-09 solo ADMIN. */
  anularAbono(clienteId: number, abonoId: number): Observable<Abono> {
    return this.http.patch<Abono>(`${this.base}/${clienteId}/abonos/${abonoId}/anular`, {});
  }

  /** `PUT /api/clientes/{id}/limite-credito` — R-CL-04 solo ADMIN. */
  actualizarLimiteCredito(clienteId: number, request: LimiteCreditoRequest): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.base}/${clienteId}/limite-credito`, request);
  }

  /** Ventas a crédito del cliente, para `appliedSaleId` del abono (R-CL-11). */
  listarVentasCredito(clienteId: number): Observable<Venta[]> {
    const params = new HttpParams().set('clienteId', clienteId).set('type', 'CREDITO');
    return this.http
      .get<unknown>(`${API_BASE}/ventas`, { params })
      .pipe(map((r) => toPage<Venta>(r as never, 200).content));
  }
}