import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Categoria, CategoriaRequest } from '../models/catalogo.model';
import { API_BASE } from '../utils/api-base';

/** ESQUEMA_API.md §3 */
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE}/categorias`;

  listar(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.base);
  }

  obtener(id: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.base}/${id}`);
  }

  crear(request: CategoriaRequest): Observable<Categoria> {
    return this.http.post<Categoria>(this.base, request);
  }

  actualizar(id: number, request: CategoriaRequest): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.base}/${id}`, request);
  }

  /** Desactiva la categoría (no la borra). ADMIN */
  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}