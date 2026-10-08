import { Pipe, PipeTransform } from '@angular/core';
import { formatearFecha } from '../utils/formato';

/**
 * Fechas ISO-8601 → texto legible. Sin timezone explícito: el backend
 * entrega la hora local de la tienda.
 */
@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(
    valor: string | Date | null | undefined,
    formato: 'corta' | 'larga' | 'hora' = 'corta',
  ): string {
    return formatearFecha(valor, formato);
  }
}

/** Completa `YYYY-MM-DD` (query params del backend) a ISO con hora. */
@Pipe({ name: 'aIso' })
export class AIsoPipe implements PipeTransform {
  transform(valor: string | null | undefined): string | null {
    if (!valor) return null;
    return valor.length === 10 ? `${valor}T00:00:00` : valor;
  }
}