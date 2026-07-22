const PRIMARY = '#071b34';
const ACCENT = '#f97316';
const BACKGROUND = '#f5efe4';
const TEXT = '#142238';
const MUTED = '#596678';

export type EmailTemplate = { subject: string; html: string };

export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]!);
}

function layout(title: string, content: string, preview = title) {
  return `<!doctype html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:${BACKGROUND};font-family:Arial,Helvetica,sans-serif;color:${TEXT}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BACKGROUND};padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #d9cbb6;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(7,27,52,.10)">
      <tr><td style="background:${PRIMARY};padding:20px 28px;border-bottom:5px solid ${ACCENT};color:#ffffff;font-size:20px;font-weight:800">Junt<span style="color:${ACCENT}">APP</span></td></tr>
      <tr><td style="padding:30px 28px"><h1 style="margin:0 0 18px;font-size:25px;line-height:1.25;color:${PRIMARY}">${escapeHtml(title)}</h1>${content}</td></tr>
      <tr><td style="padding:18px 28px;background:#fffaf0;color:${MUTED};font-size:12px;line-height:1.5;border-top:1px solid #eadfce">Este es un correo transaccional de JuntAPP. Si no reconoces esta actividad, puedes ignorarlo.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function paragraph(text: string) {
  return `<p style="margin:0 0 18px;font-size:15px;line-height:1.65">${escapeHtml(text)}</p>`;
}

function button(label: string, url: string) {
  return `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:13px 20px;border:2px solid ${PRIMARY};border-radius:6px;box-shadow:3px 3px 0 ${PRIMARY};font-size:15px;font-weight:800">${escapeHtml(label)}</a></p>`;
}

function detailRows(rows: Array<[string, string | number]>) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#fffaf0;border:1px solid #eadfce;border-radius:10px">${rows.map(([label, value]) => `<tr><th align="left" style="padding:10px 14px;border-bottom:1px solid #eadfce;font-size:13px;color:${MUTED}">${escapeHtml(label)}</th><td style="padding:10px 14px;border-bottom:1px solid #eadfce;font-size:14px;color:${TEXT}">${escapeHtml(value)}</td></tr>`).join('')}</table>`;
}

export function registrationRequestTemplate(input: {
  juntaName: string; applicantName: string; applicantRut: string; applicantAddress: string;
  applicantPhone: string; applicantEmail: string; reviewUrl?: string;
}): EmailTemplate {
  const title = `Solicitud de ingreso — ${input.juntaName}`;
  const content = paragraph('Secretaría debe revisar y resolver esta solicitud antes de que la persona pueda ingresar a JuntAPP.')
    + detailRows([
      ['Nombre', input.applicantName], ['RUT', input.applicantRut], ['Dirección', input.applicantAddress],
      ['Teléfono', input.applicantPhone], ['Correo', input.applicantEmail],
    ])
    + (input.reviewUrl ? button('Revisar solicitud', input.reviewUrl) : '')
    + paragraph('La directiva recibió una copia para mantener la trazabilidad del proceso.');
  return { subject: title, html: layout('Nueva solicitud de ingreso', content, title) };
}

export function signupConfirmationTemplate(input: { name: string; actionUrl: string }): EmailTemplate {
  const content = paragraph(`Hola ${input.name}, confirma tu correo para completar el registro de tu junta vecinal.`)
    + button('Confirmar correo', input.actionUrl)
    + paragraph('Por seguridad, el enlace es personal y tiene una duración limitada.');
  return { subject: 'Confirma tu correo en JuntAPP', html: layout('Confirma tu correo', content) };
}

export function membershipInviteTemplate(input: { name: string; juntaName: string; actionUrl: string }): EmailTemplate {
  const content = paragraph(`Hola ${input.name}, tu ingreso a ${input.juntaName} fue aprobado.`)
    + paragraph('Crea una contraseña para activar tu cuenta y comenzar a usar JuntAPP.')
    + button('Activar mi cuenta', input.actionUrl)
    + paragraph('Por seguridad, este enlace es personal y tiene una duración limitada.');
  return { subject: `Tu ingreso a ${input.juntaName} fue aprobado`, html: layout('Activa tu cuenta', content) };
}

