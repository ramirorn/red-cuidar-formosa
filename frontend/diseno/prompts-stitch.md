# Prompts para Google Stitch — Red Cuidar Formosa

Cómo usarlos:

1. En Stitch, creá **dos proyectos**: uno **Mobile** (PWA ciudadana y vista de brigadista) y uno **Web** (dashboard institucional).
2. En cada proyecto, pegá primero el **Prompt 0 (identidad visual)** y subí el logo como imagen de referencia.
3. Después pegá los prompts de a uno. Si Stitch pierde el estilo, volvé a pegar el bloque "Identidad" al principio del prompt.
4. Todos los textos de pantalla van en **español de Argentina, con voseo** ("Sacá una foto", "Tu manzana").

Los datos que aparecen en cada pantalla corresponden a lo que ya entrega el backend: estados, roles, campos y límites.

---

## Prompt 0 — Identidad visual (pegar primero en ambos proyectos)

```
Diseñá el sistema visual de "Red-Cuidar Formosa", una plataforma de salud pública para prevenir el dengue en la provincia de Formosa, Argentina. Usá el logo adjunto como referencia de identidad.

Identidad:
- Estilo: ilustración plana de línea gruesa negra con esquinas redondeadas, amigable y cercana, no clínica ni fría. Iconos de trazo grueso y redondeado, coherentes con el logo (aerosol con escudo y hoja, mosquito con ojos en X).
- Colores de marca (aproximados, tomados del logo):
  - Verde "Cuidar" #1E8C2F: color principal, botones primarios, confirmaciones.
  - Rojo "Red" #E11B22: acentos de marca, alertas, peligro.
  - Negro #1A1A1A: textos y contornos.
  - Blanco #FFFFFF: fondos.
  - Neutros: gris claro #F4F5F2 para superficies, gris medio #6B6F6A para textos secundarios.
- Colores de estado de las manzanas (se usan en mapas, chips y leyendas; siempre acompañados de texto o ícono, nunca solo el color):
  - ROJO #E11B22 "Criadero activo"
  - AMARILLO #F2B705 "Revisar"
  - VERDE #1E8C2F "Limpia"
  - SIN DATOS #BDBDBD "Sin datos"
- Tipografía: sans serif redondeada y gruesa para títulos (similar a Nunito o Baloo 2, peso 800), Nunito o Inter para el cuerpo. Rótulos en mayúsculas espaciadas como "F O R M O S A" del logo.
- Componentes: tarjetas blancas con borde negro fino (1.5 px) y esquinas de 16 px, botones redondeados (pill) altos, chips de estado con ícono. Sombras mínimas.
- Accesibilidad: contraste AA, textos grandes, áreas táctiles de 48 px o más. Pensado para celulares de gama baja y conexiones lentas.
- Idioma: español de Argentina con voseo, tono cálido y directo.
```

---

# A. PWA ciudadana (proyecto Mobile)

La usa el vecino, sin registrarse. Es una web liviana que funciona sin conexión.

## Prompt 1 — Bienvenida

```
Pantalla móvil de bienvenida de la PWA "Red-Cuidar Formosa" (usar la identidad del Prompt 0 y el logo).

Objetivo: que el vecino entienda en 5 segundos qué hace la app y empiece sin registrarse.

Contenido:
- Logo completo arriba.
- Carrusel de 3 tarjetas ilustradas con indicador de puntos:
  1. "Tu cámara ve lo que a veces no vemos": la IA marca en rojo recipientes con agua (baldes, neumáticos, macetas).
  2. "Pintá tu manzana de verde": cada limpieza suma para tu cuadra.
  3. "Te avisamos después de la lluvia": recordatorio para vaciar y cepillar recipientes.
- Mensaje de confianza: "No necesitás registrarte. No pedimos tu nombre ni tu teléfono."
- Botón primario verde: "Empezar".
- Texto chico: "Funciona sin internet: tus reportes se envían cuando vuelve la señal."
```

## Prompt 2 — Permisos de cámara, ubicación y notificaciones

```
Pantalla móvil de permisos, antes de usar la app (identidad del Prompt 0).

Mostrá 3 tarjetas, cada una con ícono de línea gruesa, título, una línea de explicación y un interruptor o botón "Permitir":
1. Cámara: "Para detectar recipientes con agua en tu patio."
2. Ubicación: "Para saber a qué manzana corresponde tu reporte. No compartimos tu dirección exacta."
3. Notificaciones: "Para avisarte después de cada lluvia."

Abajo: botón primario "Continuar" y enlace secundario "Ahora no".
Cada tarjeta muestra su estado: pendiente, permitido (tilde verde) o denegado (texto rojo con "Podés activarlo desde la configuración del navegador").
```

