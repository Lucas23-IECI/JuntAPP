import 'server-only';

type RegistrationLetter = {
  secretaryEmail: string;
  boardEmails: string[];
  juntaName: string;
  applicantName: string;
  applicantRut: string;
  applicantAddress: string;
  applicantPhone: string;
  applicantEmail: string;
  applicationId: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]!);
}

export async function sendRegistrationLetter(letter: RegistrationLetter) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REGISTRATION_EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (!apiKey || !from) return { delivered: false, reason: 'not_configured' as const };

  const cc = [...new Set(letter.boardEmails.map((email) => email.toLowerCase()))]
    .filter((email) => email !== letter.secretaryEmail.toLowerCase());
  const reviewUrl = appUrl ? `${appUrl}/socios?solicitud=${letter.applicationId}` : undefined;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [letter.secretaryEmail],
      ...(cc.length ? { cc } : {}),
      subject: `Solicitud de ingreso — ${letter.juntaName}`,
      html: `<h2>Solicitud de ingreso como socio</h2>
        <p>Secretaría debe revisar y aceptar esta solicitud antes de que la persona pueda ingresar a JuntAPP.</p>
        <table cellpadding="6" style="border-collapse:collapse">
          <tr><th align="left">Nombre</th><td>${escapeHtml(letter.applicantName)}</td></tr>
          <tr><th align="left">RUT</th><td>${escapeHtml(letter.applicantRut)}</td></tr>
          <tr><th align="left">Dirección</th><td>${escapeHtml(letter.applicantAddress)}</td></tr>
          <tr><th align="left">Teléfono</th><td>${escapeHtml(letter.applicantPhone)}</td></tr>
          <tr><th align="left">Correo</th><td>${escapeHtml(letter.applicantEmail)}</td></tr>
        </table>
        ${reviewUrl ? `<p><a href="${escapeHtml(reviewUrl)}">Revisar solicitud en JuntAPP</a></p>` : ''}
        <p>La directiva fue incluida en copia para mantener trazabilidad.</p>`,
    }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`El proveedor de correo rechazó la carta (HTTP ${response.status}).`);
  return { delivered: true as const };
}
