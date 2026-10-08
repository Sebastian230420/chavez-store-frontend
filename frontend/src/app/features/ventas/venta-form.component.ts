import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TipoVenta, TipoPresentacion } from '../../core/enums';
import { Cliente } from '../../core/models/cliente.model';
import { Producto, Presentacion } from '../../core/models/producto.model';
import {
  DetalleVentaRequest,
  VentaRequest,
} from '../../core/models/venta.model';
import { ClienteService } from '../../core/services/cliente.service';
import { ProductoService } from '../../core/services/producto.service';
import { VentaService } from '../../core/services/venta.service';
import { codigoDeError, mensajeDeError } from '../../core/interceptors/error.interceptor';
import { EstadoChipComponent } from '../../shared/components/estado-chip.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { hoy } from '../../shared/components/rango-fechas.component';
import { EnteroPipe, MonedaPipe } from '../../shared/pipes/formato.pipe';
import { NotificacionService } from '../../shared/services/notificacion.service';

/** Línea del carrito antes de enviarla al servidor. */
interface LineaVenta {
  producto: Producto;
  presentacion: Presentacion;
  qty: number;
  /** qty × presentacion.unitsBase */
  unitsBase: number;
  subtotal: number;
  /** true si el stock en unidad base no alcanza (R-V-05). */
  sinStock: boolean;
}

/**
 * `POST /api/ventas` — ESQUEMA_API.md §10.1
 *
 * La venta es un **asiento interno**: no registra forma de pago, no genera voucher
 * y no cobra (R-V-14, LOGICA_NEGOCIO.md §1). El total que se muestra es solo
 * informativo: el definitivo lo calcula el servidor (R-V-03).
 */