## Prompt 3 — Inicio (mi manzana)

```
Pantalla principal móvil de la PWA ciudadana (identidad del Prompt 0).

Estructura de arriba hacia abajo:
- Barra superior: logo horizontal chico a la izquierda y un indicador de conexión a la derecha (punto verde "En línea" o gris "Sin conexión · 2 reportes en espera").
- Tarjeta grande "Tu manzana": minimapa con el polígono de la manzana coloreado según su estado, un chip de estado grande (ROJO "Criadero activo", AMARILLO "Revisar", VERDE "Limpia" o SIN DATOS) y una frase según el estado. Ejemplo en AMARILLO: "Llovió después de tu última limpieza. Revisá los recipientes."
- Si hubo lluvia reciente, un banner de alerta: "Llovió 23 mm en Formosa Capital. Vaciá, cepillá y tapá los recipientes."
- Botón de acción principal, muy grande y verde, con ícono de cámara: "Escanear mi patio".
- Botón secundario con contorno: "Ya limpié: sacar foto de después".
- Accesos rápidos en grilla de 2x2: "Mapa del barrio", "Mis reportes", "Hablar con IA Mosquito", "Consejos".
- Barra de navegación inferior con 4 ítems: Inicio, Mapa, Reportes, Chat.
```

## Prompt 4 — Escáner de entorno (cámara con IA)

```
Pantalla móvil de cámara a pantalla completa con detección por IA en tiempo real (identidad del Prompt 0).

- Vista de cámara de un patio con recuadros rojos (#E11B22, borde grueso y esquinas redondeadas) sobre los objetos detectados. Cada recuadro lleva una etiqueta blanca: "Neumático 91%", "Balde 78%", "Maceta 64%".
- Clases posibles: Neumático, Botella, Balde, Maceta, Tanque, Bebedero, Florero, Otro.
- Arriba, un chip semitransparente: "3 posibles criaderos detectados".
- Abajo, un botón circular grande de captura, blanco con aro verde. A la izquierda "Cancelar", a la derecha un botón de linterna.
- Texto guía abajo: "Recorré el patio despacio. Marcamos en rojo lo que puede juntar agua."
- Variante sin detecciones: un chip verde "No vemos recipientes peligrosos".
```

## Prompt 5 — Confirmar y enviar el reporte

```
Pantalla móvil para revisar un reporte antes de enviarlo (identidad del Prompt 0).

Contenido:
- Carrusel de hasta 3 fotos capturadas, con los recuadros rojos dibujados. Botón "+ Agregar foto" (máximo 3) e ícono de eliminar en cada foto.
- Selector de tipo de reporte en 3 tarjetas seleccionables con ícono:
  - "Criadero": recipiente con agua.
  - "Microbasural": acumulación de basura.
  - "Limpieza": ya lo eliminé.
- Lista de objetos detectados, con chips y el porcentaje de confianza de la IA.
- Tarjeta de ubicación: minimapa con un pin, el texto "Manzana detectada: EJ-0404" y la precisión del GPS ("± 8 m"). Botón "Ajustar ubicación".
- Campo opcional "Contanos algo más" (hasta 500 caracteres, con contador).
- Botón primario verde a todo el ancho: "Enviar reporte".

Estados después de enviar:
- Éxito en línea: "¡Gracias! Tu reporte fue validado" (chip ROJO de la manzana).
- Recibido para revisar: "Recibido. Lo va a revisar el equipo de salud" (chip gris "Pendiente").
- Sin conexión: "Guardado. Lo enviamos cuando vuelva la señal" (ícono de nube con reloj).
```

## Prompt 6 — Reporte de limpieza (antes y después)

```
Pantalla móvil para informar que el vecino eliminó un criadero (identidad del Prompt 0).

- Título: "¡Buenísimo! Mostranos cómo quedó".
- Lista de "Tus criaderos abiertos" en tarjetas (foto chica, tipo, fecha, chip del estado). El vecino elige cuál resolvió; también puede elegir "Otro lugar".
- Comparación lado a lado: la foto "Antes" (del reporte elegido) y un espacio "Después" con el botón de cámara.
- Recordatorio ilustrado de 4 pasos con iconos: Desechar, Dar vuelta, Tapar y Cepillar las paredes ("los huevos quedan pegados").
- Botón primario: "Enviar limpieza".
- Estado final festivo: la manzana pasa a VERDE con una animación de pintura verde sobre el polígono y el texto "¡Tu manzana está en verde! Gracias por cuidar a tus vecinos".
```

