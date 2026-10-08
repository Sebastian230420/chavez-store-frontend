import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  Page,
  Producto,
  ProductoFiltros,
  ProductoRequest,
  ProductoUpdateRequest,
  Presentacion,
  PresentacionRequest,
  StockInicialRequest,
  toPage,
} from '../models';
import { API_BASE } from '../utils/api-base';

/** ESQUEMA_API.md §5 y §6 */
@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/productos`;

  /** `GET /api/productos?search=&categoriaId=&marcaId=&stockBajo=&page=&size=` */
  listar(filtros: ProductoFiltros = {}): Observable<Page<Producto>> {
    let params = new HttpParams();
    if (filtros.search) params = params.set('search', filtros.search);
    if (filtros.categoriaId) params = params.set('categoriaId', filtros.categoriaId);
    if (filtros.marcaId) params = params.set('marcaId', filtros.marcaId);
    if (filtros.stockBajo) params = params.set('stockBajo', true);
    if (filtros.page !== undefined) params = params.set('page', filtros.page);
    params = params.set('size', filtros.size ?? 20);
    if (filtros.sort) params = params.set('sort', filtros.sort);

    return this.http
      .get<unknown>(this.base, { params })
      .pipe(map((r) => toPage<Producto>(r as never, filtros.size ?? 20)));
  }

  /** Listado completo sin paginación, para los selectores de ventas y compras. */
  listarTodos(filtros: Omit<ProductoFiltros, 'page' | 'size'> = {}): Observable<Producto[]> {
    return this.listar({ ...filtros, page: 0, size: 1000 }).pipe(map((p) => p.content));
  }

  obtener(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.base}/${id}`);
  }

  crear(request: ProductoRequest): Observable<Producto> {
    return this.http.post<Producto>(this.base, request);
  }

  actualizar(id: number, request: ProductoUpdateRequest): Observable<Producto> {
    return this.http.put<Producto>(`${this.base}/${id}`, request);
  }

  /** Desactiva el producto. `PROD_003` si tiene movimientos o ventas. */
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** `POST /api/productos/{id}/stock-inicial` — R-I-06, ADMIN | SUPERVISOR. */
  cargarStockInicial(id: number, request: StockInicialRequest): Observable<Producto> {
    return this.http.post<Producto>(`${this.base}/${id}/stock-inicial`, request);
  }

  /* ── Presentaciones (ESQUEMA_API.md §6) ── */

  listarPresentaciones(productoId: number): Observable<Presentacion[]> {
    return this.http.get<Presentacion[]>(`${this.base}/${productoId}/presentaciones`);
  }

  agregarPresentacion(productoId: number, request: PresentacionRequest): Observable<Presentacion> {
    return this.http.post<Presentacion>(`${this.base}/${productoId}/presentaciones`, request);
  }

  actualizarPresentacion(id: number, request: PresentacionRequest): Observable<Presentacion> {
    return this.http.put<Presentacion>(`${API_BASE}/presentaciones/${id}`, request);
  }

  eliminarPresentacion(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/presentaciones/${id}`);
  }
}