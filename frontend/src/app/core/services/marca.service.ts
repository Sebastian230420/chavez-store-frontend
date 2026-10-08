import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Marca, MarcaRequest } from '../models/catalogo.model';
import { API_BASE } from '../utils/api-base';

/** ESQUEMA_API.md §4 */
@Injectable({ providedIn: 'root' })
export class MarcaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/marcas`;

  listar(): Observable<Marca[]> {
    return this.http.get<Marca[]>(this.base);
  }

  obtener(id: number): Observable<Marca> {
    return this.http.get<Marca>(`${this.base}/${id}`);
  }

  crear(request: MarcaRequest): Observable<Marca> {
    return this.http.post<Marca>(this.base, request);
  }

  actualizar(id: number, request: MarcaRequest): Observable<Marca> {
    return this.http.put<Marca>(`${this.base}/${id}`, request);
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}