## Prompt 7 — Mis reportes y cola sin conexión

```
Pantalla móvil con el historial de reportes del vecino (identidad del Prompt 0).

- Arriba, si hay envíos pendientes, un bloque "En espera de conexión (2)" con tarjetas y un indicador de "Sincronizando…". Botón "Reintentar ahora".
- Lista de tarjetas por reporte: foto miniatura, tipo (Criadero, Microbasural o Limpieza), fecha y hora, código de manzana y un chip de estado:
  - PENDIENTE (gris) "En revisión"
  - VALIDADO (rojo) "Confirmado"
  - RECHAZADO (gris tachado) "No confirmado"
  - RESUELTO (verde) "Resuelto"
- Filtros en chips: Todos, En revisión, Confirmados, Resueltos.
- Paginación por desplazamiento infinito, con un esqueleto de carga.
- Estado vacío ilustrado: "Todavía no reportaste nada. ¡Escaneá tu patio!".
```

## Prompt 8 — Mapa comunitario del barrio

```
Pantalla móvil con un mapa de manzanas coloreadas (identidad del Prompt 0).

- Mapa a pantalla completa con estilo claro y desaturado. Cada manzana es un polígono coloreado según su estado: ROJO, AMARILLO, VERDE o gris (SIN DATOS).
- Buscador arriba: "Buscar barrio o calle".
- Leyenda flotante plegable con los 4 estados y su significado.
- Al tocar una manzana se abre una hoja inferior (bottom sheet) con el código de la manzana, el estado, "Última limpieza: hace 3 días" y el botón "Reportar acá".
- Botón flotante "Mi ubicación".
- Mensaje al alejar demasiado el mapa: "Acercá el mapa para ver las manzanas".
- Tono de competencia sana entre vecinos: arriba, una tarjeta chica "Tu barrio: 62% en verde".
```

## Prompt 9 — Chat "IA Mosquito"

```
Pantalla móvil de chat con un asistente de prevención de dengue (identidad del Prompt 0).

- Encabezado: avatar del mosquito del logo en versión amigable, el nombre "IA Mosquito" y el subtítulo "Te oriento sobre dengue y criaderos".
- Aviso fijo arriba, en una tarjeta gris: "No reemplaza la consulta médica. Ante una urgencia, llamá al 107."
- Burbujas: las del usuario a la derecha (verde claro), las del asistente a la izquierda (blancas con borde negro).
- Respuestas con nivel de triaje, con un chip de color arriba de la burbuja:
  - "Sin riesgo" (gris)
  - "Leve" (verde)
  - "Moderado" (amarillo): la burbuja incluye "Consultá en tu centro de salud".
  - "Urgente" (rojo): una tarjeta roja destacada con el texto "Andá ya a la guardia más cercana" y el botón "Llamar al 107".
- Sugerencias rápidas en chips: "Tengo fiebre", "¿Cómo limpio un tanque?", "¿Qué es el BTI?".
- Campo de texto con contador (máximo 1000 caracteres) y botón de enviar.
- Estado "IA Mosquito está escribiendo…" con tres puntos animados. Aclaración: la respuesta puede tardar unos segundos.
- Estado de error: "El asistente no está disponible ahora. Si te sentís mal, andá a la guardia."
```

## Prompt 10 — Alertas y notificaciones

```
Pantalla móvil de alertas del vecino (identidad del Prompt 0).

- Interruptor principal: "Avisarme después de cada lluvia", con el estado del permiso del navegador.
- Selector de localidad: Formosa Capital, Clorinda, Pirané, El Colorado, Laguna Blanca, Las Lomitas, Palo Santo o Estanislao del Campo.
- Historial de alertas recibidas, en tarjetas: ícono de nube con lluvia, "Llovió en Formosa Capital · 23 mm", fecha y el botón "Ya limpié, sacar foto".
- Maqueta de cómo se ve la notificación en el celular: título "Llovió en Formosa Capital" y el texto "Se registraron 23 mm. Vaciá, cepillá y tapá los recipientes con agua, y enviá una foto para mantener tu manzana en verde."
```

