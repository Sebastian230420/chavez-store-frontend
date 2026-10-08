# Arquitectura — Chavez Store

> Documento de arquitectura técnica. Define **cómo** se construye el sistema.
> Reglas de negocio en `LOGICA_NEGOCIO.md` · Modelo de datos en `MODELO_DATOS.md` · Endpoints en `ESQUEMA_API.md`

---

## 1. Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|----------|
| Backend | Java + Spring Boot | 21 · 4.1.1 |
| Framework web | `spring-boot-starter-webmvc` | (gestor Boot) |
| Persistencia | `spring-boot-starter-data-jpa` + Hibernate | (gestor Boot) |
| Seguridad | `spring-boot-starter-security` + JJWT | 6.x · 0.12.x |
| Validación | `spring-boot-starter-validation` | (gestor Boot) |
| Lombok | `org.projectlombok:lombok` | (gestor Boot) |
| Base de datos | MySQL | 8.x |
| Driver | `com.mysql:mysql-connector-j` | (gestor Boot) |
| Frontend | Angular (TypeScript) | 17+ |
| Build backend | Maven Wrapper (`./mvnw`) | — |

**Paquete base:** `com.chavez.store.api_rest`
**Artefacto:** `api-rest`

---

## 2. Módulos del sistema

Módulos incluidos (según alcance acordado):

| Módulo | Responsabilidad |
|--------|----------------|
| **Auth** | Login, emisión/validación de JWT, bloqueo por intentos |
| **Catálogo** | Productos, **presentaciones**, categorías, marcas |
| **Inventario** | Kardex, **lotes/vencimiento**, mermas, ajustes, stock crítico |
| **Compras** | Ingreso a almacén, recálculo de costo promedio, lotes |
| **Ventas** | **Registro interno** de venta a crédito, anulación |
| **Clientes** | Registro, límites de crédito, abonos, cobranza |
| **Reportes** | Ganancias, categoría, productos, mermas, cobranza |

Módulos **fuera de alcance** (decisión tomada):
- Facturación electrónica / fiscal
- Entrega a domicilio (delivery)
- Listas de precio / precio mayorista
- POS de mostrador, caja por turno, arqueo, métodos de pago por venta
- Voucher o comprobante para el cliente final

> Las ventas son un **asiento interno**: documentan la salida de stock y la utilidad generada.
> No hay cobro, no hay punto de venta al público. El único registro de dinero recibido
> son los `abonos` de clientes con crédito. Ver `LOGICA_NEGOCIO.md` §1.

---

## 3. Estructura del proyecto