export function membershipRejectedTemplate(input: { name: string; juntaName: string; reason: string }): EmailTemplate {
  const content = paragraph(`Hola ${input.name}, Secretaría revisó tu solicitud de ingreso a ${input.juntaName}.`)
    + detailRows([['Resultado', 'Solicitud rechazada'], ['Motivo', input.reason]])
    + paragraph('Si necesitas aclarar la decisión o corregir antecedentes, comunícate directamente con la junta vecinal.');
  return { subject: `Resultado de tu solicitud — ${input.juntaName}`, html: layout('Resultado de tu solicitud', content) };
}

export function passwordRecoveryTemplate(input: { name?: string; actionUrl: string }): EmailTemplate {
  const greeting = input.name ? `Hola ${input.name}, recibimos una solicitud para cambiar tu contraseña.` : 'Recibimos una solicitud para cambiar tu contraseña.';
  const content = paragraph(greeting) + button('Crear nueva contraseña', input.actionUrl)
    + paragraph('Si no solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá funcionando.');
  return { subject: 'Recupera tu acceso a JuntAPP', html: layout('Restablece tu contraseña', content) };
}

export function dueReminderTemplate(input: { name: string; juntaName: string; period: string; amount: number; actionUrl: string }): EmailTemplate {
  const content = paragraph(`Hola ${input.name}, la cuota de tu domicilio en ${input.juntaName} continúa pendiente.`)
    + detailRows([['Período', input.period], ['Monto', formatClp(input.amount)]])
    + button('Revisar y pagar cuota', input.actionUrl);
  return { subject: `Recordatorio de cuota — ${input.juntaName}`, html: layout('Tu cuota está pendiente', content) };
}

export function duePaymentTemplate(input: {
  name: string; juntaName: string; period: string; amount: number; status: 'approved' | 'rejected' | 'refunded';
  paymentId?: string | null; actionUrl: string;
}): EmailTemplate {
  const copy = {
    approved: { title: 'Pago de cuota confirmado', subject: 'Comprobante de pago de cuota', text: 'Tu pago fue confirmado y el domicilio quedó al día.' },
    rejected: { title: 'No pudimos confirmar tu pago', subject: 'Pago de cuota rechazado', text: 'Mercado Pago rechazó el cobro. Puedes intentarlo nuevamente desde Tesorería.' },
    refunded: { title: 'Pago de cuota reembolsado', subject: 'Reembolso de cuota confirmado', text: 'Mercado Pago informó el reembolso y la cuota volvió a quedar pendiente.' },
  }[input.status];
  const rows: Array<[string, string | number]> = [['Junta', input.juntaName], ['Período', input.period], ['Monto', formatClp(input.amount)]];
  if (input.paymentId) rows.push(['Referencia', input.paymentId]);
  const content = paragraph(`Hola ${input.name}, ${copy.text}`) + detailRows(rows) + button('Ver Tesorería', input.actionUrl);
  return { subject: `${copy.subject} — ${input.juntaName}`, html: layout(copy.title, content) };
}

export function subscriptionPaymentTemplate(input: {
  name: string; juntaName: string; amount: number; status: 'approved' | 'rejected'; nextPaymentDate?: string | null; actionUrl: string;
}): EmailTemplate {
  const approved = input.status === 'approved';
  const title = approved ? 'Renovación confirmada' : 'Problema con la renovación';
  const rows: Array<[string, string | number]> = [['Junta', input.juntaName], ['Monto', formatClp(input.amount)], ['Estado', approved ? 'Pagado' : 'Pago rechazado']];
  if (approved && input.nextPaymentDate) rows.push(['Próximo cobro', input.nextPaymentDate]);
  const content = paragraph(`Hola ${input.name}, ${approved ? 'Mercado Pago confirmó la renovación mensual de JuntAPP.' : 'Mercado Pago no pudo completar el cobro mensual de JuntAPP. Revisa tu medio de pago para evitar la suspensión del servicio.'}`)
    + detailRows(rows) + button(approved ? 'Ir a JuntAPP' : 'Revisar suscripción', input.actionUrl);
  return { subject: `${title} — ${input.juntaName}`, html: layout(title, content) };
}

export function formatClp(amount: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
}
