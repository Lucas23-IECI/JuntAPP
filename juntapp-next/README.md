# JuntAPP Next

Aplicación multi-tenant para Juntas de Vecinos, construida con Next.js 16, TypeScript, Tailwind CSS 4 y Supabase.

## Desarrollo local

1. Copia `.env.local.example` a `.env.local` y completa las credenciales.
2. Aplica las migraciones de `../backend/supabase/migrations` a Supabase.
3. Instala dependencias y levanta el servidor:

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Cuentas demo

- Directiva: `directiva.demo@juntapp.cl` / `DirectivaDemo2026!`
- Vecino: `vecino.demo@juntapp.cl` / `VecinoDemo2026!`

El vecino demo comparte `Avenida Los Pinos 123, Depto 4` con otro socio. Ambos están asociados a una sola cuota mensual por domicilio. Para crear o reparar los ocho vecinos demo de forma idempotente en el Supabase configurado:

```bash
npm run demo:neighbors
```

El comando comprueba que las ocho variantes de texto formen cuatro domicilios, registra un solo pago para Los Pinos y falla si detecta cuotas o direcciones duplicadas.

Este proyecto está conectado directamente a Supabase Cloud. Para aplicar migraciones, ejecuta desde `../backend`:

```bash
npx supabase db push
```

## Variables de entorno

- `NEXT_PUBLIC_SUPABASE_URL`: URL pública del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave pública/anon.
- `SUPABASE_SERVICE_ROLE_KEY`: clave exclusiva del servidor, usada para invitar socios y procesar pagos.
- `NEXT_PUBLIC_APP_URL`: URL pública, sin `/` final.
- `PAYMENT_WEBHOOK_SECRET`: secreto HMAC SHA-256 para `/api/webhooks/payment`.
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`: clave pública para el formulario seguro de tarjeta.
- `MERCADOPAGO_ACCESS_TOKEN`: credencial privada para crear y verificar suscripciones mensuales de $15.000 CLP.
- `MERCADOPAGO_TEST_PAYER_EMAIL`: comprador de prueba creado en Mercado Pago; solo se usa con credenciales `TEST-`.
- `MERCADOPAGO_CLIENT_ID` y `MERCADOPAGO_CLIENT_SECRET`: aplicación OAuth que permite a cada junta conectar su propia cuenta.
- `MERCADOPAGO_CREDENTIALS_ENCRYPTION_KEY`: secreto aleatorio de 32 caracteres o más para cifrar Access y Refresh Tokens por junta.
- `MERCADOPAGO_OAUTH_TEST_MODE`: usa `true` en sandbox y `false` en producción.
- `MERCADOPAGO_WEBHOOK_SECRET`: firma secreta configurada en Webhooks de Mercado Pago para producción.
- `RESEND_API_KEY`: credencial privada de Resend para enviar la carta de solicitud a Secretaría.
- `REGISTRATION_EMAIL_FROM`: remitente verificado, por ejemplo `JuntAPP <solicitudes@tu-dominio.cl>`.

Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` con el prefijo `NEXT_PUBLIC_`.

Las juntas nuevas permanecen pendientes hasta que Mercado Pago autoriza la suscripción. El servidor fija y verifica $15.000 CLP mensuales, IVA incluido. Los webhooks de `subscription_preapproval` y `subscription_authorized_payment` sincronizan renovaciones, rechazos y cancelaciones.

En Mercado Pago configura `/api/webhooks/mercadopago` y activa los eventos de planes y suscripciones. La suscripción puede cancelarse desde Registro de Socios por quien creó la junta.

## Solicitudes de ingreso y registro manual

Cada junta tiene un `invite_code` único de seis caracteres. El enlace `https://tu-dominio/registro?codigo=ABC123` crea una solicitud pendiente, no una cuenta. Se envía una carta a Secretaría con copia por correo a toda la directiva y siempre queda una copia dentro del dashboard. Solo quien ocupa el cargo de Secretario puede aceptar o rechazar. Al aceptar, Supabase envía la invitación para que el socio active su contraseña; antes de eso no puede ingresar. La directiva también puede inscribir socios manualmente desde Registro de Socios, sin solicitud previa.

Si Resend no está configurado o rechaza un envío, la solicitud no se pierde: queda marcada en la bandeja de toda la directiva para su resolución.

## Correos transaccionales

Resend envía desde el servidor las solicitudes de ingreso, invitaciones aprobadas, rechazos, recuperación de contraseña, recordatorios de cuota, comprobantes y estados de pago, además de renovaciones aceptadas o rechazadas. Los envíos originados por webhooks usan claves de idempotencia para evitar duplicados.

La confirmación inicial de correo al crear una junta pertenece a Supabase Auth. Su plantilla versionada está en `../backend/supabase/templates/confirmation.html`; debe mantenerse sincronizada con la plantilla **Confirm signup** del proyecto alojado en Supabase. Las plantillas locales de invitación y recuperación sirven como respaldo, aunque la aplicación genera esos enlaces seguros con Supabase y entrega los correos por Resend.

## Cobro de cuotas con la cuenta de cada junta

Presidencia conecta la cuenta Mercado Pago de la junta desde Tesorería usando OAuth con PKCE. Los tokens quedan cifrados en `mercadopago_junta_accounts` y no son accesibles para clientes autenticados. Presidencia o Tesorería definen el monto mensual por domicilio. Todos los socios que comparten una dirección usan la misma cuota mensual: un pago deja al día al hogar completo y crea un único ingreso auditable en el libro de caja. Pagos manuales, reembolsos, rechazos y webhooks de Mercado Pago conservan la misma asociación al domicilio.

Las direcciones se normalizan dentro de PostgreSQL antes de asignar el domicilio. Se ignoran mayúsculas, tildes, puntuación, espacios, símbolos de número y variantes habituales como `Avenida`/`Av.`, `Pasaje`/`Pje.`, `Departamento`/`Dpto.` o `Camino`/`Cno.`. Una restricción única evita duplicados aun bajo solicitudes concurrentes y un trigger impide asociar manualmente un socio a un domicilio incompatible con su dirección.

## Propuestas de votación

Los socios pueden enviar propuestas con contexto y alternativas. La propuesta permanece pendiente y solo se convierte en una votación activa cuando la directiva la aprueba. Los rechazos exigen un motivo y tanto la revisión como la votación resultante quedan vinculadas para auditoría.

En la aplicación de Mercado Pago registra exactamente esta URL de redirección:

```text
https://tu-dominio/api/mercadopago/connect/callback
```

Configura también el webhook `https://tu-dominio/api/webhooks/mercadopago` con eventos de pagos. Para recibir webhooks y retorno automático, `NEXT_PUBLIC_APP_URL` debe ser una URL pública HTTPS.

## Webhook de pagos

Acepta `POST /api/webhooks/payment` con JSON:

```json
{
  "eventId": "payment_123",
  "juntaId": "00000000-0000-0000-0000-000000000000",
  "description": "Cuota social julio",
  "amount": 5000,
  "date": "2026-07-16"
}
```

La cabecera `x-juntapp-signature` debe contener el HMAC SHA-256 hexadecimal del cuerpo exacto. `eventId` hace el procesamiento idempotente.

## Producción

En Vercel configura `juntapp-next` como **Root Directory**, carga las variables anteriores y usa el comando de build predeterminado (`npm run build`). Antes del deploy aplica la migración multi-tenant en Supabase.

En Supabase Auth agrega `https://tu-dominio/aceptar-invitacion` a las URLs de redirección permitidas para que los socios invitados puedan crear su contraseña.

Comprobaciones locales:

```bash
npm run lint
npm run build
```
