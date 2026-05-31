# JuntAPP - Documentacion Global del Proyecto y Contexto Estrategico

Este documento consolida toda la informacion estrategica, metodologica, comercial, legal y tecnica de **JuntAPP**, obtenida de los informes academicos y las presentaciones del proyecto. Sirve como la base de conocimiento definitiva para el desarrollo, operacion e implantacion de la plataforma.

---

## 1. Informacion Academica y del Proyecto
* **Proyecto**: JuntAPP — "Digitalizacion y Transparencia para Organizaciones Territoriales"
* **Asignatura**: Evaluacion y Gestion de Proyectos TI (Codigo 620654)
* **Docente**: Igor Barraza Alarcon
* **Integrantes**:
  - Diego Guzman
  - Lucas Mendez
  - Sebastian Albornoz
* **Fecha de Entrega/Publicacion**: 27 de abril de 2026

---

## 2. Introduccion y Definicion del Problema

Las Juntas de Vecinos en Chile, regidas y amparadas por la **Ley N°19.418**, constituyen el principal canal de cohesion social y organizacion territorial a nivel local. Sin embargo, estas instituciones enfrentan una **crisis de obsolescencia administrativa** critica.

```
       [Libros Fisicos / Cuadernos] ----> Perdida de Informacion Historica
                                    ----> Falta de Transparencia de Caja
       
       [Convocatorias Fisicas]      ----> Asambleas con muy Bajo Quorum
                                    ----> Desinteres de Nuevas Generaciones
```

### 2.1 Puntos de Dolor Identificados:
1. **Gestion Manual Ineficiente**: Registro de socios y actas en cuadernos de papel. Existe un alto riesgo de deterioro o extravio, lo que genera problemas legales ante el **Tribunal Electoral Regional (TER)** en elecciones de directiva.
2. **Opacidad Financiera**: La rendicion de cuentas y la recaudacion de cuotas se realizan de forma manual. Esto dificulta la postulacion a fondos publicos como el **Fondo de Desarrollo Vecinal (FONDEVE)** debido a errores en balances.
3. **Brecha Participativa**: El requerimiento de asistencia fisica a las asambleas para opinar o votar excluye a los vecinos que trabajan o estudian, lo que deriva en directivas electas con baja representatividad.
4. **Desconexion Comunicacional**: El uso de herramientas genericas como WhatsApp fragmenta la informacion, sobrecarga de alertas informales a los vecinos y carece de validez institucional para notificaciones importantes.

---

## 3. Propuesta de Valor: JuntAPP

JuntAPP se propone como una solucion **SaaS (Software as a Service) y multitenant** en la nube, disenada a la medida de la realidad comunitaria chilena para centralizar y modernizar la administracion vecinal.

### 3.1 Pilares de la Solucion:
- **Centralizacion**: Base de datos segura para el padron de socios en cumplimiento estricto con la Ley N°19.418.
- **Transparencia**: Libro de caja digital con reportes financieros y almacenamiento para documentos bancarios oficiales en PDF.
- **Democracia Digital**: Sistema seguro de consultas ciudadanas vinculantes y elecciones locales, eliminando la barrera de asistencia fisica.
- **Comunicacion Oficial**: Canal unidireccional formal de avisos, integrado con notificaciones push que llegan directo al telefono celular de los vecinos.
- **Inclusividad**: Interfaz optimizada con fuentes grandes, alto contraste y diseno amigable para facilitar su adopcion por parte de adultos mayores.

---

## 4. Planificacion Metodologica (Lean Startup y Design Thinking)

El desarrollo del proyecto se estructuro bajo el marco de trabajo **Lean Startup**, utilizando la metodologia de ciclos de iteracion rapida **"Construir - Medir - Aprender"**.

* **Definicion del MVP**: Se priorizo el desarrollo de los cuatro modulos basicos indispensables para la resolucion del problema operativo inicial: Padron de Socios, Finanzas Transparentes, Comunicados con Notificaciones Push y el Canal de Votacion.
* **Design Thinking (Fase Empatia)**: Se construyo un **Mapa de Empatía** perfilando al dirigente vecinal tipico, descubriendo que necesitan una solucion que "reduzca su tiempo de trabajo administrativo interno, para maximizar su labor social en el terreno", sin requerir conocimientos informaticos avanzados.

---

## 5. Business Model Canvas (Modelo de Negocio)

El modelo de negocios de JuntAPP opera bajo una estrategia hibrida **B2B / B2G**:

```
                       ┌──────────────────────────────────────────┐
                       │           Segmento de Clientes           │
                       └────────────────────┬─────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                               ▼
     [ B2B: Juntas de Vecinos ]                      [ B2G: Municipalidades ]
     Contratacion directa por                        Convenios comunales para
     suscripcion mensual/anual.                      financiar a todas las Juntas.
```