```
chavez-store/
├── api-rest/                                  ← backend Spring Boot
│   ├── mvnw / mvnw.cmd
│   ├── pom.xml
│   ├── HELP.md
│   └── src/
│       ├── main/
│       │   ├── java/com/chavez/store/api_rest/
│       │   │   ├── ApiRestApplication.java
│       │   │   │
│       │   │   ├── config/                    ← configuración global
│       │   │   │   ├── SecurityConfig.java
│       │   │   │   ├── JwtAuthenticationFilter.java
│       │   │   │   ├── CorsConfig.java
│       │   │   │   └── OpenApiConfig.java            (opcional)
│       │   │   │
│       │   │   ├── controller/                ← capa de presentación
│       │   │   │   ├── AuthController.java
│       │   │   │   ├── ProductoController.java
│       │   │   │   ├── PresentacionController.java
│       │   │   │   ├── CompraController.java
│       │   │   │   ├── VentaController.java
│       │   │   │   ├── ClienteController.java
│       │   │   │   ├── InventarioController.java
│       │   │   │   └── ReporteController.java
│       │   │   │
│       │   │   ├── service/                   ← capa de lógica de negocio
│       │   │   │   ├── IAuthService.java
│       │   │   │   ├── IProductoService.java
│       │   │   │   ├── ICompraService.java
│       │   │   │   ├── IVentaService.java
│       │   │   │   ├── IClienteService.java
│       │   │   │   ├── IInventarioService.java
│       │   │   │   ├── IReporteService.java
│       │   │   │   └── impl/
│       │   │   │       ├── AuthServiceImpl.java
│       │   │   │       ├── ProductoServiceImpl.java
│       │   │   │       ├── CompraServiceImpl.java
│       │   │   │       ├── VentaServiceImpl.java
│       │   │   │       ├── ClienteServiceImpl.java
│       │   │   │       ├── InventarioServiceImpl.java
│       │   │   │       └── ReporteServiceImpl.java
│       │   │   │
│       │   │   ├── repository/                ← acceso a datos
│       │   │   │   ├── dao/
│       │   │   │   │   ├── IUserDAO.java
│       │   │   │   │   ├── IProductoDAO.java
│       │   │   │   │   ├── IPresentacionDAO.java
│       │   │   │   │   ├── ILoteDAO.java
│       │   │   │   │   ├── IMovimientoDAO.java
│       │   │   │   │   ├── ICompraDAO.java
│       │   │   │   │   ├── IVentaDAO.java
│       │   │   │   │   ├── IClienteDAO.java
│       │   │   │   │   ├── IAbonoDAO.java
│       │   │   │   │   └── impl/
│       │   │   │   │       ├── UserDAOImpl.java
│       │   │   │   │       ├── ProductoDAOImpl.java
│       │   │   │   │       ├── PresentacionDAOImpl.java
│       │   │   │   │       ├── LoteDAOImpl.java
│       │   │   │   │       ├── MovimientoDAOImpl.java
│       │   │   │   │       ├── CompraDAOImpl.java
│       │   │   │   │       ├── VentaDAOImpl.java
│       │   │   │   │       ├── ClienteDAOImpl.java
│       │   │   │   │       └── AbonoDAOImpl.java
│       │   │   │
│       │   │   ├── entity/                    ← entidades JPA
│       │   │   │   ├── User.java
│       │   │   │   ├── Role.java
│       │   │   │   ├── Categoria.java
│       │   │   │   ├── Marca.java
│       │   │   │   ├── Producto.java
│       │   │   │   ├── Presentacion.java
│       │   │   │   ├── Proveedor.java
│       │   │   │   ├── Compra.java
│       │   │   │   ├── DetalleCompra.java
│       │   │   │   ├── Lote.java
│       │   │   │   ├── MovimientoStock.java
│       │   │   │   ├── Cliente.java
│       │   │   │   ├── Venta.java
│       │   │   │   ├── DetalleVenta.java
│       │   │   │   └── Abono.java
│       │   │   │
│       │   │   ├── dto/
│       │   │   │   ├── request/
│       │   │   │   │   ├── LoginRequestDTO.java
│       │   │   │   │   ├── ProductoRequestDTO.java
│       │   │   │   │   ├── PresentacionRequestDTO.java
│       │   │   │   │   ├── CompraRequestDTO.java
│       │   │   │   │   ├── VentaRequestDTO.java
│       │   │   │   │   ├── ClienteRequestDTO.java
│       │   │   │   │   ├── MermaRequestDTO.java
│       │   │   │   │   └── AbonoRequestDTO.java
│       │   │   │   └── response/
│       │   │   │       ├── JwtResponseDTO.java
│       │   │   │       ├── ProductoResponseDTO.java
│       │   │   │       ├── VentaResponseDTO.java
│       │   │   │       ├── CompraResponseDTO.java
│       │   │   │       ├── ClienteResponseDTO.java
│       │   │   │       ├── KardexResponseDTO.java
│       │   │   │       ├── MermaResponseDTO.java
│       │   │   │       └── ReporteResponseDTO.java
│       │   │   │
│       │   │   ├── security/                  ← JWT y seguridad
│       │   │   │   ├── JwtTokenProvider.java
│       │   │   │   ├── CustomUserDetails.java
│       │   │   │   ├── UserDetailsServiceImpl.java
│       │   │   │   └── JwtAuthenticationEntryPoint.java
│       │   │   │
│       │   │   ├── mapper/                    ← conversión Entity <-> DTO
│       │   │   │   ├── ProductoMapper.java
│       │   │   │   ├── VentaMapper.java
│       │   │   │   ├── CompraMapper.java
│       │   │   │   └── ClienteMapper.java
│       │   │   │
│       │   │   ├── enums/
│       │   │   │   ├── TipoMovimientoStock.java
│       │   │   │   ├── TipoPresentacion.java
│       │   │   │   ├── EstadoVenta.java
│       │   │   │   ├── EstadoCompra.java
│       │   │   │   ├── TipoVenta.java
│      │   │   │   ├── MetodoPago.java
│       │   │   │   ├── TipoCliente.java
│       │   │   │   └── UnidadBase.java
│       │   │   │
│       │   │   └── exception/
│       │   │       ├── GlobalExceptionHandler.java
│       │   │       ├── ApiErrorDTO.java
│       │   │       ├── BusinessException.java
│       │   │       ├── ResourceNotFoundException.java
│       │   │       ├── InvalidCredentialsException.java
│       │   │       ├── AccountLockedException.java
│       │   │       ├── UnauthorizedRoleException.java
│       │   │       ├── InsufficientStockException.java
│       │   │       ├── InventoryMismatchException.java
│       │   │       ├── SaleStateException.java
│       │   │       ├── PaymentLimitExceededException.java
│       │   │       ├── DuplicateSkuException.java
│       │   │       └── InvalidSaleDateException.java
│       │   │
│       │   └── resources/
│       │       ├── application.yml
│       │       └── db/
│       │           └── schema.sql              (ver MODELO_DATOS.md §4)
│       └── test/
│           └── java/com/chavez/store/api_rest/
│               ├── service/
│               │   ├── AuthServiceImplTest.java
│               │   ├── ProductoServiceImplTest.java
│               │   ├── VentaServiceImplTest.java
│               │   ├── CompraServiceImplTest.java
│               │   └── InventarioServiceImplTest.java
│               └── controller/
│                   └── AuthControllerTest.java
│
├── frontend/                                  ← Angular
│   ├── angular.json
│   ├── package.json
│   └── src/app/
│       ├── core/
│       │   ├── interceptors/
│       │   │   └── jwt.interceptor.ts
│       │   ├── guards/
│       │   │   └── auth.guard.ts
│       │   ├── services/
│       │   │   ├── auth.service.ts
│       │   │   ├── producto.service.ts
│       │   │   ├── venta.service.ts
│       │   │   ├── compra.service.ts
│       │   │   ├── cliente.service.ts
│       │   │   └── reporte.service.ts
│       │   └── models/
│           ├── producto.model.ts
│           ├── venta.model.ts
│           ├── jwt-response.model.ts
│           └── ...
│       ├── features/
│       │   ├── auth/login/
│       │   ├── pos/                            ← punto de venta
│       │   ├── productos/
│       │   ├── inventario/
│       │   ├── compras/
│       │   ├── clientes/
│       │   └── reportes/
│       ├── shared/
│       │   └── components/
│       ├── app.component.ts
│       ├── app.config.ts
│       └── app.routes.ts
│
├── ARQUITECTURA.md      ← este documento
├── LOGICA_NEGOCIO.md    ← reglas de negocio
├── MODELO_DATOS.md      ← modelo de datos + DDL
└── ESQUEMA_API.md       ← endpoints REST
```