## Prompt 11 — Consejos de prevención

```
Pantalla móvil educativa con consejos para prevenir el dengue (identidad del Prompt 0).

Tarjetas ilustradas grandes, desplazables verticalmente:
1. "Desechá": tirá lo que no usás (neumáticos, latas, botellas).
2. "Dá vuelta": poné boca abajo baldes y macetas.
3. "Tapá": sellá tanques y bidones.
4. "Cepillá": cambiar el agua no alcanza, los huevos quedan pegados a las paredes.
5. "BTI": larvicida biológico, inocuo para personas y animales, para agua que no se puede vaciar.

Una sección "Conocé al mosquito" con 3 fichas y su nivel de riesgo en chips de color:
- Aedes aegypti: riesgo crítico, diurno.
- Aedes albopictus: riesgo alto, "mosquito tigre".
- Culex: riesgo moderado, nocturno.

Botón final: "Escanear mi patio ahora".
```

---

# B. Vista móvil del brigadista (proyecto Mobile)

La usa el personal de campo desde el celular, con su usuario institucional.

## Prompt 12 — Ruta del día

```
Pantalla móvil para un brigadista de salud que recorre manzanas (identidad del Prompt 0, tono más operativo).

- Encabezado: "Ruta del 25/09 · Formosa Capital", el estado de la ruta en un chip (PLANIFICADA, EN CURSO o FINALIZADA) y el avance "4 de 12 paradas" con una barra de progreso verde.
- Mapa arriba (40% de la pantalla) con las paradas numeradas unidas por una línea en orden y un pin en la posición actual.
- Lista ordenada de paradas: número, código de manzana, chip de estado (ROJO o AMARILLO), distancia a la parada y el estado de la visita (pendiente, o tilde verde "Visitada 10:42").
- Cada parada tiene dos botones: "Registrar intervención" y "Marcar visitada".
- Botón principal según el estado: "Iniciar ruta" (si está PLANIFICADA) o "Finalizar ruta" (si está EN CURSO).
- Muestra la distancia total estimada: "≈ 2,1 km".
```

## Prompt 13 — Registrar intervención

```
Formulario móvil para que el brigadista registre una intervención en una manzana (identidad del Prompt 0).

Campos:
- Tipo, en 4 tarjetas con ícono: "Aplicación de BTI", "Fumigación", "Descacharrado" e "Inspección".
- Manzana (precargada desde la parada, por ejemplo "EJ-0101") y el reporte asociado (opcional, desplegable con foto miniatura).
- Fecha y hora de realización (por defecto, ahora).
- Solo si el tipo es BTI: "Cantidad de producto" (numérico, obligatorio) y "Unidad" (g, kg, ml, l o comprimidos), además de "Tipo de cuerpo de agua" (por ejemplo, tanque australiano o aljibe).
- Ubicación GPS con botón "Usar mi ubicación".
- Observaciones (hasta 500 caracteres).
- Botón primario: "Guardar intervención".
- Mensaje de éxito: "Intervención registrada · La manzana pasó a VERDE" con el chip del nuevo estado.
- Errores de validación en línea, en rojo, debajo de cada campo.
```

---

# C. Dashboard institucional (proyecto Web, escritorio de 1440 px)

Lo usan el Ministerio y los equipos de epidemiología y de brigadas. Cada pantalla depende del rol:
ADMINISTRADOR, EPIDEMIOLOGO, COORDINADOR_BRIGADA, BRIGADISTA o AUDITOR.

## Prompt 14 — Ingreso institucional

```
Pantalla web de inicio de sesión para personal del Ministerio de Salud (identidad del Prompt 0, tono institucional y sobrio).

- Distribución en dos columnas: a la izquierda, una ilustración grande de un mapa de Formosa con manzanas coloreadas y el logo; a la derecha, el formulario.
- Formulario: título "Panel institucional", campos "Email" y "Contraseña" (con botón para mostrarla) y el botón primario verde "Ingresar".
- Mensaje de error genérico: "Email o contraseña incorrectos" (nunca aclara cuál de los dos).
- Estado de bloqueo por muchos intentos: "Demasiados intentos. Probá de nuevo en unos minutos."
- Pie: "Acceso exclusivo para personal autorizado. Los accesos quedan registrados."
```

## Prompt 15 — Estructura general y panel de métricas

