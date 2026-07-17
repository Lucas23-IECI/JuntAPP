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

Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` con el prefijo `NEXT_PUBLIC_`.

Las juntas nuevas permanecen pendientes hasta que Mercado Pago autoriza la suscripción. El servidor fija y verifica $15.000 CLP mensuales, IVA incluido. Los webhooks de `subscription_preapproval` y `subscription_authorized_payment` sincronizan renovaciones, rechazos y cancelaciones.

En Mercado Pago configura `/api/webhooks/mercadopago` y activa los eventos de planes y suscripciones. La suscripción puede cancelarse desde Registro de Socios por quien creó la junta.

## Registro autónomo por código

Cada junta tiene un `invite_code` único de seis caracteres. La directiva puede copiar desde Registro de Socios un enlace como `https://tu-dominio/registro?codigo=ABC123`; el vecino completa su registro y el trigger de Supabase lo asocia únicamente a esa junta. No requiere invitaciones masivas por correo.

## Cobro de cuotas con la cuenta de cada junta

Presidencia conecta la cuenta Mercado Pago de la junta desde Tesorería usando OAuth con PKCE. Los tokens quedan cifrados en `mercadopago_junta_accounts` y no son accesibles para clientes autenticados. Presidencia o Tesorería definen el monto mensual; cada vecino recibe una preferencia individual y el pago aprobado crea automáticamente el ingreso en el libro de caja.

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