---

## 4. Arquitectura por capas (backend)

```
Controller ──► IXxxService ──► IProductoDAO ──► ProductoDAOImpl ──► MySQL
 (HTTP)        (contrato)      (interfaz)        (implementación)   (BD)
    │              │                │                    │
 DTO request/   interface     extends JpaRepository    @Repository
 response       + Impl        (contrato de datos)      (queries reales)
```

**Service y DAO usan el mismo patrón: interfaz `I` + implementación `Impl`.**

| Capa | Interfaz | Implementación |
|------|----------|----------------|
| Servicio | `IVentaService` | `VentaServiceImpl` |
| Acceso a datos | `IProductoDAO` | `ProductoDAOImpl` |

### 4.1 Controller (capa de presentación)
Responsabilidad: **solo HTTP**.
- Mapea `HttpRequest` → DTO de request.
- Invoca `IXxxService`.
- Mapea resultado → DTO de response.

```java
@RestController
@RequestMapping("/api/productos")
@RequiredArgsConstructor          // Lombok: inyección por constructor
public class ProductoController {

    private final IProductoService productoService;

    @GetMapping
    public ResponseEntity<List<ProductoResponseDTO>> listar() {
        return ResponseEntity.ok(productoService.listarTodos());
    }

    @PostMapping
    public ResponseEntity<ProductoResponseDTO> crear(
            @Valid @RequestBody ProductoRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                             .body(productoService.crear(request));
    }
}
```

