import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Proveedor, ProveedorRequest } from '../models';
import { API_BASE } from '../utils/api-base';

/** ESQUEMA_API.md §8 */
@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/proveedores`;

  listar(search?: string, active?: boolean): Observable<Proveedor[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (active !== undefined) params = params.set('active', active);
    return this.http.get<Proveedor[]>(this.base, { params });
  }

  obtener(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.base}/${id}`);
  }

  crear(request: ProveedorRequest): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.base, request);
  }

  actualizar(id: number, request: ProveedorRequest): Observable<Proveedor> {
    return this.http.put<Proveedor>(`${this.base}/${id}`, request);
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}