```
Pantalla web principal de un dashboard epidemiológico (identidad del Prompt 0).

Estructura común a todas las pantallas del panel:
- Barra lateral izquierda con el logo horizontal y el menú: Panel, Mapa de riesgo, Reportes, Intervenciones, Rutas, Exportaciones, Usuarios, Auditoría. Los ítems se muestran según el rol.
- Barra superior: selector de localidad (Toda la provincia o una localidad), selector de rango de fechas (por defecto, últimos 30 días; máximo 366 días), y a la derecha el nombre del usuario con un chip del rol (por ejemplo, "Coordinador de brigada · Clorinda").

Contenido del panel:
- Fila de 4 tarjetas de indicadores: "Reportes recibidos", "Criaderos activos", "Manzanas en verde (%)" e "Intervenciones realizadas" (con el total de BTI aplicado en gramos).
- Gráfico de barras horizontales "Manzanas por estado": ROJO, AMARILLO, VERDE y SIN DATOS, con sus colores.
- Gráfico de líneas "Reportes por día", con series para Criadero, Microbasural y Limpieza.
- Tabla chica "Reportes por tipo y estado": filas Criadero, Microbasural y Limpieza; columnas Pendiente, Validado, Rechazado y Resuelto.
- Tarjeta "Intervenciones por tipo": BTI, Fumigación, Descacharrado e Inspección.
- Estados de carga con esqueletos, y estado vacío.
```

## Prompt 16 — Mapa de riesgo y predicción

```
Pantalla web con el mapa de calor epidemiológico (identidad del Prompt 0 y estructura del Prompt 15).

- Mapa grande de la ciudad con una capa de calor (heatmap) de verde a amarillo y rojo según el "índice de riesgo" (0 a 1) de cada manzana.
- Selector de capa en pestañas: "Riesgo actual" y "Predicción 72 h" (riesgo esperado con la lluvia pronosticada).
- Panel derecho plegable: al hacer clic en un punto, muestra el código de la manzana, el estado, el índice de riesgo con una barra, los reportes validados y pendientes, y la lluvia de los últimos 7 días en mm.
- Leyenda de la escala de riesgo, y un aviso: "La predicción se actualiza cada hora con el pronóstico".
- Tarjeta flotante: "Lluvia pronosticada próximas 72 h: 30 mm".
- Botón "Generar ruta con estas manzanas" (visible solo para coordinadores).
```

## Prompt 17 — Bandeja de reportes

```
Pantalla web con una tabla de reportes ciudadanos (identidad del Prompt 0 y estructura del Prompt 15).

- Filtros arriba: Estado (Pendiente, Validado, Rechazado, Resuelto), Tipo (Criadero, Microbasural, Limpieza), Manzana, Localidad y Rango de fechas.
- Pestañas con contador: "Pendientes de revisión (37)", "Todos".
- Tabla con columnas: miniatura de la foto, tipo, estado (chip), confianza de la IA (barra con porcentaje), manzana (código y chip de color), origen (PWA o Chat), capturado en, recibido en, cantidad de fotos y detecciones.
- Acciones en cada fila: "Ver detalle", y "Validar" o "Rechazar" (solo para roles con permiso de validación).
- Paginación con el botón "Cargar más" (cursor), 50 filas por página.
- Estado vacío: "No hay reportes con estos filtros".
```

## Prompt 18 — Detalle de reporte y validación

```
Pantalla web de detalle de un reporte ciudadano (identidad del Prompt 0 y estructura del Prompt 15).

Distribución en dos columnas:
- Izquierda:
  - Visor de fotos grande con las cajas de detección dibujadas encima (etiqueta y porcentaje), miniaturas debajo y marcas "Antes" o "Después".
  - Lista de detecciones de la IA.
- Derecha:
  - Chip de estado grande, tipo, origen, fecha de captura y fecha de recepción.
  - Minimapa con la ubicación, el polígono de la manzana y la precisión del GPS.
  - Descripción del vecino.
  - Bloque de validación con los botones "Validar" (verde), "Rechazar" (rojo) y "Marcar resuelto".
  - Si se rechaza, un modal con el campo obligatorio "Motivo del rechazo" (de 3 a 300 caracteres).
  - "Validado por: Nombre Apellido · fecha".
  - Enlace al reporte de limpieza que lo resolvió, si existe.
- Aviso de conflicto: "Otra persona modificó este reporte. Recargá la página."
- Botones "Registrar intervención" y "Agregar a una ruta".
```