**Prohibido:** lógica de negocio, acceso directo al DAO, Entity en la respuesta.

### 4.2 Service (capa de lógica de negocio)
Contrato en la interfaz, implementación en `Impl`. **Aquí viven todas las reglas de negocio.**

```java
public interface IVentaService {
    VentaResponseDTO registrar(VentaRequestDTO request);
    VentaResponseDTO anular(Long id, AnularVentaRequestDTO request);
    List<VentaResponseDTO> listar(Pageable pageable);
}

@Service
@RequiredArgsConstructor
public class VentaServiceImpl implements IVentaService {

    private final IVentaDAO ventaDAO;
    private final IProductoDAO productoDAO;
    private final ILoteDAO loteDAO;
    private final IMovimientoDAO movimientoDAO;
    private final VentaMapper ventaMapper;

    @Override
    @Transactional
    public VentaResponseDTO registrar(VentaRequestDTO request) {
        // Toda la lógica de negocio aquí (R-V-01 … R-V-18)
        return ventaMapper.toResponseDTO(venta);
    }
}
```

**Prohibido:** anotaciones JPA, `EntityManager`,JPQL o SQL dentro del Service.

### 4.3 DAO (acceso a datos)
Patrón **interfaz + implementación**:

- `IXxxDAO` — interfaz que extiende `JpaRepository`. Declara los métodos de lectura y las queries derivadas.
- `XxxDAOImpl` — implementación anotada con `@Repository`. Solo se crea **cuando la interfaz necesita lógica de persistencia** (consultas manuales con `EntityManager`, composición de criterios, projections, consultas nativas).

```
repository/
├── dao/
│   ├── IProductoDAO.java          ← interfaz
│   ├── ILoteDAO.java
│   └── impl/
│       ├── ProductoDAOImpl.java   ← implementación
│       └── LoteDAOImpl.java
```

**Interfaz del DAO:**
```java
public interface IProductoDAO extends JpaRepository<Producto, Long> {

    // ── Queries derivadas por convención (no necesitan implementación) ──
    boolean existsBySku(String sku);
    boolean existsByBarcode(String barcode);
    Optional<Producto> findBySku(String sku);
    List<Producto> findByCategoriaIdAndActiveTrue(Long categoriaId);
    Page<Producto> findByActiveTrue(Pageable pageable);

    // ── Queries que necesitan @Query (van en la interfaz, Spring los resuelve) ──

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Producto p where p.id = :id")
    Optional<Producto> findByIdForUpdate(@Param("id") Long id);

    @Query("""
        select p from Producto p
        where p.stock <= p.minStock and p.active = true
        """)
    List<Producto> findStockCritico();
}
```

**Implementación del DAO** (solo para lo que la interfaz no resuelve):
```java
@Repository
@RequiredArgsConstructor
public class ProductoDAOImpl implements IProductoDAO {

    private final EntityManager entityManager;

    // ── Queries derivadas: la interfaz las resuelve, aquí no se sobrescriben ──

    // ── Método con lógica de persistencia → sí se implementa ──

    @Override
    @Query("""
        select p from Producto p
        join p.presentaciones pr
        where pr.tipo = :tipo and pr.active = true
        group by p.id
        """)
    public List<Producto> findAllConPresentacionActiva(TipoPresentacion tipo) {
        // Si se declara @Query con valor, Spring lo ejecuta: cuerpo vacío o
        // se deja solo la anotación. Para lógica real se usa EntityManager.
        return List.of();
    }

    // ── Reportes nativos (no expresables en JPQL) ──
    public List<Object[]> ventasPorCategoria(LocalDateTime desde, LocalDateTime hasta) {
        String sql = """
            SELECT c.name,
                   SUM(sd.qty * sd.units_base)        AS unidades,
                   SUM(sd.subtotal)                    AS ingresos,
                   SUM(sd.qty * sd.units_base * sd.unit_cost) AS costo
            FROM sale_details sd
            JOIN sales s        ON s.id = sd.sale_id
            JOIN products p     ON p.id = sd.product_id
            JOIN categories c   ON c.id = p.category_id
            WHERE s.status = 'PAGADA'
              AND s.sale_date BETWEEN :desde AND :hasta
            GROUP BY c.name
            """;
        return entityManager.createNativeQuery(sql)
                             .setParameter("desde", desde)
                             .setParameter("hasta", hasta)
                             .getResultList();
    }

    // ── Verificación del invariante de inventario (R-I-04) ──
    public List<Object[]> verificarInvarianteStock() {
        String sql = """
            SELECT p.id, p.sku, p.stock,
                   COALESCE(SUM(m.qty), 0) AS stock_real
            FROM products p
            LEFT JOIN stock_movements m ON m.product_id = p.id
            GROUP BY p.id, p.sku, p.stock
            HAVING p.stock <> COALESCE(SUM(m.qty), 0)
            """;
        return entityManager.createNativeQuery(sql).getResultList();
    }
}
```

