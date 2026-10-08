import { Pipe, PipeTransform } from '@angular/core';
import { formatearEntero, formatearMoneda, formatearPorcentaje } from '../utils/formato';

/** Dinero en soles. `null`/`undefined` se muestran como `—`. */
@Pipe({ name: 'moneda' })
export class MonedaPipe implements PipeTransform {
  transform(valor: number | string | null | undefined, decimales = 2): string {
    const numero = typeof valor === 'string' ? Number(valor) : valor;
    return formatearMoneda(numero, decimales);
  }
}

/** Porcentaje con el sufijo `%`. */
@Pipe({ name: 'porcentaje' })
export class PorcentajePipe implements PipeTransform {
  transform(valor: number | null | undefined, decimales = 2): string {
    return formatearPorcentaje(valor, decimales);
  }
}

/** Entero con separador de miles. */
@Pipe({ name: 'entero' })
export class EnteroPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatearEntero(valor);
  }
}

/** Número decimal sin símbolo de moneda (rotaciones, litros,Ticket promedio). */
@Pipe({ name: 'numero' })
export class NumeroPipe implements PipeTransform {
  transform(valor: number | null | undefined, decimales = 2): string {
    if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimales,
    }).format(valor);
  }
}