### 5.1 Los 9 Bloques del Modelo Canvas
1. **Propuesta de Valor**: Plataforma SaaS para modernizar juntas de vecinos, que asegura la transparencia financiera, reduce la carga burocraticas de los dirigentes, y democratiza las votaciones.
2. **Segmentos de Clientes**: Directivas de Juntas de Vecinos (B2B) y Municipalidades interesadas en financiar implementaciones comunales (B2G).
3. **Canales**: Venta directa en sedes comunitarias, uniones comunales, demostraciones web, talleres en terreno y convenios marco estatales.
4. **Relacion con Clientes**: Acompanamiento inicial en terreno (onboarding asistido), capacitacion de alfabetizacion digital a adultos mayores y soporte tecnico continuo.
5. **Fuentes de Ingreso**: Suscripciones mensuales/anuales SaaS, convenios con municipalidades, talleres de implementacion y comisiones sutiles por recaudacion de cuotas digitales.
6. **Recursos Clave**: Infraestructura Cloud (Supabase), la plataforma web responsiva, el equipo de desarrollo de software y bases de datos relacionales en la nube.
7. **Actividades Clave**: Desarrollo y actualizacion de la plataforma web, atencion de soporte y mesa de ayuda, capacitaciones territoriales y mantencion de servidores.
8. **Socios Clave**: Municipalidades (Alcaldias y DIDECO), dirigentes vecinales, Uniones Comunales de Juntas de Vecinos, pasarelas de pago seguro (Webpay / Flow).
9. **Estructura de Costos**: Infraestructura en la nube y hosting, salarios del equipo de ingenieria y soporte, costos de marketing territorial y gastos de formalizacion legal.

---

## 6. Formalizacion Juridica y Cumplimiento Legal

Para la formalizacion comercial de JuntAPP en Chile, se opto por la constitucion como una **Sociedad por Acciones (SpA)**.

### 6.1 Justificacion de la Estructura SpA:
- **Flexibilidad en el Capital**: Permite emitir acciones facilmente para dar entrada a nuevos socios tecnicos o rondas de inversion semilla.
- **Proteccion Patrimonial**: Limita la responsabilidad de los fundadores al monto aportado a la sociedad, protegiendo bienes personales.
- **Acceso al Sector Publico (B2G)**: Cumple con la estructura requerida para registrarse en **ChileProveedores** y participar en las licitaciones públicas de Mercado Publico para convenios municipales.

### 6.2 Cumplimiento de Leyes Chilenas:
- **Ley N°19.418 (Organizaciones Comunitarias)**: Resguarda el funcionamiento legal, cuotas sociales de socios e implementa la validez legal del padron.
- **Ley N°19.628 (Proteccion de Datos Personales)**: Exige encriptacion de las contrasenas, resguardo de datos de contacto vecinales e impide que los vecinos comunes auditen informacion personal de otros socios de forma masiva.

---

## 7. Analisis de Entorno

### 7.1 Analisis del Macroentorno (PESTEL)
* **Politico**: Apoyo estatal a politicas de participacion ciudadana descentralizada y fomento de modernizacion barrial.
* **Economico**: Oportunidades mediante fondos de fomento municipales y subsidios CORFO/Sercotec para startups tecnologicas con impacto social.
* **Social**: Exigencia vecinal por mayor transparencia de dineros comunes e inclusion democratica de residentes jovenes.
* **Tecnologico**: Penetracion de smartphones sobre el 90% en Chile y disponibilidad de bases de datos relacionales distribuidas con bajos costos de mantenimiento.
* **Ecologico**: Reduccion drastica del uso de papel para actas, correspondencia vecinal y cartolas financieras fisicas.
* **Legal**: Regulacion estricta de proteccion de datos (RUN/Direccion) y normativas de fiscalizacion de organizaciones comunitarias.

### 7.2 Analisis de Competitividad (5 Fuerzas de Porter)
* **Rivalidad de Competidores (Baja)**: No hay plataformas SaaS enfocadas exclusivamente en la Ley N°19.418 chilena que esten ampliamente posicionadas en el mercado nacional.
* **Amenaza de Sustitutos (Media)**: Herramientas genericas y gratuitas como WhatsApp o planillas Excel son ampliamente usadas, pero carecen de formalidad, integracion democratica y reportes contables automatizados.
* **Poder de los Proveedores (Bajo)**: Alta oferta de servidores Cloud (AWS, Supabase, Google Cloud), reduciendo la dependencia.
* **Poder de los Clientes (Medio)**: Las juntas de vecinos disponen de fondos acotados, exigiendo precios accesibles y adaptados. Las municipalidades tienen alto poder de compra pero abren las puertas al escalamiento a gran escala.
* **Amenaza de Nuevos Entrantes (Media)**: La programacion de portales similares es factible, pero la barrera principal esta en la red de contactos, la confianza con la comunidad y el entendimiento del tejido social local.