**DAO de lotes** (consulta FEFO):
```java
public interface ILoteDAO extends JpaRepository<Lote, Long> {

    // FEFO: el lote que vence primero primero
    @Query("""
        select l from Lote l
        where l.producto.id = :productoId
          and l.qtyRemaining > 0
        order by l.expiryDate asc nulls last, l.id asc
        """)
    List<Lote> findLotesFEFO(@Param("productoId") Long productoId);

    @Query("""
        select l from Lote l
        where l.expiryDate between :desde and :hasta
          and l.qtyRemaining > 0
        order by l.expiryDate asc
        """)
    List<Lote> findLotesPorVencer(@Param("desde") LocalDate desde,
                                  @Param("hasta") LocalDate hasta);
}
```

**Reglas de la capa DAO:**
1. La interfaz `IXxxDAO` **siempre** extiende `JpaRepository<Entidad, Long>`.
2. Queries derivadas y `@Query` con valor van **en la interfaz** (Spring los resuelve).
3. `XxxDAOImpl` se crea **solo** si hay lógica de persistencia (nativas, `EntityManager`, projections compuestas).
4. Si se crea `XxxDAOImpl` para una interfaz simple, el cuerpo queda vacío — no hay valor agregado.
5. **Prohibido:** lógica de negocio, validaciones de negocio, orquestación de varias tablas.
6. Prefijo `I` en la interfaz, sufijo `Impl` en la implementación. Nombres en español.

### 4.4 Entity
Mapeo JPA de las tablas. **Nunca se expone directamente en la API.**

```java
@Entity
@Table(name = "products")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Producto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String sku;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private UnidadBase baseUnit;

    @Column(nullable = false) private Integer stock;      // cacheado, unidad base
    @Column(nullable = false, precision = 12, scale = 4) private BigDecimal costAvg;
    @Column(nullable = false) private Integer minStock;

    @Version private Long version;   // optimistic locking

    @OneToMany(mappedBy = "producto", cascade = CascadeType.ALL)
    private List<Presentacion> presentaciones;
}
```

### 4.5 DTOs
Separación estricta entre API y base de datos.

| Tipo | Para qué |
|------|----------|
| **RequestDTO** | Entrada desde el cliente. Validado con Bean Validation. |
| **ResponseDTO** | Salida hacia el cliente. Nunca expone campos internos. |

```java
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class VentaRequestDTO {
    @NotNull private TipoVenta type;   // MOSTRADOR | CREDITO

    // Requerido solo si type = CREDITO (validado en Service: R-V-13)
    private Long clienteId;

    // Opcional: permite registrar ventas de días anteriores (R-V-17)
    @PastOrPresent
    private LocalDateTime saleDate;

    @NotEmpty(message = "La venta debe tener al menos un ítem")
    @Valid
    private List<DetalleVentaRequestDTO> detalles;

    // Registro interno: sin pagos, sin voucher (R-V-14)
}

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class DetalleVentaRequestDTO {
    @NotNull private Long productoId;
    @NotNull private Long presentacionId;
    @NotNull @Min(1) private Integer qty;   // cantidad en la presentación
}
```

### 4.6 Mapper
Conversión Entity ↔ DTO. Manual o con MapStruct.

