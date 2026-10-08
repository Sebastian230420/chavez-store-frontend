/** ESQUEMA_API.md §8 */
export interface Proveedor {
  id: number;
  document: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  active: boolean;
}

export interface ProveedorRequest {
  document?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  active?: boolean;
}