---

## 8. Guia de Uso del Sistema JuntAPP

La aplicacion segrega de forma automatica sus pantallas y permisos segun el rol del usuario conectado.

### 8.1 Manual del Vecino (Socio)

1. **Acceso al Sistema**: Inicie sesion con su correo electronico y clave. La aplicacion validara su RUT.
2. **Dashboard (Panel de Inicio)**:
   - Visualice el estado financiero de su cuenta ("Al Dia" o "Pendiente").
   - Lea los avisos y alertas recientes publicados por la directiva.
   - Si no ha activado alertas, visualizara un banner para suscribirse a notificaciones push nativas.
3. **Ficha Vecinal ("Mis Datos de Socio")**:
   - Ingrese a la seccion *"Registro de Socios"* para ver sus datos personales en el padron (Nombre, RUT, Direccion).
   - Puede actualizar su telefono de contacto y correo electronico en cualquier momento mediante el formulario integrado.
   - Visualice los datos oficiales de contacto de la Directiva (WhatsApp y correo electronico) para dudas directas.
4. **Tesoreria y Pagos**:
   - Revise los balances dinamicos mensuales de ingresos y egresos de la Junta.
   - En la seccion de cuotas, si tiene pagos pendientes, presione el boton **"Pagar Cuota con Webpay/Flow"**. El sistema abrira la pasarela simulada encriptada de cobro y, tras confirmar la clave del banco, se le asignara el comprobante de pago `JV-Receipt`.
   - Descargue cartolas oficiales e informes financieros cargados en el repositorio de transparencia.
5. **Votaciones Ciudadanas**:
   - En el menu de votaciones, visualizara la consulta barrial abierta. Si no ha participado, seleccione su opcion y presione "Confirmar Voto". Al completarse, vera inmediatamente las estadisticas agregadas de las alternativas en tiempo real.

### 8.2 Manual del Dirigente (Administrador)

Los dirigentes cuentan con permisos de escritura totales sobre la base de datos de la junta.

1. **Inscribir Nuevo Socio**:
   - Ingrese a *"Registro de Socios"* y presione **"Inscribir Nuevo Socio"**.
   - Digite el nombre, RUT, direccion, correo y telefono. El campo RUT cuenta con validacion automatica; si es invalido, se marcara en rojo. Presione *"Inscribir"* para guardar.
   - Utilice la barra de busqueda en tiempo real para filtrar vecinos por nombre, rut o direccion, modificar su estado de pago ("Cambiar Pago") o eliminarlos del padron.
2. **Gestion de Caja (Tesoreria)**:
   - Presione **"Registrar Movimiento"** en el panel de tesoreria.
   - Seleccione el tipo de movimiento (`ingreso` / `egreso`), digite el monto, la glosa explicativa (Ej. "Compra de ampolletas para la plaza") y la fecha. El sistema recalculara el saldo disponible de caja y actualizara los graficos de flujo mensual de forma automatica.
3. **Biblioteca de Documentos**:
   - Arrastre o suba cartolas bancarias o decretos municipales en PDF mediante la etiqueta de subida en el repositorio. El sistema lo cargara de forma segura en el storage y refrescara el listado.
   - Utilice el boton de borrar en los documentos cargados para limpiar el repositorio.
4. **Crear Consultas Ciudadanas**:
   - Dirijase al modulo de votaciones y pulse **"Crear Nueva Votación"**.
   - Complete el titulo, descripcion explicativa de la consulta y escriba hasta 3 alternativas de eleccion. Presione *"Crear Consulta"*.
   - El sistema desactivara la votacion anterior, la movera al historial con su opcion ganadora finalizada e iniciara la nueva consulta para recibir votos de inmediato.
5. **Publicar Comunicados**:
   - Ingrese a *"Anuncios Oficiales"* y presione **"Publicar Anuncio Oficial"**.
   - Defina la categoria (`asamblea`, `general`, `beneficio`, `urgente`), escriba el titulo y el cuerpo de la noticia. El comunicado se publicara en el dashboard de todos los vecinos.

---

## 9. Glosario de Terminos
* **FONDEVE**: Fondo de Desarrollo Vecinal. Fondo concursable de origen municipal en Chile para financiar infraestructura o equipamiento barrial.
* **TER**: Tribunal Electoral Regional. Organo encargado de visar y calificar elecciones de organizaciones comunitarias como Juntas de Vecinos.
* **SaaS**: Software as a Service. Modelo donde el software esta alojado en servidores en la nube y se accede via web por suscripcion.
* **Multitenant**: Arquitectura que permite a multiples organizaciones independientes operar bajo una misma instalacion de software resguardando la privacidad de sus datos.
* **RLS**: Row Level Security. Filtros avanzados ejecutados directo en el motor de la base de datos PostgreSQL para restringir las filas visibles de una tabla segun la identidad del usuario logeado.
