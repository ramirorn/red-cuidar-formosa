# Graph Report - frontend  (2026-09-25)

## Corpus Check
- 114 files · ~67,255 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 3, .css 1)

## Summary
- 767 nodes · 2244 edges · 42 communities (31 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30

## God Nodes (most connected - your core abstractions)
1. `cn()` - 87 edges
2. `react` - 52 edges
3. `lucide-react` - 44 edges
4. `react-router` - 29 edges
5. `errorAmigable()` - 29 edges
6. `useUsuarioPanel()` - 23 edges
7. `Boton()` - 20 edges
8. `compilerOptions` - 20 edges
9. `Tarjeta()` - 19 edges
10. `useSesionPanel()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Propiedades` --references--> `TipoIntervencion`  [EXTRACTED]
  src/componentes/panel/FormularioIntervencion.tsx → src/tipos/panel.ts
- `TarjetaRuta()` --calls--> `nombreCompleto()`  [EXTRACTED]
  src/paginas/panel/campo/Campo.tsx → src/lib/etiquetasPanel.ts
- `Indicador()` --calls--> `cn()`  [EXTRACTED]
  src/paginas/panel/Resumen.tsx → src/lib/utils.ts
- `Consejos` --calls--> `cn()`  [EXTRACTED]
  src/paginas/vecino/Consejos.tsx → src/lib/utils.ts
- `DisposicionVecino()` --calls--> `cn()`  [EXTRACTED]
  src/paginas/vecino/DisposicionVecino.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (42 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (54): axios-mock-adapter, vitest, clientePublico, clienteVecino, datosDe(), clientePanel, panelApi, RUTAS_SIN_REINTENTO (+46 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (45): @tensorflow-models/coco-ssd, @tensorflow/tfjs, ImagenEvidencia(), Propiedades, useUrlObjeto(), CLASES_COCO, CONFIANZA_MINIMA, NOMBRES_CLASE (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (48): @tanstack/react-query, vecinoApi, useChat(), useColaReportes(), suscribir(), useEnLinea(), aUint8(), EstadoPush (+40 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (31): Calendario(), CLASES_DISPARADOR, Columna(), PropiedadesAccesibles, PropiedadesCalendario, PropiedadesSelectorFecha, PropiedadesSelectorFechaHora, PropiedadesSelectorHora (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (29): recharts, ChipReporte(), ConfianzaIa(), ESTILOS_REPORTE, CargarMas(), useMetricas(), useReportes(), ACCIONES_AUDITORIA (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (24): leaflet, @radix-ui/react-tabs, react-leaflet, Recuadro, estiloDe(), MapaManzanas(), Observador(), Propiedades (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (29): description, name, private, type, version, clsx, fake-indexeddb, @fontsource/caveat (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (28): dependencies, axios, clsx, @fontsource/caveat, @fontsource/nunito, @hookform/resolvers, idb, leaflet (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (24): sonner, AreaTexto, Campo(), CLASES_CONTROL, Entrada, Filtro(), PropiedadesCampo, Datos (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (22): @radix-ui/react-select, EsqueletoFilas(), BarraFiltros(), PERIODOS, SelectorPeriodo(), usePeriodo(), aExterno(), aInterno() (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (19): ChipRuta(), EncabezadoPagina(), Propiedades, EstadoVacio(), Tarjeta(), useRutas(), formatearDia(), formatoDiaCalendario (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (19): ErrorRuta(), ProveedorBorrador(), Auditoria, BandejaReportes, Campo, CampoRuta, Consejos, DetalleRuta (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (23): devDependencies, axios-mock-adapter, fake-indexeddb, jsdom, tailwindcss, @tailwindcss/vite, @testing-library/jest-dom, @testing-library/react (+15 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (15): base, Corazon(), Destellos(), FlechaCurva(), Gotas(), Propiedades, Puntos(), RayosAlerta() (+7 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (21): compilerOptions, baseUrl, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (20): UI Designer Agent Personality, 📋 Your Design System Deliverables, Component Library Architecture, Responsive Design Framework, 🔄 Your Workflow Process, Step 1: Design System Foundation, Review brand guidelines and requirements, Analyze user interface patterns and needs (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.10
Nodes (20): Frontend Engineer Agent Personality, Layer Boundaries (Never Cross), Never Store Sensitive Data in localStorage, Never Trust HTML From the Backend, Never Show Raw Backend Errors to Users, Never Ship Console Noise, Never Bypass ProtectedRoute, 📋 Your Frontend Deliverables (+12 more)

### Community 17 - "Community 17"
Cohesion: 0.20
Nodes (14): react, ProtegerPanel(), RequierePermiso(), SinAcceso(), useSesionPanel(), ItemMenu, MENU, Barra() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (16): Dialogo(), Propiedades, Cargando(), ErrorCarga(), Boton(), useCambiarEstadoRuta(), useGenerarRuta(), useInvalidarRutas() (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (18): useUsuarioPanel(), SelectorLocalidad(), useActualizarUsuario(), useBrigadistas(), useCrearUsuario(), useLocalidadesPanel(), ElegirManzana(), GenerarRuta() (+10 more)

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (11): COLUMNAS, PiePublico(), Manuscrita(), PropiedadesTitulo, Rotulo(), Consejos, MOSQUITOS, ACCESOS (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (12): Mancha(), BotonEnlace(), clasesBoton(), PropiedadesBoton, PropiedadesBotonEnlace, PropiedadesComunes, TamanoBoton, TAMANOS (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.15
Nodes (13): EncabezadoPublico(), ENLACES, Deteccion, DETECCIONES, MaquetaEscaner(), TituloSeccion(), cn(), ComoFunciona() (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.22
Nodes (11): react-router, BotonVolver(), Propiedades, hayPantallaAnterior(), useVolver(), BotonAtras(), DatosPantalla, DisposicionVecino() (+3 more)

### Community 24 - "Community 24"
Cohesion: 0.24
Nodes (10): lucide-react, ChipEstadoReporte(), ESTADOS_REPORTE, useMisReportes(), Limpieza(), PASOS, FILTROS, ICONOS (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (9): App(), Contexto, ContextoSesion, EstadoSesion, ROLES_PROVINCIALES, queryClient, raiz, router (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.20
Nodes (10): axios, react-hook-form, zod, CargaPagina(), Subrayado(), Datos, destinoSeguro(), esquema (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (8): workbox-core, workbox-expiration, workbox-precaching, workbox-routing, workbox-strategies, ETIQUETA_SINCRONIZACION, EventoSincronizacion, MensajePush

### Community 28 - "Community 28"
Cohesion: 0.43
Nodes (4): ChipEstado(), ESTADOS_MANZANA, MapaBarrio(), ORDEN

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (6): scripts, build, dev, preview, test, typecheck

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (3): @tailwindcss/vite, vite-plugin-pwa, @vitejs/plugin-react

## Knowledge Gaps
- **236 isolated node(s):** `name`, `private`, `version`, `description`, `type` (+231 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 284 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Community 17` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 13`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 28`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Community 24` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 13`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 26`, `Community 28`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 22` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 13`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 23`, `Community 24`, `Community 28`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _236 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.0675990675990676 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06174863387978142 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0768361581920904 - nodes in this community are weakly interconnected._