## Prompt 19 — Planificación de rutas de brigada

```
Pantalla web para que un coordinador arme las rutas diarias de las brigadas (identidad del Prompt 0 y estructura del Prompt 15).

- Formulario "Nueva ruta":
  - Fecha, entre hoy y los próximos 30 días.
  - Localidad.
  - Brigadista asignado: desplegable con los brigadistas activos de la localidad.
  - Cantidad máxima de paradas: control deslizante de 1 a 60, con 20 por defecto.
  - Punto de partida: clic en el mapa o "Usar el centro de salud".
  - Botón "Generar ruta".
- Explicación breve: "Primero las manzanas en rojo, después las amarillas más recientes. Se ordenan por cercanía."
- Vista previa: mapa con las paradas numeradas y la línea del recorrido, la distancia total estimada y la lista ordenada de manzanas con su estado.
- Tabla "Rutas": fecha, brigadista, estado (PLANIFICADA, EN CURSO, FINALIZADA o CANCELADA), avance ("4/12" con barra) y acciones (Ver, Cancelar).
- Mensaje cuando no hay manzanas: "No hay manzanas en rojo o amarillo pendientes para esa fecha".
```

## Prompt 20 — Intervenciones

```
Pantalla web con el listado de intervenciones de campo (identidad del Prompt 0 y estructura del Prompt 15).

- Filtros: Tipo (BTI, Fumigación, Descacharrado, Inspección), Manzana, Localidad y Fechas.
- Tabla: fecha y hora, tipo (chip con ícono), manzana, responsable, cantidad de producto y unidad, tipo de cuerpo de agua, reporte asociado (enlace) y observaciones.
- Tarjetas de resumen arriba: total de intervenciones y total de BTI aplicado.
- Botón "Registrar intervención" (solo para roles con permiso), que abre un panel lateral con el formulario del Prompt 13 en versión web.
```

## Prompt 21 — Exportaciones

```
Pantalla web para descargar informes CSV (identidad del Prompt 0 y estructura del Prompt 15).

- Dos tarjetas grandes: "Reportes ciudadanos" e "Intervenciones". Cada una lista sus columnas incluidas y tiene un botón "Descargar CSV".
- Filtros comunes: localidad y rango de fechas (máximo 366 días), con un mensaje de error si se supera.
- Aviso de privacidad en una tarjeta gris: "Las coordenadas se redondean a unos 110 metros, salvo para administradores. Nunca se incluyen datos de las sesiones ciudadanas. Cada descarga queda registrada en la auditoría."
- Estado de descarga en curso, con una barra indeterminada.
```

## Prompt 22 — Gestión de usuarios

```
Pantalla web para administrar cuentas del personal (solo ADMINISTRADOR; identidad del Prompt 0 y estructura del Prompt 15).

- Tabla: nombre y apellido, email, rol (chip), localidad, estado (Activo o Inactivo), último acceso y acciones (Editar, Desactivar).
- Filtros por rol y por localidad.
- Botón "Nuevo usuario", que abre un modal con:
  - Nombre, apellido y email.
  - Contraseña, con un medidor y los requisitos: de 12 a 128 caracteres, con mayúscula, minúscula y número.
  - Rol, en 5 opciones con una descripción breve:
    - Administrador: acceso total.
    - Epidemiólogo: provincia, análisis y validación.
    - Coordinador de brigada: su localidad, rutas y validación.
    - Brigadista: su localidad, trabajo de campo.
    - Auditor: provincia, solo lectura, sin fotos.
  - Localidad: obligatoria para Coordinador y Brigadista; se oculta para los roles provinciales.
- Aviso al cambiar un rol o desactivar a alguien: "Se cerrarán todas las sesiones abiertas de este usuario."
```

## Prompt 23 — Auditoría

```
Pantalla web del registro de auditoría (ADMINISTRADOR y AUDITOR; identidad del Prompt 0 y estructura del Prompt 15).

- Filtros: usuario, acción (Exportar CSV, Crear usuario, Actualizar usuario) y rango de fechas.
- Línea de tiempo en formato de tabla: fecha y hora, usuario (con chip de rol), acción, recurso afectado, filtros usados (JSON legible y desplegable) e IP.
- Paginación con "Cargar más".
- Encabezado con un texto de confianza: "Registro inalterable de accesos a datos sensibles."
```