```java
// Manual
@Component
public class VentaMapper {
    public VentaResponseDTO toResponseDTO(Venta venta) {
        return VentaResponseDTO.builder()
            .id(venta.getId())
            .document(venta.getDocument())
            .total(venta.getTotal())
            .profit(venta.getProfit())
            .build();
    }
}
```

```java
// MapStruct (pom.xml: org.mapstruct:mapstruct)
@Mapper(componentModel = "spring")
public interface ProductoMapper {
    ProductoResponseDTO toResponseDTO(Producto producto);
    List<ProductoResponseDTO> toResponseDTOList(List<Producto> productos);
}
```

### 4.7 Excepciones y manejo global
Todas las excepciones de negocio extienden `BusinessException`. Un `@RestControllerAdvice` las traduce a JSON.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorDTO> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ApiErrorDTO(ex.getCode(), ex.getMessage(), null));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiErrorDTO> handleBusiness(BusinessException ex) {
        return ResponseEntity.unprocessableEntity()
            .body(new ApiErrorDTO(ex.getCode(), ex.getMessage(), null));
    }
}
```

Formato de error estandarizado:
```json
{
  "code": "STK_001",
  "message": "Stock insuficiente: disponible 5, solicitado 10",
  "timestamp": "2026-10-08T14:30:00",
  "path": "/api/ventas"
}
```

---

## 5. Flujo JWT cliente-servidor

```
┌────────────┐                             ┌──────────────────┐
│  Angular   │  POST /api/auth/login        │   Spring Boot    │
│  Client    │ ──────────────────────────►  │                  │
│            │  { username, password }       │  AuthController  │
│            │                              │  → AuthService   │
│            │                              │  → BCrypt.verify │
│            │  ◄──────────────────────────  │  → JwtTokenProv. │
│            │  { token, expiresIn, roles }  │                  │
│            │                              │                  │
│            │  GET /api/ventas              │                  │
│            │  Authorization: Bearer <jwt>  │  JwtAuthFilter   │
│            │ ──────────────────────────►  │  → validate      │
│            │                              │  → set Auth ctx  │
│            │                              │  → VentaController│
│            │  ◄──────────────────────────  │                  │
│            │  200 OK (JSON)                │                  │
└────────────┘                              └──────────────────┘
```

### 5.1 JwtTokenProvider
Genera y valida el token con la librería JJWT.

```java
@Component
public class JwtTokenProvider {
    @Value("${jwt.secret}") private String secretKey;
    @Value("${jwt.expiration-ms}") private long expirationMs;

    public String generateToken(UserDetails userDetails) {
        return Jwts.builder()
            .setSubject(userDetails.getUsername())
            .claim("roles", userDetails.getAuthorities().stream()
                                .map(GrantedAuthority::getAuthority).toList())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
            .signWith(getSigningKey())
            .compact();
    }

