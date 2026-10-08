import { TipoCliente } from '../enums';

/** ESQUEMA_API.md §3 */
export interface Categoria {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
}

export interface CategoriaRequest {
  name: string;
  description?: string | null;
  active?: boolean;
}

/** ESQUEMA_API.md §4 */
export interface Marca {
  id: number;
  name: string;
  active: boolean;
}

export interface MarcaRequest {
  name: string;
  active?: boolean;
}

/** ESQUEMA_API.md §5 */
export interface RefSimple {
  id: number;
  name: string;
}