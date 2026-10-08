# Chavez Store — Frontend

Aplicación web del sistema interno de control de **stock, compras, ventas, clientes y
ganancias** para una botillería.

| | |
|---|---|
| Framework | Angular 20 (standalone, rutas lazy) |
| UI | Angular Material 3 (M3) |
| Gráficas | Chart.js + ng2-charts |
| Backend | `chavez-store-backend` (Spring Boot) en `http://localhost:8080` |

> La venta es un **asiento interno**: documenta la salida de stock y la utilidad generada.
> No registra cobro de mostrador, no emite comprobante ni métodos de pago por venta.
> El único dinero que entra al sistema son los **abonos** de clientes con crédito.

---

## Requisitos

| Herramienta | Versión |
|-------------|---------|
| Node.js | 20 o superior |
| npm | 10 o superior |

No hace falta instalar el backend para levantar la interfaz, pero sí para que los datos
carguen: sin backend verás errores de red en cada pantalla.

---

## Correr

```bash
npm install
npm start
```

Queda en `http://localhost:4200`.

### Proxy y CORS

`npm start` ya usa `proxy.conf.json`, que redirige `/api` a `http://localhost:8080`.
Por eso **no necesitas CORS ni tocar la configuración del backend**: el navegador siempre
habla con el puerto 4200 y el proxy reenvía las llamadas.

Si cambiaste el puerto del backend, actualiza el `target` en `proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
```

### Otros comandos

```bash
npm run build   # build de producción en dist/
npm run watch   # build en modo watch
npm test        # tests unitarios (Karma + Jasmine)
```

---

## Primer ingreso

El backend siembra un usuario administrador:

| Campo | Valor |
|-------|-------|
| usuario | `admin` |
| contraseña | `Admin123` |

Cámbiala desde **tu avatar → Cambiar contraseña** al entrar.

---

## Pantallas

| Ruta | Qué hace | Rol mínimo |
|------|----------|------------|
| `/login` | Iniciar sesión | Público |
| `/dashboard` | Resumen del día, alertas de stock, cobranza | Autenticado |
| `/productos` | Catálogo con presentaciones y carga de stock inicial | Autenticado |
| `/ventas/nueva` | Registro de venta interna | ADMIN, CAJERO |
| `/ventas` | Listado y detalle de ventas | Autenticado |
| `/inventario` | Stock, mermas, ajustes y verificación de cuadre | Autenticado |
| `/inventario/kardex/:id` | Kardex de un producto | Autenticado |
| `/compras` | Compras y recepción en almacén | Autenticado |
| `/proveedores` | Proveedores | Autenticado |
| `/clientes` | Clientes, crédito y abonos | Autenticado |
| `/reportes/ganancias` | Ganancia por período (con gráfica diaria) | ADMIN, SUPERVISOR |
| `/reportes/ganancias/categoria` | Margen teórico vs. real por categoría | ADMIN, SUPERVISOR |
| `/reportes/ganancias/producto` | Rotación, margen y días sin venta | ADMIN, SUPERVISOR |
| `/reportes/ventas-por-hora` | Demanda por franja horaria | ADMIN, SUPERVISOR |
| `/reportes/stock` | Stock crítico y lotes por vencer | ADMIN, SUPERVISOR, ALMACENERO |
| `/reportes/mermas` | Mermas por motivo y por producto | ADMIN, SUPERVISOR |
| `/reportes/cuentas-por-cobrar` | Antigüedad de la deuda | ADMIN |
| `/reportes/ventas-del-dia` | Total vendido por día | ADMIN, SUPERVISOR |

El menú lateral ya oculta las secciones no permitidas para tu rol. La autorización real la
aplica el backend, que responde `403 AUTH_006` cuando corresponde: los guards del frontend
son solo de experiencia de usuario.

---

## Estructura

```
src/app/
├── core/                    # capa única, sin componentes
│   ├── enums/               # catálogos ENUM del dominio
│   ├── guards/              # auth.guard, role.guard
│   ├── interceptors/        # jwt.interceptor, error.interceptor
│   ├── models/              # espejo de los DTO del backend
│   ├── services/            # 11 servicios REST
│   └── utils/               # api-base, jwt.util, error-mapeo
├── features/                # una carpeta por módulo, todas lazy
│   ├── auth/                # login, cambio de contraseña
│   ├── dashboard/
│   ├── categorias/  marcas/  productos/
│   ├── ventas/              # registro interno (NO es un POS)
│   ├── clientes/            # CRUD, abonos, límite de crédito
│   ├── inventario/          # stock, kardex, mermas, ajustes
│   ├── proveedores/  compras/
│   └── reportes/            # los 8 reportes
├── layout/shell/            # toolbar y menú lateral por rol
├── shared/                  # componentes, pipes, directivas reutilizables
├── app.config.ts            # providers, interceptors, router
└── app.routes.ts            # rutas con guards por rol
```

Todas las rutas de negocio son lazy (`loadComponent`): el bundle inicial solo carga login
y el shell.

---

## Decisiones que conviene conocer

**La venta no es un POS.** No hay caja, ni arqueo, ni métodos de pago por venta, ni voucher.
La pantalla `/ventas/nueva` es un asiento interno: eliges productos, el servidor calcula el
total, el costo congelado y la utilidad, y el stock sale por lotes en orden FEFO.

**Los totales del formulario son informativos.** La UI calcula un subtotal y un costo
estimado para que veas el efecto de cada línea, pero el importe definitivo lo calcula el
servidor con el costo promedio del momento del registro.

**El precio vive en la presentación de venta, no en el producto.** Un producto como
"Cerveza Cristal 650ml" puede tener `Caja x24` (COMPRA), `Unidad` (VENTA, S/ 4.50) y
`Pack x6` (VENTA, S/ 25.00). El stock siempre está en unidad base.

**No se borra nada.** Una venta mal registrada se anula, una compra recibida se anula, un
abono se anula. Todo queda registrado para preservar la trazabilidad.

---

## Problemas frecuentes

### `Port 4200 is already in use`

```bash
npm start -- --port 4300
```

### Errores de red en todas las pantallas

El backend no está corriendo, o el puerto del `proxy.conf.json` no coincide. Verifica:

```bash
curl http://localhost:8080/api/auth/login
```

### Cierra sesión solo

El JWT dura 24 h. Si el token expiró o el usuario quedó inactivo, el interceptor te
devuelve al login con un aviso. Es el comportamiento esperado.

### Los reportes salen vacíos

Respetan el rango de fechas elegido. Usa los atajos `Hoy`, `7 días` o `Mes actual`.

### Una sección no aparece en el menú

Tu rol no tiene acceso. Revisa la columna "Rol mínimo" en la tabla de arriba.

---

## Convenciones

| Aspecto | Convención |
|---------|-----------|
| Archivos | kebab-case con sufijo: `producto-form-dialog.component.ts` |
| Clases y métodos | PascalCase / camelCase, **en español** |
| Rutas | plural, kebab-case: `/reportes/cuentas-por-cobrar` |
| Errores | Se muestra siempre `message` del backend; el `code` se usa para decisiones |
| Commits | Conventional Commits (`feat:`, `fix:`, `chore:`) |