    public boolean validateToken(String token) {
        try {
            return !isTokenExpired(claims(token));
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
```

### 5.2 JwtAuthenticationFilter
Intercepta cada request y extrae el usuario del token.

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenProvider provider;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpRequest req, HttpResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        String token = extractToken(req);
        if (token != null && provider.validateToken(token)) {
            String username = provider.getUsernameFromToken(token);
            UserDetails user = userDetailsService.loadUserByUsername(username);
            var auth = new UsernamePasswordAuthenticationToken(
                user, null, user.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        chain.doFilter(req, res);
    }

    private String extractToken(HttpRequest req) {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
```

### 5.3 SecurityConfig
```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/ventas/**")
                    .hasAnyRole("CAJERO", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/**")
                    .hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter,
                             UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtAuthEntryPoint))
            .build();
    }
}
```

### 5.4 application.yml
```yaml
server:
  port: 8080

spring:
  application:
    name: chavez-store-api
  datasource:
    url: jdbc:mysql://localhost:3306/chavez_store?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
    username: root
    password: ${DB_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver
  jpa:
    hibernate:
      ddl-auto: validate    # validar contra el esquema real
    show-sql: true
    open-in-view: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true

jwt:
  secret: ${JWT_SECRET:cambiar-esta-clave-por-una-de-al-menos-256-bits-en-prod}
  expiration-ms: 86400000   # 24 horas

logging:
  level:
    com.chavez.store: DEBUG
```

---

## 6. Frontend Angular

### 6.1 Estructura de capas
```
Component (UI)
    │ llama a
Service (HttpClient + lógica de presentación)
    │ llama a
Interceptor (agrega JWT) → Backend
```

### 6.2 JwtInterceptor
Agrega el header `Authorization` a cada request saliente.

```typescript
@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');
    if (token) {
      request = request.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }
    return next.handle(request).pipe(
      catchError((error) => {
        if (error.status === 401) {
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
```

### 6.3 AuthGuard
Protege rutas privadas.

```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    return this.authService.isAuthenticated()
      ? true
      : (this.router.navigate(['/login']), false);
  }
}
```

### 6.4 AuthService
```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private tokenKey = 'token';

  login(credentials: LoginRequest): Observable<JwtResponse> {
    return this.http.post<JwtResponse>('/api/auth/login', credentials).pipe(
      tap((res) => localStorage.setItem(this.tokenKey, res.token))
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
```

---

## 7. Dependencias faltantes en `pom.xml`

El `pom.xml` actual incluye solo `data-jpa`, `webmvc`, `mysql-connector`, `lombok` y tests. **Faltan** las dependencias de seguridad y validación necesarias para JWT y Bean Validation:

```xml
<!-- Falta: validación de DTOs (@NotBlank, @Valid, etc.) -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>

<!-- Falta: Spring Security para JWT -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- Falta: JWT (jjwt) -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>

<!-- Opcional: tests de seguridad -->
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

> Nota: en Spring Boot 4 los starters de test son `spring-boot-starter-data-jpa-test` y `spring-boot-starter-webmvc-test` (ya presentes en el `pom.xml`).

---

## 8. Convenciones

| Aspecto | Convención |
|---------|-----------|
| Nombres de clases | PascalCase, **en español** |
| Nombres de métodos | camelCase |
| Nombres de tablas | `snake_case` plural (en inglés, es la BD) |
| Nombres de columnas | `snake_case` |
| Interfaces Service | Prefijo `I` (ej: `IVentaService`) |
| Implementaciones Service | Sufijo `Impl` (ej: `VentaServiceImpl`) |
| Interfaces DAO | Prefijo `I` + sufijo `DAO` (ej: `IProductoDAO`) |
| Implementaciones DAO | Sufijo `DAOImpl` (ej: `ProductoDAOImpl`) |
| Paquetes DAO | `repository/dao/` y `repository/dao/impl/` |
| DTOs | Sufijo `RequestDTO` / `ResponseDTO` |
| Enums | Sufijo de tipo (ej: `TipoVenta`, `EstadoVenta`) |
| Excepciones | Sufijo `Exception` (ej: `InsufficientStockException`) |
| Endpoints | plural, kebab-case (ej: `/api/productos`) |
| Campos booleanos | `active`, prefijados con `is` en Lombok |
| Commits | Conventional Commits (`feat:`, `fix:`, `chore:`) |

---

## 9. Resumen de responsabilidades

| Capa | Interfaz | Implementación | Puede contener |
|------|----------|----------------|-----------------|
| **Controller** | — | `ProductoController` | Anotaciones web, DTO, validación de formato |
| **Service** | `IVentaService` | `VentaServiceImpl` | **Reglas de negocio**, transacciones, orquestación |
| **DAO** | `IProductoDAO` | `ProductoDAOImpl` | Queries, `@Query`, JPQL/nativo, `EntityManager` |
| **Entity** | — | `Producto` | Mapeo JPA de la tabla |
| **DTO** | — | `VentaRequestDTO` | Contrato de la API, Bean Validation |
| **Mapper** | — | `VentaMapper` | Conversión Entity ↔ DTO |

> **Regla de oro:** ninguna regla de negocio se implementa en el `Controller` ni en el `DAO`.
> Toda validación de negocio pasa por `XxxServiceImpl`, que lanza excepciones del catálogo (`LOGICA_NEGOCIO.md` §6).

**Dirección de dependencias:** `Controller → Service → DAO → MySQL`. Nunca al revés.
Un `DAO` no llama a un `Service`. Un `Service` no conoce entidades de otros módulos.