import { Rol } from '../../core/enums';

export interface MenuItem {
  etiqueta: string;
  icono: string;
  /** Ruta absoluta del router. */
  ruta: string;
  /** Roles con acceso. Vacío = cualquier usuario autenticado. */
  roles: Rol[];
  /** Abre en pestaña nueva. */
  externo?: boolean;
}

export interface MenuGrupo {
  titulo: string;
  items: MenuItem[];
}

/**
 * Menú lateral. Los roles coinciden con la matriz de ESQUEMA_API.md §13.
 * El filtrado real de navegación vive en `app.routes.ts`; este listado
 * solo evita mostrar entradas que llevarían a un 403.
 */
export const MENU: MenuGrupo[] = [
  {
    titulo: 'General',
    items: [
      { etiqueta: 'Dashboard', icono: 'dashboard', ruta: '/dashboard', roles: [] },
      {
        etiqueta: 'Registrar venta',
        icono: 'point_of_sale',
        ruta: '/ventas/nueva',
        roles: [Rol.ADMIN, Rol.CAJERO],
      },
    ],
  },
  {
    titulo: 'Catálogo',
    items: [
      { etiqueta: 'Productos', icono: 'inventory_2', ruta: '/productos', roles: [] },
      { etiqueta: 'Categorías', icono: 'category', ruta: '/categorias', roles: [] },
      { etiqueta: 'Marcas', icono: 'sell', ruta: '/marcas', roles: [] },
    ],
  },
  {
    titulo: 'Operación',
    items: [
      { etiqueta: 'Inventario', icono: 'warehouse', ruta: '/inventario', roles: [] },
      { etiqueta: 'Compras', icono: 'local_shipping', ruta: '/compras', roles: [] },
      { etiqueta: 'Proveedores', icono: 'store', ruta: '/proveedores', roles: [] },
      { etiqueta: 'Clientes', icono: 'people', ruta: '/clientes', roles: [] },
    ],
  },
  {
    titulo: 'Análisis',
    items: [
      {
        etiqueta: 'Ventas del día',
        icono: 'today',
        ruta: '/reportes/ventas-del-dia',
        roles: [Rol.ADMIN, Rol.SUPERVISOR],
      },
      {
        etiqueta: 'Ganancias',
        icono: 'trending_up',
        ruta: '/reportes/ganancias',
        roles: [Rol.ADMIN, Rol.SUPERVISOR],
      },
      {
        etiqueta: 'Stock y vencimientos',
        icono: 'warning_amber',
        ruta: '/reportes/stock',
        roles: [Rol.ADMIN, Rol.SUPERVISOR, Rol.ALMACENERO],
      },
      {
        etiqueta: 'Mermas',
        icono: 'delete_outline',
        ruta: '/reportes/mermas',
        roles: [Rol.ADMIN, Rol.SUPERVISOR],
      },
      {
        etiqueta: 'Cuentas por cobrar',
        icono: 'account_balance_wallet',
        ruta: '/reportes/cuentas-por-cobrar',
        roles: [Rol.ADMIN],
      },
    ],
  },
];