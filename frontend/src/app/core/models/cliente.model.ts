import { MetodoPago, TipoCliente } from '../enums';

/** ESQUEMA_API.md §11.1 */
export interface Cliente {
  id: number;
  document: string;
  type: TipoCliente;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  creditLimit: number;
  active: boolean;
  saldoActual?: number;
  disponible?: number;
}

export interface ClienteRequest {
  document: string;
  type: TipoCliente;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  creditLimit?: number;
  active?: boolean;
}

/** ESQUEMA_API.md §11.2 */
export interface VentaResumenCliente {
  document: string;
  fecha: string;
  total: number;
  profit: number;
  id?: number;
}

export interface ClienteDetalle extends Cliente {
  ventasUltimos30Dias: VentaResumenCliente[];
}

/** ESQUEMA_API.md §11.3 */
export interface Abono {
  id: number;
  clienteId: number;
  clienteNombre?: string;
  amount: number;
  method: MetodoPago;
  appliedSaleId?: number | null;
  notes?: string | null;
  saldoAnterior?: number;
  saldoActual?: number;
  registradoPor?: string;
  fecha?: string;
  createdAt?: string;
  annulledAt?: string | null;
}

export interface AbonoRequest {
  amount: number;
  method: MetodoPago;
  appliedSaleId?: number | null;
  notes?: string | null;
}

export interface LimiteCreditoRequest {
  creditLimit: number;
}

export interface ClienteFiltros {
  search?: string;
  type?: TipoCliente | null;
  active?: boolean | null;
}