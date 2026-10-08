import { Routes } from '@angular/router';
import { Rol } from './core/enums';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ShellComponent } from './layout/shell/shell.component';

/**
 * Rutas del frontend.
 * Los roles por sección siguen la matriz de ESQUEMA_API.md §13.
 * El guard es solo UX: el backend sigue siendo quien autoriza (AUTH_006).
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    title: 'Iniciar sesión · Chavez Store',
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Dashboard · Chavez Store',
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/productos/productos.component').then((m) => m.ProductosComponent),
        canActivate: [roleGuard],
        data: { roles: [] },
        title: 'Productos · Chavez Store',
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./features/categorias/categorias.component').then((m) => m.CategoriasComponent),
        title: 'Categorías · Chavez Store',
      },
      {
        path: 'marcas',
        loadComponent: () =>
          import('./features/marcas/marcas.component').then((m) => m.MarcasComponent),
        title: 'Marcas · Chavez Store',
      },
      {
        path: 'ventas/nueva',
        loadComponent: () =>
          import('./features/ventas/venta-form.component').then((m) => m.VentaFormComponent),
        canActivate: [roleGuard],
        data: { roles: [Rol.ADMIN, Rol.CAJERO] },
        title: 'Registrar venta · Chavez Store',
      },
      {
        path: 'ventas/:id',
        loadComponent: () =>
          import('./features/ventas/venta-detalle.component').then((m) => m.VentaDetalleComponent),
        title: 'Detalle de venta · Chavez Store',
      },
      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/ventas/ventas.component').then((m) => m.VentasComponent),
        title: 'Ventas · Chavez Store',
      },
      {
        path: 'clientes/:id',
        loadComponent: () =>
          import('./features/clientes/cliente-detalle.component').then(
            (m) => m.ClienteDetalleComponent,
          ),
        title: 'Detalle de cliente · Chavez Store',
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/clientes.component').then((m) => m.ClientesComponent),
        title: 'Clientes · Chavez Store',
      },
      {
        path: 'inventario/kardex/:id',
        loadComponent: () =>
          import('./features/inventario/kardex.component').then((m) => m.KardexComponent),
        title: 'Kardex · Chavez Store',
      },
      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/inventario.component').then((m) => m.InventarioComponent),
        title: 'Inventario · Chavez Store',
      },
      {
        path: 'compras/nueva',
        loadComponent: () =>
          import('./features/compras/compra-form.component').then((m) => m.CompraFormComponent),
        canActivate: [roleGuard],
        data: { roles: [Rol.ADMIN, Rol.ALMACENERO] },
        title: 'Registrar compra · Chavez Store',
      },
      {
        path: 'compras/:id',
        loadComponent: () =>
          import('./features/compras/compra-detalle.component').then((m) => m.CompraDetalleComponent),
        title: 'Detalle de compra · Chavez Store',
      },
      {
        path: 'compras',
        loadComponent: () =>
          import('./features/compras/compras.component').then((m) => m.ComprasComponent),
        title: 'Compras · Chavez Store',
      },
      {
        path: 'proveedores',
        loadComponent: () =>
          import('./features/proveedores/proveedores.component').then(
            (m) => m.ProveedoresComponent,
          ),
        title: 'Proveedores · Chavez Store',
      },
      {
        path: 'reportes',
        canActivate: [roleGuard],
        data: { roles: [Rol.ADMIN, Rol.SUPERVISOR, Rol.ALMACENERO] },
        loadComponent: () =>
          import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'ganancias' },
          {
            path: 'ganancias',
            canActivate: [roleGuard],
            data: { roles: [Rol.ADMIN, Rol.SUPERVISOR] },
            loadComponent: () =>
              import('./features/reportes/reporte-ganancias.component').then(
                (m) => m.ReporteGananciasComponent,
              ),
          },
          {
            path: 'ganancias/categoria',
            canActivate: [roleGuard],
            data: { roles: [Rol.ADMIN, Rol.SUPERVISOR] },
            loadComponent: () =>
              import('./features/reportes/reporte-ganancias-categoria.component').then(
                (m) => m.ReporteGananciasCategoriaComponent,
              ),
          },
          {
            path: 'ganancias/producto',
            canActivate: [roleGuard],
            data: { roles: [Rol.ADMIN, Rol.SUPERVISOR] },
            loadComponent: () =>
              import('./features/reportes/reporte-ganancias-producto.component').then(
                (m) => m.ReporteGananciasProductoComponent,
              ),
          },
          {
            path: 'ventas-por-hora',
            canActivate: [roleGuard],
            data: { roles: [Rol.ADMIN, Rol.SUPERVISOR] },
            loadComponent: () =>
              import('./features/reportes/reporte-ventas-por-hora.component').then(
                (m) => m.ReporteVentasPorHoraComponent,
              ),
          },
          {
            path: 'stock',
            canActivate: [roleGuard],
            data: { roles: [Rol.ADMIN, Rol.SUPERVISOR, Rol.ALMACENERO] },
            loadComponent: () =>
              import('./features/reportes/reporte-stock.component').then(
                (m) => m.ReporteStockComponent,
              ),
          },
          {
            path: 'mermas',
            canActivate: [roleGuard],
            data: { roles: [Rol.ADMIN, Rol.SUPERVISOR] },
            loadComponent: () =>
              import('./features/reportes/reporte-mermas.component').then(
                (m) => m.ReporteMermasComponent,
              ),
          },
          {
            path: 'cuentas-por-cobrar',
            canActivate: [roleGuard],
            data: { roles: [Rol.ADMIN] },
            loadComponent: () =>
              import('./features/reportes/reporte-cuentas-por-cobrar.component').then(
                (m) => m.ReporteCuentasPorCobrarComponent,
              ),
          },
          {
            path: 'ventas-del-dia',
            canActivate: [roleGuard],
            data: { roles: [Rol.ADMIN, Rol.SUPERVISOR] },
            loadComponent: () =>
              import('./features/reportes/reporte-ventas-del-dia.component').then(
                (m) => m.ReporteVentasDelDiaComponent,
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];