@Component({
  selector: 'app-venta-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatRadioModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressBarModule,
    PageHeaderComponent,
    EstadoChipComponent,
    MonedaPipe,
    EnteroPipe,
  ],
  templateUrl: './venta-form.component.html',
  styleUrl: './venta-form.component.scss',
})
export class VentaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productosService = inject(ProductoService);
  private readonly clientesService = inject(ClienteService);
  private readonly ventas = inject(VentaService);
  private readonly router = inject(Router);
  private readonly notificacion = inject(NotificacionService);

  readonly TipoVenta = TipoVenta;

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');

  readonly productos = signal<Producto[]>([]);
  readonly clientes = signal<Cliente[]>([]);

  readonly busqueda = signal('');
  readonly productoSeleccionado = signal<Producto | null>(null);
  readonly presentacionSeleccionadaId = signal<number | null>(null);
  readonly qty = signal(1);
  readonly lineas = signal<LineaVenta[]>([]);

  /** R-V-17: se permite fecha retroactiva, nunca futura (SAL_006). */
  readonly fechaHoy = hoy();

  readonly form = this.fb.nonNullable.group({
    type: [TipoVenta.MOSTRADOR, [Validators.required]],
    clienteId: [null as number | null],
    saleDate: [null as string | null],
  });

  /** Presentaciones de VENTA con precio — R-C-04 / R-C-06. */
  readonly presentacionesVenta = computed<Presentacion[]>(() => {
    const producto = this.productoSeleccionado();
    if (!producto) return [];
    return producto.presentaciones.filter(
      (p) => p.type === TipoPresentacion.VENTA && p.active !== false && Number(p.price) > 0,
    );
  });

  readonly presentacionSeleccionada = computed<Presentacion | null>(() => {
    const id = this.presentacionSeleccionadaId();
    return this.presentacionesVenta().find((p) => p.id === id) ?? null;
  });

  /** Unidades base que se descontarán del stock con la cantidad actual. */
  readonly unitsBaseActual = computed(() => {
    const presentacion = this.presentacionSeleccionada();
    return presentacion ? presentacion.unitsBase * this.qty() : 0;
  });

  readonly stockDisponible = computed(() => this.productoSeleccionado()?.stock ?? 0);

  readonly excedeStock = computed(() => this.unitsBaseActual() > this.stockDisponible());

  readonly subtotalInformativo = computed(() =>
    this.lineas().reduce((suma, linea) => suma + linea.subtotal, 0),
  );

  readonly unidadesBaseTotales = computed(() =>
    this.lineas().reduce((suma, linea) => suma + linea.unitsBase, 0),
  );

  readonly costoEstimado = computed(() =>
    this.lineas().reduce(
      (suma, linea) => suma + linea.unitsBase * (linea.producto.costAvg || 0),
      0,
    ),
  );

  readonly utilidadEstimada = computed(
    () => this.subtotalInformativo() - this.costoEstimado(),
  );

  readonly hayItemsInvalidos = computed(() => this.lineas().some((l) => l.sinStock));

  /** R-V-13: la venta a crédito exige cliente con cupo. */
  readonly clienteSeleccionado = computed<Cliente | null>(() => {
    const id = this.form.controls.clienteId.value;
    return id ? (this.clientes().find((c) => c.id === id) ?? null) : null;
  });

  readonly clienteSinCupo = computed(() => {
    const cliente = this.clienteSeleccionado();
    return !!cliente && Number(cliente.creditLimit) <= 0;
  });

  /** R-CL-06: saldo + total nuevo ≤ creditLimit. Se avisa antes de enviar. */
  readonly excedeCredito = computed(() => {
    const cliente = this.clienteSeleccionado();
    if (!cliente || Number(cliente.creditLimit) <= 0) return false;
    const saldo = Number(cliente.saldoActual ?? 0);
    return saldo + this.subtotalInformativo() > Number(cliente.creditLimit);
  });

  readonly creditoDisponible = computed(() => {
    const cliente = this.clienteSeleccionado();
    if (!cliente) return 0;
    return Number(cliente.creditLimit) - Number(cliente.saldoActual ?? 0);
  });

  readonly esCredito = computed(() => this.form.controls.type.value === TipoVenta.CREDITO);

  constructor() {
    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    this.cargando.set(true);
    let pendientes = 2;

    this.productosService.listarTodos().subscribe({
      next: (lista) => {
        this.productos.set(lista.filter((p) => p.active));
        if (--pendientes === 0) this.cargando.set(false);
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        this.notificacion.error(mensajeDeError(err));
      },
    });

    this.clientesService.listar({ active: true }).subscribe({
      next: (lista) => {
        this.clientes.set(lista);
        if (--pendientes === 0) this.cargando.set(false);
      },
      error: () => {
        if (--pendientes === 0) this.cargando.set(false);
      },
    });
  }

  /* ── Búsqueda y selección ── */

  productosFiltrados(): Producto[] {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return [];
    return this.productos()
      .filter((p) => {
        if (p.barcode && p.barcode.toLowerCase().includes(texto)) return true;
        if (p.sku && p.sku.toLowerCase().includes(texto)) return true;
        return p.name.toLowerCase().includes(texto);
      })
      .slice(0, 12);
  }

  resultados(): Producto[] {
    const texto = this.busqueda().trim().toLowerCase();
    if (texto.length < 2) return [];
    return this.productosFiltrados();
  }

  seleccionarProducto(producto: Producto): void {
    this.productoSeleccionado.set(producto);
    const venta = this.presentacionesVenta()[0];
    this.presentacionSeleccionadaId.set(venta?.id ?? null);
    this.qty.set(1);
    this.busqueda.set('');
  }

  limpiarProducto(): void {
    this.productoSeleccionado.set(null);
    this.presentacionSeleccionadaId.set(null);
    this.qty.set(1);
  }

  /* ── Carrito ── */

  agregarLinea(): void {
    const producto = this.productoSeleccionado();
    const presentacion = this.presentacionSeleccionada();
    if (!producto || !presentacion) return;

    const cantidad = Math.max(1, Math.floor(this.qty()));
    const unitsBase = presentacion.unitsBase * cantidad;
    const existente = this.lineas().find(
      (l) => l.presentacion.id === presentacion.id && l.producto.id === producto.id,
    );

    if (existente) {
      this.lineas.update((lineas) =>
        lineas.map((l) => {
          if (l.presentacion.id !== presentacion.id || l.producto.id !== producto.id) return l;
          const qty = l.qty + cantidad;
          const totalUnits = presentacion.unitsBase * qty;
          return {
            ...l,
            qty,
            unitsBase: totalUnits,
            subtotal: qty * presentacion.price,
            sinStock: totalUnits > producto.stock,
          };
        }),
      );
    } else {
      this.lineas.update((lineas) => [
        ...lineas,
        {
          producto,
          presentacion,
          qty: cantidad,
          unitsBase,
          subtotal: cantidad * presentacion.price,
          sinStock: unitsBase > producto.stock,
        },
      ]);
    }

    this.limpiarProducto();
  }

  cambiarQty(indice: number, delta: number): void {
    this.lineas.update((lineas) =>
      lineas.map((l, i) => {
        if (i !== indice) return l;
        const qty = l.qty + delta;
        if (qty < 1) return l;
        const unitsBase = l.presentacion.unitsBase * qty;
        return {
          ...l,
          qty,
          unitsBase,
          subtotal: qty * l.presentacion.price,
          sinStock: unitsBase > l.producto.stock,
        };
      }),
    );
  }

  quitarLinea(indice: number): void {
    this.lineas.update((lineas) => lineas.filter((_, i) => i !== indice));
  }

  /* ── Envío ── */

  puedeRegistrar(): boolean {
    if (this.lineas().length === 0 || this.hayItemsInvalidos() || this.guardando()) return false;
    if (this.esCredito()) {
      if (!this.form.controls.clienteId.value) return false;
      if (this.clienteSinCupo() || this.excedeCredito()) return false;
    }
    return true;
  }

  registrar(): void {
    const request: VentaRequest = {
      type: this.form.controls.type.value,
      clienteId: this.esCredito() ? this.form.controls.clienteId.value : null,
      saleDate: this.form.controls.saleDate.value
        ? `${this.form.controls.saleDate.value}T00:00:00`
        : null,
      detalles: this.lineas().map<DetalleVentaRequest>((l) => ({
        productoId: l.producto.id,
        presentacionId: l.presentacion.id,
        qty: l.qty,
      })),
    };

    this.guardando.set(true);
    this.error.set('');

    this.ventas.registrar(request).subscribe({
      next: (venta) => {
        this.guardando.set(false);
        this.notificacion.exito(`Venta ${venta.document} registrada`);
        void this.router.navigate(['/ventas', venta.id]);
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        const codigo = codigoDeError(err);
        this.error.set(mensajeDeError(err));
        if (codigo === 'STK_001') {
          this.notificacion.aviso('Revisa las cantidades: el stock cambió desde que agregaste los ítems.');
        }
      },
    });
  }

  volver(): void {
    void this.router.navigate(['/ventas']);
  }
}