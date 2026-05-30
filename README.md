# JuntAPP - Plataforma de Gestion y Transparencia Vecinal

JuntAPP es una aplicacion web disenada para la gestion y transparencia de las Juntas de Vecinos en Chile. La plataforma permite digitalizar el padron electoral y de socios, el libro de caja financiero, la toma de decisiones democraticas mediante consultas barriales y el envio de notificaciones push en tiempo real. 

El diseno visual sigue las directrices del manual de identidad de Chile con un esquema de colores azul institucional y rojo calido, aplicando un diseno con tipografias de alta legibilidad, controles accesibles de facil interaccion y total compatibilidad para dispositivos moviles y usuarios de la tercera edad.

## Arquitectura del Proyecto

El proyecto esta estructurado como una aplicacion modular dividida en dos componentes principales:

1. **Frontend (`/frontend`)**
   - **Tecnologias**: HTML5, Vanilla CSS (Design Tokens, variables nativas, animaciones fluidas) y JavaScript Modular.
   - **Gestor de Rutas**: Sistema de enrutamiento del lado del cliente (`router.js`) con proteccion de rutas y gestion de vistas seguras.
   - **Service Worker (`public/sw.js`)**: Gestiona la escucha de eventos push nativos e implementa alertas en segundo plano.
   - **Capa de Persistencia (`src/js/db.js`)**: Modulo hibrido que detecta credenciales y se conecta automaticamente a Supabase Cloud, usando una simulacion en LocalStorage como respaldo offline cuando las llaves del entorno no estan configuradas.

2. **Backend (`/backend`)**
   - **Base de Datos (Supabase / PostgreSQL)**: Migraciones SQL que definen el esquema relacional, indices de busqueda y triggers de sincronizacion automatica entre la tabla de usuarios de autenticacion (`auth.users`) y los perfiles publicos (`public.profiles`).
   - **Seguridad (RLS)**: Politicas de seguridad a nivel de fila (Row Level Security) que restringen la visibilidad del padron de socios y operaciones de caja segun el rol del usuario (Vecino versus Dirigente).
   - **Funciones Edge (Deno Runtime)**: Integracion de pasarelas de pago (`create-payment` y `payment-webhook`) para la simulacion y confirmacion segura de cuotas.

## Caracteristicas Principales

### 1. Autenticacion Segura y Segregacion de Roles
- **Validacion de RUT**: Algoritmo Modulo 11 en tiempo real para verificar digitos verificadores y formateo automatico.
- **Politicas de Privacidad**: Los vecinos comunes solo pueden actualizar sus propios datos y contactar a la directiva. La busqueda en el padron completo de socios, la edicion de roles y la eliminacion de registros estan restringidas exclusivamente a los dirigentes autorizados.

### 2. Notificaciones en Tiempo Real
- **Notificaciones Push**: Vinculacion del navegador con Service Workers para interceptar payloads del Push Service y desplegar tarjetas informativas (como llamadas urgentes a asambleas o recordatorios de cuotas sociales).

### 3. Tesoreria y Transparencia Financiera
- **Visualizaciones Graficas**: Graficos dinamicos integrados con Chart.js para mostrar el balance de caja mensual (ingresos vs. egresos) y la distribucion por categorias de gastos.
- **Repositorio de Documentos**: Biblioteca integrada para la descarga de cartolas bancarias y decretos oficiales en PDF. Los dirigentes disponen de controles para cargar documentos directo a un Storage Bucket y eliminar archivos obsoletos.
- **Pasarela de Pago Integrada**: Simulacion del flujo de Webpay/Flow con generacion de ordenes pendientes y callback mediante webhooks que automatizan la actualizacion de estados de pago de cuotas en la base de datos.

### 4. Consultas Ciudadanas Digitales
- **Votaciones Anonimas**: Registro encriptado y segregado de votos para encuestas comunitarias activas, con graficos de resultados parciales accesibles despues de votar o para cuentas administrativas, alineados con la regulacion de la Ley N°19.418.

## Instrucciones de Instalacion y Ejecucion

### Frontend

1. Dirigirse al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instalar las dependencias de desarrollo y produccion:
   ```bash
   npm install
   ```
3. Ejecutar el servidor de desarrollo local (puerto 3000 por defecto):
   ```bash
   npm run dev
   ```
4. Para compilar la distribucion final de produccion:
   ```bash
   npm run build
   ```

### Backend

1. Instalar la herramienta de linea de comandos Supabase CLI en su sistema.
2. Iniciar el entorno de base de datos local y contenedores Docker:
   ```bash
   supabase start
   ```
3. Aplicar las migraciones locales en el entorno de desarrollo:
   ```bash
   supabase db reset
   ```
